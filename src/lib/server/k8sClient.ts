import * as k8s from '@kubernetes/client-node';

let _kc: k8s.KubeConfig | null = null;

function getKubeConfig(): k8s.KubeConfig {
  if (_kc) return _kc;

  _kc = new k8s.KubeConfig();

  // Try default kubeconfig first (local development)
  let loaded = false;
  try {
    _kc.loadFromDefault();
    loaded = true;
    console.log('[k8sClient] Loaded kubeconfig from default location');
  } catch (e) {
    console.log('[k8sClient] Default config not available, trying in-cluster');
  }

  // Fall back to in-cluster if default didn't work
  if (!loaded) {
    try {
      _kc.loadFromCluster();
      loaded = true;
      console.log('[k8sClient] Loaded kubeconfig from in-cluster service account');
    } catch (loadError) {
      console.error('[k8sClient] Failed to load kubeconfig:', loadError);
      throw new Error('Unable to load Kubernetes configuration');
    }
  }

  // Get current context - note: this returns a CONTEXT NAME string, not the context object
  const currentContextName = _kc.getCurrentContext();
  let currentContext = currentContextName ? _kc.getContextObject(currentContextName) : null;
  console.log('[k8sClient] Loaded contexts:', _kc.contexts?.map(c => c.name));
  console.log('[k8sClient] Current context name from config:', currentContextName);
  console.log('[k8sClient] Current context object:', currentContext?.name);
  console.log('[k8sClient] All clusters:', _kc.clusters?.map(c => c.name));

  // If no current context, try common defaults
  if (!currentContext && _kc.contexts && _kc.contexts.length > 0) {
    console.log('[k8sClient] ✓ Entering context selection logic');
    const preferredContexts = ['colima', 'docker-desktop', 'minikube', 'kind-kind'];
    for (const preferredName of preferredContexts) {
      const found = _kc.getContextObject(preferredName);
      if (found) {
        console.log(`[k8sClient] Found preferred context "${preferredName}", cluster: "${found.cluster}"`);
        const cluster = _kc.getCluster(found.cluster);
        console.log(`[k8sClient] Cluster lookup result:`, { exists: !!cluster, server: cluster?.server });
        if (cluster && cluster.server) {
          currentContext = found;
          _kc.setCurrentContext(found.name);
          console.log('[k8sClient] ✓ Using preferred context:', found.name);
          break;
        }
      }
    }

    // If no preferred context found, try any context with a valid cluster
    if (!currentContext) {
      console.log('[k8sClient] No preferred context found, trying any valid context...');
      for (const ctx of _kc.contexts) {
        console.log(`[k8sClient] Checking context "${ctx.name}", cluster: "${ctx.cluster}"`);
        const cluster = _kc.getCluster(ctx.cluster);
        if (cluster && cluster.server) {
          currentContext = ctx;
          _kc.setCurrentContext(ctx.name);
          console.log('[k8sClient] ✓ Using first valid context:', ctx.name);
          break;
        }
      }
    }
  }

  if (!currentContext) {
    throw new Error('No Kubernetes context available in kubeconfig');
  }

  const cluster = _kc.getCluster(currentContext.cluster);
  if (!cluster) {
    throw new Error(`Cluster '${currentContext.cluster}' not found in kubeconfig`);
  }

  if (!cluster.server) {
    throw new Error(`Cluster '${currentContext.cluster}' has no server URL configured`);
  }

  console.log('[k8sClient] Using context:', currentContext.name, '-> cluster:', currentContext.cluster);
  console.log('[k8sClient] Cluster server:', cluster.server);

  return _kc;
}

export function getCoreV1Api(): k8s.CoreV1Api {
  return getKubeConfig().makeApiClient(k8s.CoreV1Api);
}

export function getCustomObjectsApi(): k8s.CustomObjectsApi {
  return getKubeConfig().makeApiClient(k8s.CustomObjectsApi);
}

export function makeWatch(): k8s.Watch {
  return new k8s.Watch(getKubeConfig());
}

export { getKubeConfig };
