<script lang="ts">
  import type { PodInfo, SizingMetric, ViewMode } from '$lib/types.js';
  import PodBlock from './PodBlock.svelte';

  interface Props {
    pods: PodInfo[];
    sizingMetric: SizingMetric;
    viewMode: ViewMode;
    highlightKey: string | null;
    onHighlight: (key: string | null) => void;
  }

  let { pods, sizingMetric, viewMode, highlightKey, onHighlight }: Props = $props();

  let isCollapsed = $state(false);

  // Use a sensible default node capacity reference (e.g. 1000m / 1Gi) for sizing calculations
  const dummyCapacity = $derived(
    sizingMetric.startsWith('cpu') ? 1000 : 1024 * 1024 * 1024
  );
</script>

{#if pods.length > 0}
  <div class="unassigned-widget glass fade-in-up" class:collapsed={isCollapsed}>
    <!-- ── Header ──────────────────────────────────────────────── -->
    <header class="widget-header">
      <div class="header-left">
        <span class="pending-dot"></span>
        <span class="widget-title">Unassigned Pods</span>
        <span class="count-badge">{pods.length}</span>
      </div>

      <button
        type="button"
        class="collapse-btn"
        onclick={() => (isCollapsed = !isCollapsed)}
        title={isCollapsed ? 'Expand unassigned pods' : 'Collapse unassigned pods'}
        aria-label="Toggle unassigned pods view"
      >
        <span class="chevron" class:open={!isCollapsed}>▾</span>
      </button>
    </header>

    <!-- ── Body: Pod Blocks ───────────────────────────────────── -->
    {#if !isCollapsed}
      <div class="widget-body">
        <div class="pod-container" class:pod-grid={viewMode === 'default'} class:pod-list={viewMode === 'detail'}>
          {#each pods as pod (pod.uid)}
            <PodBlock
              {pod}
              {sizingMetric}
              {viewMode}
              nodeCapacity={dummyCapacity}
              {highlightKey}
              {onHighlight}
            />
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
.unassigned-widget {
  position: fixed;
  bottom: 58px;
  left: 1.5rem;
  z-index: 45;
  max-width: 360px;
  min-width: 220px;
  border-radius: 12px;
  padding: 0.5rem 0.65rem;
  border: 1px solid rgba(245, 158, 11, 0.4);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), 0 0 12px rgba(245, 158, 11, 0.15);
  transition: max-width 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.25s ease, transform 0.25s ease;
}

.unassigned-widget.collapsed {
  max-width: 240px;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in-up {
  animation: fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* Header */
.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.pending-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pod-pending);
  box-shadow: 0 0 6px var(--pod-pending);
  animation: pulse-dot 1.8s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.widget-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.count-badge {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pod-pending) 20%, transparent);
  color: var(--pod-pending);
  border: 1px solid color-mix(in srgb, var(--pod-pending) 40%, transparent);
}

.collapse-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.1rem 0.2rem;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.collapse-btn:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.chevron {
  transition: transform 0.2s ease;
}
.chevron.open {
  transform: rotate(0deg);
}

/* Body */
.widget-body {
  margin-top: 0.4rem;
  max-height: 180px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.pod-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-content: flex-start;
}

.pod-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
</style>
