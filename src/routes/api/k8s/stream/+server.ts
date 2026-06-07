import type { RequestHandler } from './$types.js';
import { getCoreV1Api, getCustomObjectsApi, getKubeConfig } from '$lib/server/k8sClient.js';
import { nodeFromK8s, podFromK8s } from '$lib/server/k8sHelpers.js';
import { parseCpu, parseMemory } from '$lib/utils.js';
import type { SSEEvent, NodeMetricsPayload, PodMetricsPayload } from '$lib/types.js';
import * as k8s from '@kubernetes/client-node';

const METRICS_POLL_MS = 10_000;
const HEARTBEAT_MS    = 20_000;

function sseMessage(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export const GET: RequestHandler = ({ request }) => {
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (event: SSEEvent) => {
        if (!closed) {
          try { controller.enqueue(enc.encode(sseMessage(event))); } catch { /* closed */ }
        }
      };

      // ── Heartbeat ──────────────────────────────────────────────────────────
      const heartbeatTimer = setInterval(
        () => send({ type: 'HEARTBEAT' }),
        HEARTBEAT_MS
      );

      // ── Informers (list + watch + auto-reconnect) ──────────────────────────
      // makeInformer handles: initial list as ADD events, watch stream,
      // and automatic reconnection when the watch expires — no manual retry needed.
      const kc = getKubeConfig();
      const coreApi = getCoreV1Api();

      // Node informer
      console.log('[stream] Starting node informer...');
      const nodeInformer = k8s.makeInformer<k8s.V1Node>(
        kc,
        '/api/v1/nodes',
        () => coreApi.listNode()
      );

      nodeInformer.on('add', (obj) => {
        if (closed) return;
        console.log('[stream] Node ADDED:', obj.metadata?.name);
        send({ type: 'ADD_NODE', data: nodeFromK8s(obj) });
      });
      nodeInformer.on('update', (obj) => {
        if (closed) return;
        send({ type: 'UPDATE_NODE', data: nodeFromK8s(obj) });
      });
      nodeInformer.on('delete', (obj) => {
        if (closed) return;
        console.log('[stream] Node DELETED:', obj.metadata?.name);
        send({ type: 'DELETE_NODE', data: { name: obj.metadata?.name ?? '' } });
      });
      nodeInformer.on('error', (err: any) => {
        if (!closed) console.error('[stream] Node informer error:', err?.message ?? err);
      });
      nodeInformer.start();

      // Pod informer
      console.log('[stream] Starting pod informer...');
      const podInformer = k8s.makeInformer<k8s.V1Pod>(
        kc,
        '/api/v1/pods',
        () => coreApi.listPodForAllNamespaces()
      );

      podInformer.on('add', (obj) => {
        if (closed) return;
        console.log('[stream] Pod ADDED:', obj.metadata?.namespace, obj.metadata?.name);
        const pod = podFromK8s(obj);
        if (pod) send({ type: 'ADD_POD', data: pod });
      });
      podInformer.on('update', (obj) => {
        if (closed) return;
        const pod = podFromK8s(obj);
        if (pod) send({ type: 'UPDATE_POD', data: pod });
      });
      podInformer.on('delete', (obj) => {
        if (closed) return;
        console.log('[stream] Pod DELETED:', obj.metadata?.namespace, obj.metadata?.name);
        const pod = podFromK8s(obj);
        if (pod) send({ type: 'DELETE_POD', data: { name: pod.name } });
      });
      podInformer.on('error', (err: any) => {
        if (!closed) console.error('[stream] Pod informer error:', err?.message ?? err);
      });
      podInformer.start();

      // ── Metrics polling ────────────────────────────────────────────────────
      const customApi = getCustomObjectsApi();
      let metricsAvailable = true;
      let consecutiveFailures = 0;

      const pollMetrics = async () => {
        if (closed) return;
        try {
          const [nodeMetrics, podMetrics] = await Promise.all([
            customApi.listClusterCustomObject({ group: 'metrics.k8s.io', version: 'v1beta1', plural: 'nodes' }),
            customApi.listClusterCustomObject({ group: 'metrics.k8s.io', version: 'v1beta1', plural: 'pods' }),
          ]);

          consecutiveFailures = 0;
          if (!metricsAvailable) metricsAvailable = true;

          // Node metrics
          const nodeItems = (nodeMetrics as { items: unknown[] }).items ?? [];
          const nodePayloads: NodeMetricsPayload[] = nodeItems.map((item) => {
            const m = item as { metadata: { name: string }; usage: { cpu: string; memory: string } };
            return {
              name: m.metadata.name,
              cpuMillicores: parseCpu(m.usage.cpu),
              memoryBytes: parseMemory(m.usage.memory),
            };
          });
          send({ type: 'NODE_METRICS', data: nodePayloads });

          // Pod metrics
          const podItems = (podMetrics as { items: unknown[] }).items ?? [];
          const podPayloads: PodMetricsPayload[] = podItems.flatMap((item) => {
            const m = item as {
              metadata: { name: string; namespace: string };
              containers: { usage: { cpu: string; memory: string } }[];
            };
            let cpu = 0, mem = 0;
            for (const c of m.containers) {
              cpu += parseCpu(c.usage.cpu);
              mem += parseMemory(c.usage.memory);
            }
            return [{ name: m.metadata.name, namespace: m.metadata.namespace, cpuMillicores: cpu, memoryBytes: mem }];
          });
          send({ type: 'POD_METRICS', data: podPayloads });
        } catch (err) {
          consecutiveFailures++;
          console.warn('[stream] Metrics poll failed:', err);
          if (consecutiveFailures >= 2 && metricsAvailable) {
            metricsAvailable = false;
            send({ type: 'METRICS_UNAVAILABLE' });
          }
        }
      };

      pollMetrics();
      const metricsTimer = setInterval(pollMetrics, METRICS_POLL_MS);

      // ── Cleanup on disconnect ──────────────────────────────────────────────
      request.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(heartbeatTimer);
        clearInterval(metricsTimer);
        nodeInformer.stop();
        podInformer.stop();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
};
