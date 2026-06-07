<script lang="ts">
  import type { PodInfo } from '$lib/types.js';
  import type { SizingMetric, ViewMode } from '$lib/types.js';
  import { getPodColorClass, getPodSize, getControllerKey } from '$lib/utils.js';
  import { formatCpu, formatMemory, formatAge } from '$lib/utils.js';
  import { tooltipStore } from '$lib/k8sStore.svelte.js';

  interface Props {
    pod: PodInfo;
    sizingMetric: SizingMetric;
    viewMode: ViewMode;
    nodeCapacity: number;
    highlightKey: string | null;
    onHighlight: (key: string | null) => void;
  }

  let {
    pod,
    sizingMetric,
    viewMode,
    nodeCapacity,
    highlightKey,
    onHighlight,
  }: Props = $props();

  let mouseX    = $state(0);
  let mouseY    = $state(0);

  const colorClass     = $derived(getPodColorClass(pod));
  const controllerKey  = $derived(getControllerKey(pod));
  const isHighlighted  = $derived(highlightKey === controllerKey);
  const isDimmed       = $derived(highlightKey !== null && !isHighlighted);

  const size = $derived(
    viewMode === 'default' ? getPodSize(pod, sizingMetric, nodeCapacity) : 0
  );

  function handleMouseEnter(e: MouseEvent) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    tooltipStore.show(pod, mouseX, mouseY);
  }

  function handleMouseMove(e: MouseEvent) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    tooltipStore.show(pod, mouseX, mouseY);
  }

  function handleMouseLeave() {
    tooltipStore.hide(pod.uid);
  }

  function onClick() {
    onHighlight(isHighlighted ? null : controllerKey);
  }

  // ── Inline resource bars for detail mode ───────────────────────────────
  function pct(v: number, cap: number) {
    if (!cap) return 0;
    return Math.min(100, (v / cap) * 100);
  }
</script>

{#if viewMode === 'default'}
  <!-- ── Compact square ──────────────────────────────────────────── -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="pod-block {colorClass}"
    class:pod-highlighted={isHighlighted}
    class:pod-dimmed={isDimmed}
    style="width:{size}px; height:{size}px;"
    role="button"
    tabindex="0"
    aria-label="Pod {pod.name}"
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
    onmousemove={handleMouseMove}
    onclick={onClick}
    onkeydown={(e) => e.key === 'Enter' && onClick()}
  ></div>

{:else}
  <!-- ── Detail row ───────────────────────────────────────────────── -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="pod-row"
    class:pod-highlighted={isHighlighted}
    class:pod-dimmed={isDimmed}
    role="button"
    tabindex="0"
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
    onmousemove={handleMouseMove}
    onclick={onClick}
    onkeydown={(e) => e.key === 'Enter' && onClick()}
  >
    <div class="pr-status-dot {colorClass}"></div>
    <div class="pr-name-wrap">
      <span class="pr-name" title={pod.name}>{pod.name}</span>
      <span class="pr-ns">{pod.namespace}</span>
    </div>
    {#if pod.ownerKind}
      <span class="pr-owner">{pod.ownerKind}/{pod.ownerName}</span>
    {/if}
    <span class="pr-restarts">
      {pod.containerStatuses.reduce((s, c) => s + c.restartCount, 0)} ↻
    </span>
    <span class="pr-age">{formatAge(pod.createdAt)}</span>

    <!-- Inline resource bars -->
    <div class="pr-bars">
      <div class="pr-bar-row">
        <span class="pr-bar-label cpu">CPU</span>
        <div class="pr-bar-track">
          {#if pod.requestCpu}
            <div class="pr-bar-seg req" style="width:{pct(pod.requestCpu, nodeCapacity)}%"></div>
          {/if}
          {#if pod.usageCpu}
            <div class="pr-bar-seg use" style="width:{pct(pod.usageCpu, nodeCapacity)}%"></div>
          {/if}
          {#if pod.requestCpu}
            <div class="pr-bar-marker req" style="left:{pct(pod.requestCpu, nodeCapacity)}%"></div>
          {/if}
          {#if pod.limitCpu}
            <div class="pr-bar-marker lim" style="left:{pct(pod.limitCpu, nodeCapacity)}%"></div>
          {/if}
        </div>
        <span class="pr-bar-val">{formatCpu(pod.usageCpu)} / {formatCpu(pod.requestCpu)}</span>
      </div>
      <div class="pr-bar-row">
        <span class="pr-bar-label mem">MEM</span>
        <div class="pr-bar-track">
          {#if pod.requestMemory}
            <div class="pr-bar-seg req" style="width:{pct(pod.requestMemory, nodeCapacity)}%"></div>
          {/if}
          {#if pod.usageMemory}
            <div class="pr-bar-seg use" style="width:{pct(pod.usageMemory, nodeCapacity)}%"></div>
          {/if}
          {#if pod.requestMemory}
            <div class="pr-bar-marker req" style="left:{pct(pod.requestMemory, nodeCapacity)}%"></div>
          {/if}
          {#if pod.limitMemory}
            <div class="pr-bar-marker lim" style="left:{pct(pod.limitMemory, nodeCapacity)}%"></div>
          {/if}
        </div>
        <span class="pr-bar-val">{formatMemory(pod.usageMemory)} / {formatMemory(pod.requestMemory)}</span>
      </div>
    </div>
  </div>
{/if}



<style>
/* ── Default block ───────────────────────────────────────────────── */
.pod-block {
  border-radius: 3px;
  cursor: pointer;
  transition: transform 0.15s, opacity 0.15s, box-shadow 0.15s;
  flex-shrink: 0;
}
.pod-block:hover {
  transform: scale(1.25);
  z-index: 5;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

/* ── Detail row ──────────────────────────────────────────────────── */
.pod-row {
  display: grid;
  grid-template-columns: 10px 1fr auto auto auto 200px;
  align-items: center;
  gap: 0.6rem;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  font-size: 0.75rem;
}
.pod-row:hover { background: var(--bg-elevated); }

.pr-status-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pr-name-wrap { min-width: 0; }
.pr-name {
  display: block;
  font-weight: 600;
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pr-ns    { color: var(--text-muted); font-size: 0.65rem; }
.pr-owner { color: var(--text-muted); font-size: 0.65rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pr-restarts { font-size: 0.65rem; color: var(--text-muted); white-space: nowrap; }
.pr-age      { font-size: 0.65rem; color: var(--text-muted); white-space: nowrap; font-family: var(--font-mono); }

.pr-bars { display: flex; flex-direction: column; gap: 3px; }
.pr-bar-row { display: flex; align-items: center; gap: 0.4rem; }
.pr-bar-label {
  font-size: 0.55rem; font-weight: 700; letter-spacing: 0.05em;
  width: 1.8rem; color: var(--text-muted);
}
.pr-bar-track {
  position: relative;
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: var(--bg-elevated);
  overflow: hidden;
}
.pr-bar-seg { position: absolute; top: 0; left: 0; height: 100%; border-radius: 999px; }
.pr-bar-seg.req { background: var(--gauge-request); opacity: 0.5; }
.pr-bar-seg.use { background: var(--gauge-usage); }
.pr-bar-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1.5px;
  z-index: 10;
  transform: translateX(-50%);
  pointer-events: none;
}
.pr-bar-marker.req { background: var(--gauge-request); }
.pr-bar-marker.lim { background: var(--gauge-limit); }
.pr-bar-val {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--text-muted);
  white-space: nowrap;
  width: 8rem;
  text-align: right;
}

/* ── Shared states ───────────────────────────────────────────────── */
.pod-highlighted { outline: 2px solid var(--accent); outline-offset: 1px; }
.pod-dimmed      { opacity: 0.25; }
</style>
