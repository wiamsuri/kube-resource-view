import type * as k8s from '@kubernetes/client-node';
import type { NodeInfo, PodInfo, ContainerStatus, PodPhase, NodeCapacity } from '../types.js';
import { parseCpu, parseMemory } from '../utils.js';

// ─── Node ───────────────────────────────────────────────────────────────────

export function nodeFromK8s(node: k8s.V1Node): NodeInfo {
  const meta = node.metadata!;
  const spec = node.spec!;
  const status = node.status!;

  // Roles (node-role.kubernetes.io/<role>: "")
  const labels = meta.labels ?? {};
  const roles = Object.keys(labels)
    .filter((k) => k.startsWith('node-role.kubernetes.io/'))
    .map((k) => k.replace('node-role.kubernetes.io/', ''))
    .filter((r) => r !== '');
  if (roles.length === 0) roles.push('worker');

  const instanceType =
    labels['beta.kubernetes.io/instance-type'] ??
    labels['node.kubernetes.io/instance-type'] ??
    '';

  const zone =
    labels['topology.kubernetes.io/zone'] ??
    labels['failure-domain.beta.kubernetes.io/zone'] ??
    '';
  const region =
    labels['topology.kubernetes.io/region'] ??
    labels['failure-domain.beta.kubernetes.io/region'] ??
    '';
  const providerZone = [region, zone].filter(Boolean).join('/') || 'local';

  const cap = status.capacity ?? {};
  const alloc = status.allocatable ?? {};

  const capacity: NodeCapacity = {
    cpuMillicores: parseCpu(cap.cpu),
    memoryBytes: parseMemory(cap.memory),
  };
  const allocatable: NodeCapacity = {
    cpuMillicores: parseCpu(alloc.cpu),
    memoryBytes: parseMemory(alloc.memory),
  };

  const readyCondition = status.conditions?.find((c) => c.type === 'Ready');
  const ready = readyCondition?.status === 'True';

  const taints = (spec.taints ?? []).map((t) => ({
    key: t.key,
    value: t.value,
    effect: t.effect,
  }));

  return {
    name: meta.name!,
    roles,
    instanceType,
    providerZone,
    capacity,
    allocatable,
    requestedCpu: 0,
    requestedMemory: 0,
    limitCpu: 0,
    limitMemory: 0,
    usageCpu: 0,
    usageMemory: 0,
    ready,
    podCidr: spec.podCIDR,
    createdAt: meta.creationTimestamp ? new Date(meta.creationTimestamp).toISOString() : new Date().toISOString(),
    taints,
  };
}

// ─── Pod ────────────────────────────────────────────────────────────────────

export function podFromK8s(pod: k8s.V1Pod): PodInfo | null {
  const meta = pod.metadata!;
  const spec = pod.spec!;
  const status = pod.status!;

  const nodeName = spec.nodeName ?? '';

  // Determine phase — mark as Terminating if deletionTimestamp is set
  let phase: PodPhase = (status.phase as PodPhase) ?? 'Unknown';
  if (meta.deletionTimestamp) phase = 'Terminating';

  // Readiness
  const readyCondition = status.conditions?.find((c) => c.type === 'Ready');
  const ready = readyCondition?.status === 'True' && phase === 'Running';

  // Owner reference — resolve top-level controller kind
  const ownerRefs = meta.ownerReferences ?? [];
  const directOwner = ownerRefs[0];
  let ownerKind = directOwner?.kind ?? '';
  let ownerName = directOwner?.name ?? '';
  // Normalise ReplicaSet → Deployment (strip hash suffix)
  if (ownerKind === 'ReplicaSet') {
    ownerKind = 'Deployment';
    ownerName = ownerName.replace(/-[a-z0-9]+$/, '');
  }

  // Container resource totals
  let requestCpu = 0, requestMemory = 0, limitCpu = 0, limitMemory = 0;
  for (const c of spec.containers ?? []) {
    requestCpu    += parseCpu(c.resources?.requests?.['cpu']);
    requestMemory += parseMemory(c.resources?.requests?.['memory']);
    limitCpu      += parseCpu(c.resources?.limits?.['cpu']);
    limitMemory   += parseMemory(c.resources?.limits?.['memory']);
  }

  // Container statuses
  const containerStatuses: ContainerStatus[] = (status.containerStatuses ?? []).map((cs) => {
    let state = 'unknown';
    let reason: string | undefined;
    if (cs.state?.running) state = 'running';
    else if (cs.state?.waiting) {
      state = 'waiting';
      reason = cs.state.waiting.reason ?? undefined;
    } else if (cs.state?.terminated) {
      state = 'terminated';
      reason = cs.state.terminated.reason ?? undefined;
    }
    return {
      name: cs.name,
      ready: cs.ready,
      restartCount: cs.restartCount,
      state,
      reason,
    };
  });

  return {
    uid: meta.uid!,
    name: meta.name!,
    namespace: meta.namespace!,
    nodeName,
    phase,
    ready,
    ownerKind,
    ownerName,
    requestCpu,
    requestMemory,
    limitCpu,
    limitMemory,
    usageCpu: 0,
    usageMemory: 0,
    containerStatuses,
    labels: (meta.labels as Record<string, string>) ?? {},
    createdAt: meta.creationTimestamp ? new Date(meta.creationTimestamp).toISOString() : new Date().toISOString(),
  };
}
