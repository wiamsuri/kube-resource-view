import type { RequestHandler } from './$types.js';
import { getCoreV1Api, getCustomObjectsApi } from '$lib/server/k8sClient.js';

export const GET: RequestHandler = async () => {
  try {
    const coreApi = getCoreV1Api();

    // Test 1: List nodes
    console.log('[test] Listing nodes...');
    const nodes = await coreApi.listNode();
    console.log('[test] Found', nodes.items.length, 'nodes');

    // Test 2: List pods - try the cluster-level endpoint
    console.log('[test] Listing pods (cluster level)...');
    const pods = await coreApi.listPodForAllNamespaces();
    console.log('[test] Found', pods.items.length, 'pods');

    // Group by namespace
    const podsByNs = new Map<string, number>();
    for (const pod of pods.items) {
      const ns = pod.metadata?.namespace || 'unknown';
      podsByNs.set(ns, (podsByNs.get(ns) || 0) + 1);
    }
    console.log('[test] Pods by namespace:', Object.fromEntries(podsByNs));

    // Test 3: Try metrics
    console.log('[test] Testing metrics...');
    const customApi = getCustomObjectsApi();
    const nodeMetrics = await customApi.listClusterCustomObject({
      group: 'metrics.k8s.io',
      version: 'v1beta1',
      plural: 'nodes'
    });
    console.log('[test] Got node metrics');

    return new Response(JSON.stringify({
      success: true,
      nodes: nodes.items.length,
      pods: pods.items.length,
      podsByNamespace: Object.fromEntries(podsByNs),
      metricsAvailable: true,
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[test] Error:', err);
    return new Response(JSON.stringify({
      success: false,
      error: String(err),
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
