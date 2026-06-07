<script lang="ts">
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';
  import { onMount } from 'svelte';

  let { children } = $props();

  onMount(() => {
    // Restore persisted theme
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>Kube Resource View</title>
  <meta name="description" content="Real-time Kubernetes resource visualization — CPU, memory usage, requests, and limits across all nodes and pods." />
</svelte:head>

{@render children()}
