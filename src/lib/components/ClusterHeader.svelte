<script lang="ts">
  import { formatCpu, formatMemory } from '$lib/utils.js';
  import { getClusterTotals, nodes, pods } from '$lib/k8sStore.svelte.js';

  const totals = $derived(getClusterTotals());
  const nodeCount = $derived(nodes.size);
  const podCount  = $derived(pods.size);

  function pct(value: number, total: number) {
    if (!total) return 0;
    return Math.min(100, (value / total) * 100);
  }
</script>

<header class="cluster-header glass">
  <div class="header-left">
    <div class="logo-mark">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
      </svg>
    </div>
    <h1 class="site-title">kube<span class="accent">-resource-view</span></h1>
  </div>

  <div class="header-stats">
    <div class="stat-pill">
      <span class="pill-icon node-icon">⬡</span>
      <span class="pill-value">{nodeCount}</span>
      <span class="pill-label">nodes</span>
    </div>
    <div class="stat-pill">
      <span class="pill-icon pod-icon">◼</span>
      <span class="pill-value">{podCount}</span>
      <span class="pill-label">pods</span>
    </div>

    <div class="divider"></div>

    <!-- CPU summary -->
    <div class="resource-summary">
      <span class="res-label">CPU</span>
      <div class="mini-bar-track">
        <div class="mini-bar req" style="width:{pct(totals.reqCpu, totals.capCpu)}%"></div>
        <div class="mini-bar lim" style="width:{pct(totals.limCpu, totals.capCpu)}%"></div>
        <div class="mini-bar use" style="width:{pct(totals.useCpu, totals.capCpu)}%"></div>
        {#if totals.reqCpu > 0}
          <div class="mini-bar-marker req" style="left:{pct(totals.reqCpu, totals.capCpu)}%"></div>
        {/if}
        {#if totals.limCpu > 0}
          <div class="mini-bar-marker lim" style="left:{pct(totals.limCpu, totals.capCpu)}%"></div>
        {/if}
      </div>
      <span class="res-nums">
        <span class="use-val">{formatCpu(totals.useCpu)}</span>
        <span class="sep">/</span>
        <span class="cap-val">{formatCpu(totals.capCpu)}</span>
      </span>
    </div>

    <!-- Mem summary -->
    <div class="resource-summary">
      <span class="res-label">MEM</span>
      <div class="mini-bar-track">
        <div class="mini-bar req" style="width:{pct(totals.reqMem, totals.capMem)}%"></div>
        <div class="mini-bar lim" style="width:{pct(totals.limMem, totals.capMem)}%"></div>
        <div class="mini-bar use" style="width:{pct(totals.useMem, totals.capMem)}%"></div>
        {#if totals.reqMem > 0}
          <div class="mini-bar-marker req" style="left:{pct(totals.reqMem, totals.capMem)}%"></div>
        {/if}
        {#if totals.limMem > 0}
          <div class="mini-bar-marker lim" style="left:{pct(totals.limMem, totals.capMem)}%"></div>
        {/if}
      </div>
      <span class="res-nums">
        <span class="use-val">{formatMemory(totals.useMem)}</span>
        <span class="sep">/</span>
        <span class="cap-val">{formatMemory(totals.capMem)}</span>
      </span>
    </div>

    <!-- Legend -->
    <div class="legend">
      <span class="legend-item req">Req</span>
      <span class="legend-item lim">Lim</span>
      <span class="legend-item use">Use</span>
    </div>
  </div>
</header>

<style>
.cluster-header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-shrink: 0;
}

.logo-mark {
  color: var(--accent);
  display: flex;
  align-items: center;
}

.site-title {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
  white-space: nowrap;
}

.site-title .accent { color: var(--accent); }

.header-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.2rem 0.75rem;
  font-size: 0.8rem;
}

.pill-value { font-weight: 700; }
.pill-label { color: var(--text-muted); font-size: 0.7rem; }
.node-icon  { color: #818cf8; }
.pod-icon   { color: #34d399; font-size: 0.6rem; }

.divider {
  width: 1px;
  height: 1.5rem;
  background: var(--border);
}

.resource-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.res-label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  width: 2.5rem;
}

.mini-bar-track {
  position: relative;
  width: 100px;
  height: 6px;
  border-radius: 999px;
  background: var(--bg-elevated);
  overflow: visible;
}

.mini-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 999px;
  transition: width 0.6s ease;
}
.mini-bar.req { background: var(--gauge-request); opacity: 0.5; }
.mini-bar.lim { background: var(--gauge-limit);   opacity: 0.4; }
.mini-bar.use { background: var(--gauge-usage);   }
.mini-bar-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1.5px;
  z-index: 10;
  transform: translateX(-50%);
  pointer-events: none;
}
.mini-bar-marker.req { background: var(--gauge-request); }
.mini-bar-marker.lim { background: var(--gauge-limit); }

.res-nums {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  display: flex;
  align-items: center;
  gap: 0.2rem;
}
.use-val { color: var(--text-primary); font-weight: 600; }
.sep     { color: var(--text-muted); }
.cap-val { color: var(--text-muted); }

.legend {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border-left: 1px solid var(--border);
  padding-left: 0.75rem;
}
.legend-item {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}
.legend-item.req { background: rgba(99,102,241,0.15);  color: #818cf8; }
.legend-item.lim { background: rgba(245,158,11,0.15);  color: #fbbf24; }
.legend-item.use { background: rgba(16,185,129,0.15);  color: #34d399; }
</style>
