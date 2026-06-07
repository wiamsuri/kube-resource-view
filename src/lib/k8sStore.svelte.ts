import type {
  NodeInfo, PodInfo, SSEEvent, SSEEventType,
  NodeMetricsPayload, PodMetricsPayload, InitialData
} from './types.js';
import { SvelteMap } from 'svelte/reactivity';

// ─── State ──────────────────────────────────────────────────────────────────

export const nodes = new SvelteMap<string, NodeInfo>();
export const pods = new SvelteMap<string, PodInfo>();  // keyed by uid

export const metrics = $state({ available: true });

// ─── Derived: pods grouped by node ─────────────────────────────────────────

export function getPodsByNode() {
  const map = new Map<string, PodInfo[]>();
  for (const pod of pods.values()) {
    const list = map.get(pod.nodeName) ?? [];
    list.push(pod);
    map.set(pod.nodeName, list);
  }
  return map;
}

// ─── Derived: all namespaces ─────────────────────────────────────────────────

export function getAllNamespaces() {
  const ns = new Set<string>();
  for (const pod of pods.values()) ns.add(pod.namespace);
  return [...ns].sort();
}

// ─── Derived: cluster totals ────────────────────────────────────────────────

export function getClusterTotals() {
  let capCpu = 0, capMem = 0;
  let reqCpu = 0, reqMem = 0;
  let limCpu = 0, limMem = 0;
  let useCpu = 0, useMem = 0;

  for (const node of nodes.values()) {
    capCpu += node.allocatable.cpuMillicores;
    capMem += node.allocatable.memoryBytes;
    reqCpu += node.requestedCpu;
    reqMem += node.requestedMemory;
    limCpu += node.limitCpu;
    limMem += node.limitMemory;
    useCpu += node.usageCpu;
    useMem += node.usageMemory;
  }

  return { capCpu, capMem, reqCpu, reqMem, limCpu, limMem, useCpu, useMem };
}

// ─── Node aggregates helper ──────────────────────────────────────────────────

function recomputeNodeAggregates(nodeName: string) {
  const node = nodes.get(nodeName);
  if (!node) return;
  let rc = 0, rm = 0, lc = 0, lm = 0;
  for (const pod of pods.values()) {
    if (pod.nodeName !== nodeName) continue;
    rc += pod.requestCpu;
    rm += pod.requestMemory;
    lc += pod.limitCpu;
    lm += pod.limitMemory;
  }
  node.requestedCpu = rc;
  node.requestedMemory = rm;
  node.limitCpu = lc;
  node.limitMemory = lm;
  nodes.set(nodeName, { ...node });
}

// ─── Initial data hydration ─────────────────────────────────────────────────

export function applyInitialData(data: InitialData) {
  nodes.clear();
  pods.clear();

  for (const node of data.nodes) nodes.set(node.name, node);
  for (const pod of data.pods) pods.set(pod.uid, pod);
}

// ─── SSE event application ──────────────────────────────────────────────────

export function applySSEEvent(event: SSEEvent) {
  switch (event.type) {
    // ── Nodes ──────────────────────────────────────────────────────────────
    case 'ADD_NODE':
    case 'UPDATE_NODE': {
      const node = event.data as NodeInfo;
      const existing = nodes.get(node.name);
      // Preserve live usage metrics if the watcher fires before a metrics poll
      if (existing) {
        node.usageCpu = existing.usageCpu;
        node.usageMemory = existing.usageMemory;
      }
      nodes.set(node.name, node);
      recomputeNodeAggregates(node.name);
      break;
    }
    case 'DELETE_NODE': {
      const { name } = event.data as { name: string };
      nodes.delete(name);
      break;
    }

    // ── Pods ───────────────────────────────────────────────────────────────
    case 'ADD_POD':
    case 'UPDATE_POD': {
      const pod = event.data as PodInfo;
      const existing = pods.get(pod.uid);
      if (existing) {
        pod.usageCpu = existing.usageCpu;
        pod.usageMemory = existing.usageMemory;
      }
      const oldNodeName = existing?.nodeName;
      pods.set(pod.uid, pod);
      if (oldNodeName && oldNodeName !== pod.nodeName) recomputeNodeAggregates(oldNodeName);
      recomputeNodeAggregates(pod.nodeName);
      break;
    }
    case 'DELETE_POD': {
      const { name } = event.data as { name: string };
      // Find by name (uid might not be in the DELETE event)
      for (const [uid, pod] of pods.entries()) {
        if (pod.name === name) {
          pods.delete(uid);
          recomputeNodeAggregates(pod.nodeName);
          break;
        }
      }
      break;
    }

    // ── Metrics ────────────────────────────────────────────────────────────
    case 'NODE_METRICS': {
      const metrics = event.data as NodeMetricsPayload[];
      for (const m of metrics) {
        const node = nodes.get(m.name);
        if (node) {
          node.usageCpu = m.cpuMillicores;
          node.usageMemory = m.memoryBytes;
          nodes.set(node.name, { ...node });
        }
      }
      break;
    }
    case 'POD_METRICS': {
      const metrics = event.data as PodMetricsPayload[];
      const byKey = new Map(metrics.map((m) => [`${m.namespace}/${m.name}`, m]));
      for (const pod of pods.values()) {
        const m = byKey.get(`${pod.namespace}/${pod.name}`);
        if (m) {
          pod.usageCpu = m.cpuMillicores;
          pod.usageMemory = m.memoryBytes;
          pods.set(pod.uid, { ...pod });
        }
      }
      break;
    }
    case 'METRICS_UNAVAILABLE': {
      metrics.available = false;
      break;
    }
  }
}

class TooltipStore {
  active = $state<{ pod: PodInfo; x: number; y: number } | null>(null);

  show(pod: PodInfo, x: number, y: number) {
    this.active = { pod, x, y };
  }

  hide(podUid: string) {
    if (this.active?.pod.uid === podUid) {
      this.active = null;
    }
  }
}

export const tooltipStore = new TooltipStore();

