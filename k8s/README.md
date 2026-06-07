# kube-resource-view — Local Docker Build & Deployment

This guide covers building the Docker image locally and deploying it to a local Kubernetes cluster (e.g. [minikube](https://minikube.sigs.k8s.io/) or [kind](https://kind.sigs.k8s.io/)).

---

## Prerequisites

| Tool | Version |
|------|---------|
| Docker | 20+ |
| kubectl | 1.25+ |
| minikube **or** kind | latest |

---

## Building the Image

The [Dockerfile](../Dockerfile) has three stages:

| Stage | Target | Purpose |
|-------|--------|---------|
| `development` | `--target development` | Hot-reload dev server on port `5173` |
| `builder` | *(intermediate)* | Compiles the SvelteKit app |
| `production` | `--target production` | Slim production image on port `3000` |

### Production image (default)

```bash
docker build --target production -t kube-resource-view:latest .
```

### Development image

```bash
docker build --target development -t kube-resource-view:dev .
```

> **Tip**: Run `docker images kube-resource-view` to verify the image was created.

---

## Loading the Image into a Local Cluster

Because `deployment.yaml` uses `imagePullPolicy: IfNotPresent`, the image must be present inside the cluster's container runtime — not just on your host Docker daemon.

### minikube

```bash
# Point your shell at minikube's Docker daemon, then build
eval $(minikube docker-env)
docker build --target production -t kube-resource-view:latest .
```

### kind

```bash
# Build on the host first, then load into kind
docker build --target production -t kube-resource-view:latest .
kind load docker-image kube-resource-view:latest
```

---

## Deploying to Kubernetes

Apply all manifests in this directory:

```bash
kubectl apply -f k8s/
```

This creates:
- `ServiceAccount` — `kube-resource-view-sa`
- `ClusterRole` / `ClusterRoleBinding` — read access to nodes, pods, namespaces & metrics
- `Deployment` — 2 replicas, resource limits set
- `Service` — ClusterIP on port `80` → container port `3000`
- `Ingress` — (see [`ingress.yaml`](./ingress.yaml))

### Verify the deployment

```bash
kubectl rollout status deployment/kube-resource-view
kubectl get pods -l app=kube-resource-view
```

---

## Quick Access (minikube)

```bash
minikube service kube-resource-view
```

Or use port-forward directly:

```bash
kubectl port-forward svc/kube-resource-view 8080:80
# Open http://localhost:8080
```

---

## Teardown

```bash
kubectl delete -f k8s/
```

To remove the local image as well:

```bash
docker rmi kube-resource-view:latest
```
