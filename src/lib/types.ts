// ─── Node ──────────────────────────────────────────────────────────────────

export interface NodeCapacity {
  cpuMillicores: number; // allocatable CPU in millicores
  memoryBytes: number; // allocatable memory in bytes
}

export interface TaintInfo {
  key: string;
  value?: string;
  effect: string;
}

export interface NodeInfo {
  name: string;
  roles: string[];
  instanceType: string;
  providerZone: string;
  capacity: NodeCapacity;      // total capacity
  allocatable: NodeCapacity;   // allocatable (what pods can use)
  // Aggregate of all pod requests/limits on this node
  requestedCpu: number;
  requestedMemory: number;
  limitCpu: number;
  limitMemory: number;
  // Actual live usage (from Metrics Server)
  usageCpu: number;
  usageMemory: number;
  ready: boolean;
  podCidr?: string;
  createdAt: string;
  taints?: TaintInfo[];
}

// ─── Pod ───────────────────────────────────────────────────────────────────

export type PodPhase = 'Running' | 'Pending' | 'Succeeded' | 'Failed' | 'Unknown' | 'Terminating';

export interface ContainerStatus {
  name: string;
  ready: boolean;
  restartCount: number;
  state: string; // 'running' | 'waiting' | 'terminated'
  reason?: string;
}

export interface PodInfo {
  uid: string;
  name: string;
  namespace: string;
  nodeName: string;
  phase: PodPhase;
  ready: boolean;
  // Owner reference (Deployment, StatefulSet, DaemonSet, Job, etc.)
  ownerKind: string;
  ownerName: string;
  // Resource requests & limits (sum across all containers)
  requestCpu: number;   // millicores
  requestMemory: number; // bytes
  limitCpu: number;
  limitMemory: number;
  // Actual live usage (from Metrics Server)
  usageCpu: number;
  usageMemory: number;
  containerStatuses: ContainerStatus[];
  createdAt: string;
  labels: Record<string, string>;
}

// ─── SSE Events ────────────────────────────────────────────────────────────

export type SSEEventType =
  | 'ADD_NODE' | 'UPDATE_NODE' | 'DELETE_NODE'
  | 'ADD_POD'  | 'UPDATE_POD'  | 'DELETE_POD'
  | 'NODE_METRICS' | 'POD_METRICS'
  | 'METRICS_UNAVAILABLE'
  | 'HEARTBEAT';

export interface SSEEvent {
  type: SSEEventType;
  data?: NodeInfo | PodInfo | NodeMetricsPayload[] | PodMetricsPayload[] | { name: string } | null;
}

export interface NodeMetricsPayload {
  name: string;
  cpuMillicores: number;
  memoryBytes: number;
}

export interface PodMetricsPayload {
  name: string;
  namespace: string;
  cpuMillicores: number;
  memoryBytes: number;
}

// ─── Initial page.data shape ───────────────────────────────────────────────

export interface InitialData {
  nodes: NodeInfo[];
  pods: PodInfo[];
}

// ─── View / Filter State ───────────────────────────────────────────────────

export type SizingMetric =
  | 'uniform'
  | 'cpuRequest' | 'cpuLimit' | 'cpuUsage'
  | 'memRequest' | 'memLimit' | 'memUsage';

export type ViewMode = 'default' | 'detail';

export type NodeSortOrder = 'name' | 'age-oldest' | 'age-newest';

