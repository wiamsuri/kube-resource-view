import type { PageServerLoad } from './$types.js';
import { getCoreV1Api, getCustomObjectsApi } from '$lib/server/k8sClient.js';
import { nodeFromK8s, podFromK8s } from '$lib/server/k8sHelpers.js';
import { parseCpu, parseMemory } from '$lib/utils.js';
import type { InitialData, NodeMetricsPayload, PodMetricsPayload } from '$lib/types.js';

export const load: PageServerLoad = async () => {
  const coreApi = getCoreV1Api();
  const customApi = getCustomObjectsApi();

  // Fetch nodes, pods, and metrics concurrently
  const [nodesRes, podsRes, nodeMetrics, podMetrics] = await Promise.allSettled([
    coreApi.listNode(),
    coreApi.listPodForAllNamespaces(),
    customApi.listClusterCustomObject({ group: 'metrics.k8s.io', version: 'v1beta1', plural: 'nodes' }),
    customApi.listClusterCustomObject({ group: 'metrics.k8s.io', version: 'v1beta1', plural: 'pods' }),
  ]);

  // Build node map
  const nodes = nodesRes.status === 'fulfilled'
    ? nodesRes.value.items.map(nodeFromK8s)
    : [];

  const pods: import('$lib/types.js').PodInfo[] = podsRes.status === 'fulfilled'
    ? podsRes.value.items.map(podFromK8s).filter((p): p is import('$lib/types.js').PodInfo => p !== null)
    : [];

  // Merge metrics into nodes
  if (nodeMetrics.status === 'fulfilled') {
    const items = (nodeMetrics.value as { items: unknown[] }).items ?? [];
    const metricMap = new Map<string, NodeMetricsPayload>();
    for (const item of items) {
      const m = item as { metadata: { name: string }; usage: { cpu: string; memory: string } };
      metricMap.set(m.metadata.name, {
        name: m.metadata.name,
        cpuMillicores: parseCpu(m.usage.cpu),
        memoryBytes: parseMemory(m.usage.memory),
      });
    }
    for (const node of nodes) {
      const m = metricMap.get(node.name);
      if (m) {
        node.usageCpu = m.cpuMillicores;
        node.usageMemory = m.memoryBytes;
      }
    }
  }

  // Merge metrics into pods
  if (podMetrics.status === 'fulfilled') {
    const items = (podMetrics.value as { items: unknown[] }).items ?? [];
    const metricMap = new Map<string, PodMetricsPayload>();
    for (const item of items) {
      const m = item as {
        metadata: { name: string; namespace: string };
        containers: { usage: { cpu: string; memory: string } }[];
      };
      let cpu = 0, mem = 0;
      for (const c of m.containers) {
        cpu += parseCpu(c.usage.cpu);
        mem += parseMemory(c.usage.memory);
      }
      metricMap.set(`${m.metadata.namespace}/${m.metadata.name}`, {
        name: m.metadata.name,
        namespace: m.metadata.namespace,
        cpuMillicores: cpu,
        memoryBytes: mem,
      });
    }
    for (const pod of pods) {
      const m = metricMap.get(`${pod!.namespace}/${pod!.name}`);
      if (m) {
        pod!.usageCpu = m.cpuMillicores;
        pod!.usageMemory = m.memoryBytes;
      }
    }
  }

  // Compute per-node request/limit aggregates from pods
  const nodeAgg = new Map<string, { rc: number; rm: number; lc: number; lm: number }>();
  for (const pod of pods) {
    if (!pod || !pod.nodeName) continue;
    const agg = nodeAgg.get(pod.nodeName) ?? { rc: 0, rm: 0, lc: 0, lm: 0 };
    agg.rc += pod.requestCpu;
    agg.rm += pod.requestMemory;
    agg.lc += pod.limitCpu;
    agg.lm += pod.limitMemory;
    nodeAgg.set(pod.nodeName, agg);
  }
  for (const node of nodes) {
    const agg = nodeAgg.get(node.name);
    if (agg) {
      node.requestedCpu = agg.rc;
      node.requestedMemory = agg.rm;
      node.limitCpu = agg.lc;
      node.limitMemory = agg.lm;
    }
  }

  return { nodes, pods } satisfies InitialData;
};
