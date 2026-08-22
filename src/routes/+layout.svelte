<script lang="ts">
  import './layout.css';

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href="/favicon.ico" />
  <title>Kube Resource View</title>
  <meta name="description" content="Real-time Kubernetes resource visualization — CPU, memory usage, requests, and limits across all nodes and pods." />
</svelte:head>

{@render children()}
