import type { PodInfo, PodPhase } from './types.js';

// ─── Resource formatting ────────────────────────────────────────────────────

/** Convert millicores to a human-readable string (e.g. 1500m → "1.50" cores) */
export function formatCpu(millicores: number): string {
  if (millicores === 0) return '0m';
  if (millicores < 1000) return `${Math.round(millicores)}m`;
  return `${(millicores / 1000).toFixed(2)}`;
}

/** Convert bytes to a human-readable string */
export function formatMemory(bytes: number): string {
  if (bytes === 0) return '0';
  const gi = bytes / (1024 ** 3);
  if (gi >= 1) return `${gi.toFixed(1)}Gi`;
  const mi = bytes / (1024 ** 2);
  if (mi >= 1) return `${mi.toFixed(0)}Mi`;
  const ki = bytes / 1024;
  return `${ki.toFixed(0)}Ki`;
}

/** Parse Kubernetes CPU string to millicores */
export function parseCpu(cpuStr: string | undefined): number {
  if (!cpuStr) return 0;
  if (cpuStr.endsWith('m')) return parseInt(cpuStr.slice(0, -1), 10);
  if (cpuStr.endsWith('n')) return parseInt(cpuStr.slice(0, -1), 10) / 1_000_000;
  return parseFloat(cpuStr) * 1000;
}

/** Parse Kubernetes memory string to bytes */
export function parseMemory(memStr: string | undefined): number {
  if (!memStr) return 0;
  const units: Record<string, number> = {
    Ki: 1024,
    Mi: 1024 ** 2,
    Gi: 1024 ** 3,
    Ti: 1024 ** 4,
    K: 1000,
    M: 1000 ** 2,
    G: 1000 ** 3,
    T: 1000 ** 4,
  };
  for (const [suffix, factor] of Object.entries(units)) {
    if (memStr.endsWith(suffix)) {
      return parseFloat(memStr.slice(0, -suffix.length)) * factor;
    }
  }
  return parseInt(memStr, 10);
}

// ─── Age formatting ─────────────────────────────────────────────────────────

export function formatAge(isoTimestamp: string): string {
  const diff = Date.now() - new Date(isoTimestamp).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

// ─── Pod color ──────────────────────────────────────────────────────────────

/** Returns a CSS color class for a pod based on phase/ready state */
export function getPodColorClass(pod: PodInfo): string {
  const { phase, ready, containerStatuses } = pod;
  const hasCrash = containerStatuses.some(
    (c) => c.reason === 'CrashLoopBackOff' || c.reason === 'Error' || c.reason === 'OOMKilled'
  );
  if (hasCrash || phase === 'Failed') return 'pod-error';
  if (phase === 'Succeeded') return 'pod-succeeded';
  if (phase === 'Pending') return 'pod-pending';
  if (phase === 'Terminating') return 'pod-terminating';
  if (phase === 'Running' && ready) return 'pod-running';
  if (phase === 'Running' && !ready) return 'pod-initializing';
  return 'pod-unknown';
}

/** Map phase to hex colour (for inline styles where needed) */
export const POD_COLORS: Record<string, string> = {
  'pod-running':      '#10b981', // emerald-500
  'pod-initializing': '#06b6d4', // cyan-500
  'pod-pending':      '#f59e0b', // amber-500
  'pod-terminating':  '#f59e0b', // amber-500
  'pod-error':        '#f43f5e', // rose-500
  'pod-succeeded':    '#64748b', // slate-500
  'pod-unknown':      '#6b7280', // gray-500
};

// ─── Pod sizing metric ───────────────────────────────────────────────────────

import type { SizingMetric } from './types.js';

const BASE_SIZE = 16;  // px
const MAX_SIZE  = 48;  // px
const MIN_SIZE  = 10;  // px

export function getPodSize(pod: PodInfo, metric: SizingMetric, nodeCapacity: number): number {
  if (metric === 'uniform' || nodeCapacity === 0) return BASE_SIZE;
  let value = 0;
  switch (metric) {
    case 'cpuRequest':  value = pod.requestCpu;    break;
    case 'cpuLimit':    value = pod.limitCpu;      break;
    case 'cpuUsage':    value = pod.usageCpu;      break;
    case 'memRequest':  value = pod.requestMemory; break;
    case 'memLimit':    value = pod.limitMemory;   break;
    case 'memUsage':    value = pod.usageMemory;   break;
  }
  const ratio = Math.min(value / nodeCapacity, 1);
  return Math.max(MIN_SIZE, Math.round(MIN_SIZE + ratio * (MAX_SIZE - MIN_SIZE)));
}

// ─── Controller key (for click-to-highlight) ────────────────────────────────

export function getControllerKey(pod: PodInfo): string {
  if (pod.ownerKind && pod.ownerName) return `${pod.ownerKind}/${pod.ownerName}`;
  return `ns/${pod.namespace}`;
}
