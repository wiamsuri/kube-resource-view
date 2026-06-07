<script lang="ts">
  import type { PodInfo } from '$lib/types.js';
  import { formatCpu, formatMemory, formatAge } from '$lib/utils.js';

  interface Props {
    pod: PodInfo;
    x: number;
    y: number;
  }
  let { pod, x, y }: Props = $props();

  // Clamp to viewport
  const tipW = 280;
  const tipH = 220;

  const left = $derived(Math.min(x + 4, window.innerWidth  - tipW - 12));
  const top  = $derived(Math.min(y + 4, window.innerHeight - tipH - 12));

  const totalRestarts = $derived(pod.containerStatuses.reduce((s, c) => s + c.restartCount, 0));

  function statusColor(phase: string, ready: boolean) {
    if (phase === 'Running' && ready)  return '#10b981';
    if (phase === 'Running')           return '#06b6d4';
    if (phase === 'Pending')           return '#f59e0b';
    if (phase === 'Failed')            return '#f43f5e';
    if (phase === 'Succeeded')         return '#64748b';
    if (phase === 'Terminating')       return '#f97316';
    return '#94a3b8';
  }
</script>

<div
  class="tooltip glass fade-in"
  style="left:{left}px; top:{top}px;"
  role="tooltip"
>
  <!-- Header -->
  <div class="tip-header">
    <div class="tip-phase-dot" style="background:{statusColor(pod.phase, pod.ready)}"></div>
    <div class="tip-name-wrap">
      <div class="tip-name" title={pod.name}>{pod.name}</div>
      <div class="tip-ns">{pod.namespace}</div>
    </div>
  </div>

  <!-- Owner & Age -->
  <div class="tip-meta">
    {#if pod.ownerKind}
      <span class="meta-badge">{pod.ownerKind}: <strong>{pod.ownerName}</strong></span>
    {/if}
    <span class="meta-badge age">{formatAge(pod.createdAt)}</span>
    {#if totalRestarts > 0}
      <span class="meta-badge warn">↻ {totalRestarts}</span>
    {/if}
  </div>

  <!-- Container statuses -->
  {#if pod.containerStatuses.length > 0}
    <div class="tip-containers">
      {#each pod.containerStatuses as cs}
        <div class="cs-row">
          <span class="cs-dot" class:cs-ready={cs.ready} class:cs-notready={!cs.ready}></span>
          <span class="cs-name">{cs.name}</span>
          <span class="cs-state">{cs.reason ?? cs.state}</span>
        </div>
      {/each}
    </div>
  {/if}

  <div class="tip-divider"></div>

  <!-- Resource matrix -->
  <div class="resource-matrix">
    <div class="rm-header">
      <span></span>
      <span class="rm-col use">Usage</span>
      <span class="rm-col req">Request</span>
      <span class="rm-col lim">Limit</span>
    </div>
    <div class="rm-row">
      <span class="rm-label">CPU</span>
      <span class="rm-col use">{formatCpu(pod.usageCpu)}</span>
      <span class="rm-col req">{formatCpu(pod.requestCpu)}</span>
      <span class="rm-col lim">{pod.limitCpu ? formatCpu(pod.limitCpu) : '∞'}</span>
    </div>
    <div class="rm-row">
      <span class="rm-label">MEM</span>
      <span class="rm-col use">{formatMemory(pod.usageMemory)}</span>
      <span class="rm-col req">{formatMemory(pod.requestMemory)}</span>
      <span class="rm-col lim">{pod.limitMemory ? formatMemory(pod.limitMemory) : '∞'}</span>
    </div>
  </div>
</div>

<style>
.tooltip {
  position: fixed;
  z-index: 9999;
  width: 280px;
  border-radius: 12px;
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px var(--border);
}

.tip-header {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
.tip-phase-dot {
  flex-shrink: 0;
  width: 8px; height: 8px;
  border-radius: 50%;
  margin-top: 4px;
  box-shadow: 0 0 6px currentColor;
}
.tip-name-wrap { min-width: 0; }
.tip-name {
  font-weight: 700;
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tip-ns { font-size: 0.7rem; color: var(--text-muted); }

.tip-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.meta-badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  background: var(--bg-elevated);
  color: var(--text-muted);
  border: 1px solid var(--border);
}
.meta-badge strong { color: var(--text-primary); }
.meta-badge.warn   { color: #f59e0b; }

.tip-containers {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cs-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.68rem;
}
.cs-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.cs-ready    { background: var(--pod-running); }
.cs-notready { background: var(--pod-error); }
.cs-name { color: var(--text-primary); font-weight: 500; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.cs-state { color: var(--text-muted); font-size: 0.62rem; }

.tip-divider {
  height: 1px;
  background: var(--border);
  margin: 2px 0;
}

.resource-matrix { font-family: var(--font-mono); font-size: 0.68rem; }
.rm-header, .rm-row {
  display: grid;
  grid-template-columns: 2rem 1fr 1fr 1fr;
  gap: 0.25rem;
  align-items: center;
  padding: 2px 0;
}
.rm-header { color: var(--text-muted); font-size: 0.6rem; font-weight: 600; letter-spacing: 0.04em; }
.rm-label  { color: var(--text-muted); font-size: 0.6rem; font-weight: 700; letter-spacing: 0.05em; }
.rm-col    { text-align: right; }
.rm-col.use { color: var(--gauge-usage);   font-weight: 600; }
.rm-col.req { color: var(--gauge-request); }
.rm-col.lim { color: var(--gauge-limit); }
</style>
