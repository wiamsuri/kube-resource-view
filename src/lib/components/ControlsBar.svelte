<script lang="ts">
  import type { SizingMetric, ViewMode, NodeSortOrder } from '$lib/types.js';
  import { getAllNamespaces } from '$lib/k8sStore.svelte.js';

  interface Props {
    search: string;
    namespaces: string[];
    statusFilters: string[];
    sizingMetric: SizingMetric;
    viewMode: ViewMode;
    darkMode: boolean;
    sortBy: NodeSortOrder;
    onSearch: (v: string) => void;
    onNamespaces: (v: string[]) => void;
    onStatusFilters: (v: string[]) => void;
    onSizingMetric: (v: SizingMetric) => void;
    onViewMode: (v: ViewMode) => void;
    onToggleDark: () => void;
    onSortBy: (v: NodeSortOrder) => void;
  }

  let {
    search, namespaces, statusFilters, sizingMetric, viewMode, darkMode, sortBy,
    onSearch, onNamespaces, onStatusFilters, onSizingMetric, onViewMode, onToggleDark, onSortBy,
  }: Props = $props();

  const ALL_STATUSES = ['Running', 'Pending', 'Failed', 'Succeeded', 'Terminating'];
  const SIZING_OPTIONS: { value: SizingMetric; label: string }[] = [
    { value: 'uniform',    label: 'Uniform' },
    { value: 'cpuRequest', label: 'CPU Req' },
    { value: 'cpuLimit',   label: 'CPU Lim' },
    { value: 'cpuUsage',   label: 'CPU Use' },
    { value: 'memRequest', label: 'Mem Req' },
    { value: 'memLimit',   label: 'Mem Lim' },
    { value: 'memUsage',   label: 'Mem Use' },
  ];

  const SORT_OPTIONS: { value: NodeSortOrder; label: string }[] = [
    { value: 'name',        label: 'Sort: Name' },
    { value: 'age-oldest',  label: 'Sort: Age (Oldest)' },
    { value: 'age-newest',  label: 'Sort: Age (Newest)' },
  ];

  let nsOpen = $state(false);
  let minimized = $state(false);

  function toggleNs(ns: string) {
    if (namespaces.includes(ns)) {
      onNamespaces(namespaces.filter(n => n !== ns));
    } else {
      onNamespaces([...namespaces, ns]);
    }
  }

  function toggleStatus(s: string) {
    if (statusFilters.includes(s)) {
      onStatusFilters(statusFilters.filter(x => x !== s));
    } else {
      onStatusFilters([...statusFilters, s]);
    }
  }

  const STATUS_COLORS: Record<string, string> = {
    Running: 'var(--pod-running)',
    Pending: 'var(--pod-pending)',
    Failed:  'var(--pod-error)',
    Succeeded: 'var(--pod-succeeded)',
    Terminating: 'var(--pod-terminating)',
  };
</script>

<div class="controls-bar glass" class:is-minimized={minimized}>
  <div class="controls-content">
  <!-- Search -->
  <div class="search-wrap">
    <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
    <input
      id="search-input"
      class="search-input"
      type="text"
      placeholder="Search pods, nodes, controllers…"
      value={search}
      oninput={(e) => onSearch((e.target as HTMLInputElement).value)}
    />
    {#if search}
      <button class="clear-btn" onclick={() => onSearch('')} aria-label="Clear search">✕</button>
    {/if}
  </div>

  <div class="controls-divider"></div>

  <!-- Status filters -->
  <div class="status-filters" role="group" aria-label="Status filters">
    {#each ALL_STATUSES as s}
      <button
        class="status-chip"
        class:active={statusFilters.length === 0 || statusFilters.includes(s)}
        style="--chip-color:{STATUS_COLORS[s]}"
        onclick={() => toggleStatus(s)}
        title={s}
      >
        <span class="chip-dot"></span>
        {s}
      </button>
    {/each}
  </div>

  <div class="controls-divider"></div>

  <!-- Namespace filter -->
  <div class="ns-wrap">
    <button id="ns-filter-btn" class="select-btn" onclick={() => (nsOpen = !nsOpen)}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      </svg>
      {namespaces.length === 0 ? 'All namespaces' : `${namespaces.length} ns`}
      <span class="chevron" class:open={nsOpen}>▾</span>
    </button>
    {#if nsOpen}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="ns-dropdown glass" onmouseleave={() => (nsOpen = false)}>
        <button class="ns-item" class:selected={namespaces.length === 0} onclick={() => onNamespaces([])}>
          All namespaces
        </button>
        {#each getAllNamespaces() as ns}
          <button class="ns-item" class:selected={namespaces.includes(ns)} onclick={() => toggleNs(ns)}>
            {#if namespaces.includes(ns)}<span class="check">✓</span>{/if}
            {ns}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="controls-divider"></div>

  <!-- Sizing metric -->
  <select
    id="sizing-metric-select"
    class="select-native"
    value={sizingMetric}
    onchange={(e) => onSizingMetric((e.target as HTMLSelectElement).value as SizingMetric)}
    title="Pod size metric"
  >
    {#each SIZING_OPTIONS as opt}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>

  <div class="controls-divider"></div>

  <!-- Node sort -->
  <select
    id="node-sort-select"
    class="select-native"
    value={sortBy}
    onchange={(e) => onSortBy((e.target as HTMLSelectElement).value as NodeSortOrder)}
    title="Node sort order"
  >
    {#each SORT_OPTIONS as opt}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>

  <div class="controls-divider"></div>

  <!-- View mode -->
  <div class="icon-group" role="group" aria-label="View mode">
    <button
      id="view-default-btn"
      class="icon-btn"
      class:icon-active={viewMode === 'default'}
      onclick={() => onViewMode('default')}
      title="Compact view"
      aria-pressed={viewMode === 'default'}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="2" width="9" height="9" rx="1"/>
        <rect x="13" y="2" width="9" height="9" rx="1"/>
        <rect x="2" y="13" width="9" height="9" rx="1"/>
        <rect x="13" y="13" width="9" height="9" rx="1"/>
      </svg>
    </button>
    <button
      id="view-detail-btn"
      class="icon-btn"
      class:icon-active={viewMode === 'detail'}
      onclick={() => onViewMode('detail')}
      title="Detail view"
      aria-pressed={viewMode === 'detail'}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <circle cx="3" cy="6" r="1" fill="currentColor"/>
        <circle cx="3" cy="12" r="1" fill="currentColor"/>
        <circle cx="3" cy="18" r="1" fill="currentColor"/>
      </svg>
    </button>
  </div>

  <!-- Theme toggle -->
  <button
    id="theme-toggle-btn"
    class="icon-btn theme-btn"
    onclick={onToggleDark}
    title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    aria-label="Toggle theme"
  >
    {#if darkMode}
      <!-- Sun -->
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    {:else}
      <!-- Moon -->
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    {/if}
  </button>
  </div>

  <!-- Minimize toggle -->
  <button
    id="minimize-btn"
    class="icon-btn minimize-btn"
    onclick={() => (minimized = !minimized)}
    title={minimized ? 'Expand controls' : 'Minimize controls'}
    aria-label="Toggle minimize"
  >
    {#if minimized}
      <!-- Search icon to expand -->
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
    {:else}
      <!-- Minimize icon -->
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/>
      </svg>
    {/if}
  </button>

  {#if minimized && (search || namespaces.length > 0 || statusFilters.length > 0)}
    <span class="active-badge-dot" title="Active filters or search"></span>
  {/if}
</div>

<style>
.controls-bar {
  position: fixed;
  bottom: 0.8rem;
  left: 1.5rem;
  right: 1.5rem;
  height: 42px;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1rem;
  border-radius: 14px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.2);
  transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  overflow: hidden;
}

.controls-content {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.5rem;
  flex: 1;
  opacity: 1;
  transition: opacity 0.15s ease;
  overflow-x: auto;
  scrollbar-width: none;
}

.controls-content::-webkit-scrollbar {
  display: none;
}

.controls-bar.is-minimized {
  left: calc(100% - 42px - 1.5rem);
  right: 1.5rem;
  width: 42px;
  height: 42px;
  padding: 0;
  border-radius: 50%;
  justify-content: center;
  align-content: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px var(--border);
}

.controls-bar.is-minimized .controls-content {
  opacity: 0;
  pointer-events: none;
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}

.controls-bar.is-minimized:hover {
  transform: scale(1.08);
  background: var(--bg-surface);
  border-color: var(--accent);
}

.minimize-btn {
  position: relative;
  flex-shrink: 0;
}

.active-badge-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  background-color: var(--accent);
  border: 1.5px solid var(--bg-surface);
  border-radius: 50%;
  box-shadow: 0 0 6px var(--accent);
  z-index: 5;
}

.search-wrap {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 1;
  min-width: 160px;
  max-width: 300px;
}
.search-icon { color: var(--text-muted); flex-shrink: 0; }
.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-family: var(--font-sans);
  font-size: 0.8rem;
  color: var(--text-primary);
  min-width: 0;
}
.search-input::placeholder { color: var(--text-muted); }
.clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.7rem;
  padding: 0;
  line-height: 1;
}
.clear-btn:hover { color: var(--text-primary); }

.controls-divider {
  width: 1px;
  height: 1.2rem;
  background: var(--border);
}

/* Status chips */
.status-filters { display: flex; gap: 0.3rem; flex-wrap: nowrap; }
.status-chip {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.55rem;
  font-size: 0.65rem;
  font-weight: 600;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
  opacity: 0.45;
}
.status-chip.active {
  opacity: 1;
  color: var(--chip-color);
  border-color: var(--chip-color);
  background: color-mix(in srgb, var(--chip-color) 10%, transparent);
}
.chip-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--chip-color);
}

/* Namespace dropdown */
.ns-wrap { position: relative; }
.select-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.3rem 0.65rem;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.select-btn:hover { background: var(--bg-elevated); }
.chevron { transition: transform 0.15s; font-size: 0.7rem; }
.chevron.open { transform: rotate(180deg); }

.ns-dropdown {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  min-width: 180px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
}
.ns-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.75rem;
  font-size: 0.75rem;
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}
.ns-item:hover, .ns-item.selected { background: var(--bg-elevated); }
.check { color: var(--accent); font-size: 0.65rem; }

/* Sizing select */
.select-native {
  font-size: 0.75rem;
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.3rem 0.65rem;
  cursor: pointer;
  outline: none;
}

/* Icon buttons */
.icon-group { display: flex; gap: 2px; }
.icon-btn {
  background: none;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0.35rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
}
.icon-btn:hover { color: var(--text-primary); background: var(--bg-elevated); }
.icon-active    { color: var(--accent) !important; background: var(--accent-glow) !important; border-color: var(--accent) !important; }
.theme-btn      { margin-left: 2px; }
</style>
