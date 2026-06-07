<script lang="ts">
  import type { PageData } from './$types.js';
  import type { SizingMetric, ViewMode, PodInfo } from '$lib/types.js';
  import { onMount } from 'svelte';

  import {
    nodes, pods, metrics,
    getAllNamespaces,
    applyInitialData, applySSEEvent,
  } from '$lib/k8sStore.svelte.js';

  import ClusterHeader            from '$lib/components/ClusterHeader.svelte';
  import ControlsBar              from '$lib/components/ControlsBar.svelte';
  import NodeCard                 from '$lib/components/NodeCard.svelte';
  import MetricsUnavailableBanner from '$lib/components/MetricsUnavailableBanner.svelte';

  let { data }: { data: PageData } = $props();

  // ── Hydrate store from server-loaded data ──────────────────────────────
  // Use $effect.pre so it runs before first render with the server data
  $effect.pre(() => {
    applyInitialData(data);
  });

  // ── UI state ───────────────────────────────────────────────────────────
  let search         = $state('');
  let namespaces     = $state<string[]>([]);
  let statusFilters  = $state<string[]>([]);
  let sizingMetric   = $state<SizingMetric>('uniform');
  let viewMode       = $state<ViewMode>('default');
  let darkMode       = $state(false);
  let highlightKey   = $state<string | null>(null);
  let bannerDismissed = $state(false);

  // Detect initial dark mode from the class applied by layout
  $effect(() => {
    darkMode = document.documentElement.classList.contains('dark');
  });

  function toggleDark() {
    darkMode = !darkMode;
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  // ── Reactive pods-by-node map (re-derives when pods change) ───────────
  const podsByNode = $derived.by(() => {
    const map = new Map<string, PodInfo[]>();
    for (const pod of pods.values()) {
      const list = map.get(pod.nodeName) ?? [];
      list.push(pod);
      map.set(pod.nodeName, list);
    }
    return map;
  });

  // ── Single derived: nodes + their filtered pods ────────────────────────
  // Reading podsByNode inside this derived means ANY pod change (add/update/delete)
  // will cause this to re-compute and the {#each} to re-render.
  const filteredNodeCards = $derived.by(() => {
    const q = search.toLowerCase().trim();
    const ns = namespaces;
    const sf = statusFilters;

    return [...nodes.values()]
      .filter((node) => {
        if (q && !node.name.toLowerCase().includes(q)) {
          const nodePods = podsByNode.get(node.name) ?? [];
          const podMatch = nodePods.some(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.namespace.toLowerCase().includes(q) ||
              p.ownerName.toLowerCase().includes(q)
          );
          if (!podMatch) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aCP = a.roles.includes('control-plane') || a.roles.includes('master');
        const bCP = b.roles.includes('control-plane') || b.roles.includes('master');
        if (aCP !== bCP) return aCP ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((node) => {
        const raw = podsByNode.get(node.name) ?? [];
        const filteredPods = raw.filter((p) => {
          if (ns.length > 0 && !ns.includes(p.namespace)) return false;
          if (sf.length > 0 && !sf.includes(p.phase)) return false;
          if (q) {
            return (
              p.name.toLowerCase().includes(q) ||
              p.namespace.toLowerCase().includes(q) ||
              p.ownerName.toLowerCase().includes(q)
            );
          }
          return true;
        });
        return { node, pods: filteredPods };
      });
  });

  // ── SSE stream ─────────────────────────────────────────────────────────
  let sse: EventSource | null = null;
  let sseStatus = $state<'connecting' | 'connected' | 'error'>('connecting');
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  function connectSSE() {
    if (sse) { sse.close(); sse = null; }

    sseStatus = 'connecting';
    sse = new EventSource('/api/k8s/stream');

    sse.onopen = () => { sseStatus = 'connected'; };

    sse.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type !== 'HEARTBEAT') applySSEEvent(event);
      } catch (err) {
        console.error('SSE parse error', err);
      }
    };

    sse.onerror = () => {
      sseStatus = 'error';
      sse?.close();
      sse = null;
      // Reconnect after 3s
      reconnectTimeout = setTimeout(connectSSE, 3000);
    };
  }

  onMount(() => {
    connectSSE();
    return () => {
      sse?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  });
</script>

<svelte:head>
  <title>Kube Resource View</title>
</svelte:head>

<div class="app-shell">
  <ClusterHeader />

  <!-- Metrics unavailable banner -->
  {#if metrics.available === false && !bannerDismissed}
    <MetricsUnavailableBanner ondismiss={() => (bannerDismissed = true)} />
  {/if}

  <!-- SSE status indicator -->
  <div class="sse-indicator" class:error={sseStatus === 'error'} class:connecting={sseStatus === 'connecting'}>
    <span class="sse-dot"></span>
    {#if sseStatus === 'connected'}Live{:else if sseStatus === 'connecting'}Connecting…{:else}Reconnecting…{/if}
  </div>

  <!-- Node grid -->
  <main class="node-grid" class:detail-mode={viewMode === 'detail'}>
    {#each filteredNodeCards as { node, pods: nodePods } (node.name)}
      <NodeCard
        {node}
        pods={nodePods}
        {sizingMetric}
        {viewMode}
        {highlightKey}
        onHighlight={(k) => (highlightKey = k)}
      />
    {/each}

    {#if filteredNodeCards.length === 0}
      <div class="empty-state">
        <div class="empty-icon">⬡</div>
        <div class="empty-title">No nodes found</div>
        <div class="empty-sub">
          {#if search}Try a different search term.{:else}Waiting for cluster data…{/if}
        </div>
      </div>
    {/if}
  </main>

  <!-- Controls (sticky bottom) -->
  <ControlsBar
    {search}
    {namespaces}
    {statusFilters}
    {sizingMetric}
    {viewMode}
    {darkMode}
    onSearch={(v) => (search = v)}
    onNamespaces={(v) => (namespaces = v)}
    onStatusFilters={(v) => (statusFilters = v)}
    onSizingMetric={(v) => (sizingMetric = v)}
    onViewMode={(v) => (viewMode = v)}
    onToggleDark={toggleDark}
  />
</div>

<style>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* SSE indicator */
.sse-indicator {
  position: fixed;
  top: 56px;
  right: 1rem;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--pod-running);
  letter-spacing: 0.04em;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  pointer-events: none;
  opacity: 0.85;
}
.sse-indicator.connecting { color: var(--pod-pending); }
.sse-indicator.error      { color: var(--pod-error); }

.sse-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse-ring 2s ease-out infinite;
}

/* Node grid */
.node-grid {
  flex: 1;
  padding: 1.25rem 1.5rem 0.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
  align-content: start;
}

.node-grid.detail-mode {
  grid-template-columns: 1fr;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}

/* Empty state */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 4rem 2rem;
  color: var(--text-muted);
}
.empty-icon  { font-size: 3rem; opacity: 0.3; }
.empty-title { font-size: 1rem; font-weight: 600; }
.empty-sub   { font-size: 0.8rem; }
</style>
