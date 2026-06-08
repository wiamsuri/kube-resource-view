# Kube Resource View

**Kube Resource View** is an ultra-lightweight, zero-dependency, real-time visualization dashboard designed to give cluster administrators an instant, intuitive look at CPU and Memory allocation and consumption.

Unlike heavy monitoring setups (like Prometheus, Grafana, or OpenTelemetry) that take hours to configure, require persistent storage, and consume substantial cluster resources themselves, Kube Resource View is **stateless, instant, and deployable in seconds**.

---

## Why Kube Resource View?

As a Kubernetes administrator, answering simple questions about cluster capacity shouldn't require complex query languages or heavy dashboards:
* *Which nodes are over-committed on requests, but idle on actual usage?*
* *Which pods are hitting their memory limits and risking OOM kills?*
* *How much headroom do we actually have left in the cluster?*

Kube Resource View answers these questions at a glance by visually pairing three critical metrics for every node and pod:
1. **Actual Consumption** (Live metrics from Kubernetes Metrics Server)
2. **Resource Requests** (Guaranteed capacity)
3. **Resource Limits** (Max capacity boundaries)

---

## Key Benefits for Cluster Admins

* **Zero-Configuration Deployment**: No databases to provision, no persistent storage volumes, and no custom resource definitions (CRDs). You deploy a single YAML manifest, and the dashboard is live.
* **Instant visual feedback**: Dynamic, responsive gauges contrast requests, limits, and actual usage side-by-side, making resource sizing imbalances instantly obvious.
* **Real-Time Stream**: Powered by Kubernetes watch events and server-sent metrics, pod creations, deletions, and resource usage changes stream directly to your browser as they happen.
* **Ultra-Lightweight**: The backend is completely stateless and consumes very little memory (~60MB).

---

## One-Command Deployment

You can deploy Kube Resource View directly to your cluster using the pre-configured deployment manifest.

```bash
kubectl apply -f k8s/example-deployment.yaml
```

Once applied, this creates:
1. A **ServiceAccount & ClusterRole** with read-only access to query nodes, pods, and metrics.
2. A **Deployment** with 1 replica of the dashboard.
3. A **Service** exposing the HTTP dashboard.

*Note: The cluster must have the standard Kubernetes `metrics-server` installed for actual CPU & Memory consumption data to populate.*

---

## Local Testing (Running via Kubeconfig)

If you prefer to run it locally on your machine (using your current active `kubectl` context) without deploying it to the cluster:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the local server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` to see your active cluster immediately.

---

## License

This project is licensed under the [MIT License](file:///Users/wattiamsuri/Projects/kube-resource-view/LICENSE).
