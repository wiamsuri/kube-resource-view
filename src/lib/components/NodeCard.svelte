<script lang="ts">
  import type { NodeInfo, PodInfo } from '$lib/types.js';
  import type { SizingMetric, ViewMode } from '$lib/types.js';
  import { formatCpu, formatMemory, formatAge } from '$lib/utils.js';
  import ResourceGauge from './ResourceGauge.svelte';
  import PodBlock from './PodBlock.svelte';

  interface Props {
    node: NodeInfo;
    pods: PodInfo[];
    sizingMetric: SizingMetric;
    viewMode: ViewMode;
    highlightKey: string | null;
    onHighlight: (key: string | null) => void;
  }

  let { node, pods, sizingMetric, viewMode, highlightKey, onHighlight }: Props = $props();

  const readyCount = $derived(pods.filter(p => p.ready).length);

  // Use allocatable as the sizing reference
  const cpuCap = $derived(node.allocatable.cpuMillicores);
  const memCap = $derived(node.allocatable.memoryBytes);

  // Sorted: errors first, then pending, then running. Secondary: alphabetically by name.
  const sortedPods = $derived([...pods].sort((a, b) => {
    const order: Record<string, number> = {
      Failed: 0, Unknown: 1, Terminating: 2, Pending: 3,
      Running: 4, Succeeded: 5,
    };
    const phaseDiff = (order[a.phase] ?? 4) - (order[b.phase] ?? 4);
    if (phaseDiff !== 0) return phaseDiff;
    return a.name.localeCompare(b.name);
  }));
</script>

<article class="node-card glass fade-in" class:not-ready={!node.ready}>
  <!-- ── Header ──────────────────────────────────────────────── -->
  <header class="node-header">
    <div class="node-title-wrap">
      <div class="node-title-left">
        <div class="node-ready-dot" class:ready={node.ready}></div>
        <h2 class="node-name" title={node.name}>{node.name}</h2>
      </div>
      {#if node.createdAt}
        <span class="node-age" title="Age: {new Date(node.createdAt).toLocaleString()}">{formatAge(node.createdAt)}</span>
      {/if}
    </div>
    <div class="node-meta">
      {#each node.roles as role}
        <span class="role-badge">{role}</span>
      {/each}
      {#if node.instanceType}
        <span class="instance-badge">{node.instanceType}</span>
      {/if}
      <span class="zone-badge" title="Provider/Zone">{node.providerZone}</span>
      {#if node.taints && node.taints.length > 0}
        <button type="button" class="taints-badge-trigger">
          {node.taints.length} {node.taints.length === 1 ? 'taint' : 'taints'}
          <span class="taints-tooltip glass">
            <span class="taints-tooltip-header">Node Taints</span>
            <span class="taints-list">
              {#each node.taints as taint}
                <span class="taint-item">
                  <span class="taint-key">{taint.key}</span>
                  {#if taint.value}
                    <span class="taint-eq">=</span>
                    <span class="taint-val">{taint.value}</span>
                  {/if}
                  <span class="taint-sep">:</span>
                  <span class="taint-effect {taint.effect.toLowerCase()}">{taint.effect}</span>
                </span>
              {/each}
            </span>
          </span>
        </button>
      {/if}
    </div>
  </header>

  <!-- ── Capacity info ───────────────────────────────────────── -->
  <div class="node-capacity">
    <span>{formatCpu(cpuCap)} CPU</span>
    <span class="sep">·</span>
    <span>{formatMemory(memCap)} RAM</span>
    <span class="sep">·</span>
    <span class:warn={!node.ready}>{readyCount}/{pods.length} pods</span>
  </div>

  <!-- ── Resource gauges ─────────────────────────────────────── -->
  <div class="node-gauges">
    <ResourceGauge
      label="CPU"
      request={node.requestedCpu}
      limit={node.limitCpu}
      usage={node.usageCpu}
      capacity={cpuCap}
      formatValue={formatCpu}
    />
    <ResourceGauge
      label="MEM"
      request={node.requestedMemory}
      limit={node.limitMemory}
      usage={node.usageMemory}
      capacity={memCap}
      formatValue={formatMemory}
    />
  </div>

  <!-- ── Pod grid / list ─────────────────────────────────────── -->
  {#if sortedPods.length > 0}
    {#if viewMode === 'default'}
      {@const regularPods = sortedPods.filter(p => p.ownerKind !== 'DaemonSet')}
      {@const daemonSetPods = sortedPods.filter(p => p.ownerKind === 'DaemonSet')}

      <div class="pods-wrapper">
        <div class="pod-container pod-grid">
          {#each regularPods as pod (pod.uid)}
            <PodBlock
              {pod}
              {sizingMetric}
              {viewMode}
              nodeCapacity={sizingMetric.startsWith('cpu') ? cpuCap : memCap}
              {highlightKey}
              {onHighlight}
            />
          {/each}
        </div>

        {#if daemonSetPods.length > 0}
          {#if regularPods.length > 0}
            <div class="ds-divider"></div>
          {/if}
          <div class="pod-container pod-grid">
            {#each daemonSetPods as pod (pod.uid)}
              <PodBlock
                {pod}
                {sizingMetric}
                {viewMode}
                nodeCapacity={sizingMetric.startsWith('cpu') ? cpuCap : memCap}
                {highlightKey}
                {onHighlight}
              />
            {/each}
          </div>
        {/if}
      </div>
    {:else}
      <div class="pod-container pod-list">
        {#each sortedPods as pod (pod.uid)}
          <PodBlock
            {pod}
            {sizingMetric}
            {viewMode}
            nodeCapacity={sizingMetric.startsWith('cpu') ? cpuCap : memCap}
            {highlightKey}
            {onHighlight}
          />
        {/each}
      </div>
    {/if}
  {:else}
    <div class="no-pods">No pods</div>
  {/if}
</article>

<style>
.node-card {
  border-radius: 12px;
  padding: 0.65rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  transition: box-shadow 0.2s;
}
.node-card:hover {
  box-shadow: 0 0 0 1px var(--accent), 0 8px 24px rgba(0,0,0,0.15);
}
.node-card.not-ready {
  border-color: rgba(244,63,94,0.3);
}

/* Header */
.node-header {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.node-title-wrap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}
.node-title-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
  min-width: 0;
}
.node-ready-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--pod-error);
  flex-shrink: 0;
}
.node-ready-dot.ready { background: var(--pod-running); }

.node-name {
  font-size: 0.85rem;
  font-weight: 700;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}

.node-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.role-badge, .instance-badge, .zone-badge, .taints-badge-trigger {
  font-size: 0.6rem;
  font-weight: 600;
  padding: 0.1rem 0.45rem;
  border-radius: 5px;
  letter-spacing: 0.03em;
}
.role-badge     { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.25); }
.instance-badge { background: var(--bg-elevated); color: var(--text-muted); border: 1px solid var(--border); }
.zone-badge     { background: var(--bg-elevated); color: var(--text-muted); border: 1px solid var(--border); }

.taints-badge-trigger {
  background: var(--bg-elevated);
  color: var(--text-muted);
  border: 1px solid var(--border);
  position: relative;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  font-family: inherit;
  margin: 0;
}
.taints-badge-trigger:hover, .taints-badge-trigger:focus-within {
  background: var(--border);
  color: var(--text-primary);
}

.taints-tooltip {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 100;
  width: max-content;
  max-width: 280px;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-4px);
  transition: opacity 0.15s ease, transform 0.15s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  background: var(--bg-tooltip, rgba(15, 23, 42, 0.95));
  border: 1px solid var(--border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.taints-badge-trigger:hover .taints-tooltip,
.taints-badge-trigger:focus-within .taints-tooltip {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.taints-tooltip-header {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.25rem;
  text-align: left;
}

.taints-list {
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.taint-item {
  font-family: var(--font-mono, monospace);
  font-size: 0.6rem;
  line-height: 1.2;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.1rem;
  color: var(--text-primary);
  text-align: left;
}

.taint-key {
  color: #a7f3d0;
}

.taint-eq, .taint-sep {
  color: var(--text-muted);
}

.taint-val {
  color: #e0f2fe;
}

.taint-effect {
  font-weight: 600;
  padding: 0.05rem 0.2rem;
  border-radius: 3px;
}

.taint-effect.noschedule {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.15);
}

.taint-effect.noexecute {
  color: #fda4af;
  background: rgba(244, 63, 94, 0.15);
}

.taint-effect.prefernoschedule {
  color: #fde047;
  background: rgba(234, 179, 8, 0.15);
}

.node-age {
  font-size: 0.65rem;
  color: var(--text-muted);
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Capacity */
.node-capacity {
  font-size: 0.7rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.node-capacity .sep { opacity: 0.4; }
.node-capacity .warn { color: #f59e0b; }

/* Gauges */
.node-gauges {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.45rem;
  background: var(--bg-elevated);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.ds-divider {
  width: 100%;
  height: 1px;
  border-top: 1px dashed var(--border);
  margin: 0.1rem 0;
  opacity: 0.6;
}

.pods-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

/* Pod container */
.pod-container { margin-top: 0.15rem; }

.pod-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  align-content: flex-start;
  min-height: 16px;
}

.pod-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.no-pods {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-align: center;
  padding: 1rem;
}
</style>
