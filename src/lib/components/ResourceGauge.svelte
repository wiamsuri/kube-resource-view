<script lang="ts">
  interface Props {
    request: number;
    limit: number;
    usage: number;
    capacity: number;
    label: string;
    formatValue: (v: number) => string;
  }
  let { request, limit, usage, capacity, label, formatValue }: Props = $props();

  function pct(v: number) {
    if (!capacity) return 0;
    return Math.min(100, (v / capacity) * 100);
  }

  const reqPct  = $derived(pct(request));
  const limPct  = $derived(pct(limit));
  const usePct  = $derived(pct(usage));
  const isOver  = $derived(usePct >= 95);
</script>

<div class="gauge-wrap">
  <div class="gauge-labels">
    <span class="gauge-name">{label}</span>
    <span class="gauge-cap">{formatValue(capacity)}</span>
  </div>
  <div class="gauge-track">
    <!-- Allocated Requests -->
    <div class="gauge-bar req" style="width:{reqPct}%" title="Requests: {formatValue(request)} ({reqPct.toFixed(1)}%)"></div>
    <!-- Allocated Limits -->
    <div class="gauge-bar lim" style="width:{limPct}%" title="Limits: {formatValue(limit)} ({limPct.toFixed(1)}%)"></div>
    <!-- Actual Usage -->
    <div class="gauge-bar use {isOver ? 'over' : ''}" style="width:{usePct}%" title="Usage: {formatValue(usage)} ({usePct.toFixed(1)}%)"></div>
  </div>
  <div class="gauge-row-labels">
    <div class="gl req"><span class="gl-dot"></span>{formatValue(request)}</div>
    <div class="gl lim"><span class="gl-dot"></span>{formatValue(limit)}</div>
    <div class="gl use {isOver ? 'over' : ''}"><span class="gl-dot"></span>{formatValue(usage)}</div>
  </div>
</div>

<style>
.gauge-wrap { display: flex; flex-direction: column; gap: 4px; }

.gauge-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.gauge-track {
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: var(--bg-elevated);
  overflow: hidden;
}

.gauge-bar {
  position: absolute;
  top: 0; left: 0;
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.gauge-bar.req { background: var(--gauge-request); opacity: 0.45; }
.gauge-bar.lim { background: var(--gauge-limit);   opacity: 0.45; }
.gauge-bar.use { background: var(--gauge-usage); }
.gauge-bar.use.over { background: var(--gauge-over); }

.gauge-row-labels {
  display: flex;
  gap: 0.6rem;
}
.gl {
  display: flex;
  align-items: center;
  gap: 3px;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  color: var(--text-muted);
}
.gl-dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
}
.gl.req .gl-dot { background: var(--gauge-request); }
.gl.lim .gl-dot { background: var(--gauge-limit); }
.gl.use .gl-dot { background: var(--gauge-usage); }
.gl.use.over .gl-dot { background: var(--gauge-over); }
.gl.use.over { color: var(--gauge-over); }
</style>
