# K8S Demo: Node.js API + React UI + SQL Server + Redis

This repository contains a simple Todo application with:

- Node.js Express API using SQL Server and Redis cache
- React frontend built with Create React App
- Kubernetes manifests for AKS
- Argo CD-friendly layout

Note: `helm/` is intentionally ignored in this README because it is not tested yet. Use the `k8s/` manifests for deployment instructions below.

## Repository Structure

```
/ node-api       # Node.js Express backend (SQL Server + Redis)
/ todo-list      # React frontend (CRA)
/ k8s            # Kubernetes manifests for AKS (Namespace, Deployments, Services, Ingress, Secrets, PVC)
/ helm           # Helm chart (not covered here)
```

## Backend (node-api)

- Entrypoint: `index.js`
- Default port: `5000`
- Dependencies: `express`, `cors`, `mssql`, `redis`
- Reads the following environment variables (provided via K8S Secrets):
  - `DB_HOST`, `DB_USER`, `DB_PASSWORD`
  - `REDIS_PASSWORD`
- Behavior:
  - Creates database `TodoDb` (if not exists) in SQL Server
  - Ensures table `todos (id INT IDENTITY, text NVARCHAR(255))`
  - Caches GET `/api/todos` results in Redis for 60s

### API Endpoints

- `GET /api/todos` → List todos (Redis cached)
- `POST /api/todos` → Add todo: `{ "text": "Your task" }`
- `DELETE /api/todos/:id` → Delete todo by id

### Local Development (API)

1. Prerequisites: Node.js 16+, SQL Server reachable, Redis reachable
2. Install deps:
   ```bash
   cd node-api
   npm install
   ```
3. Set env vars:
   ```bash
   $env:DB_HOST="localhost"       # or your SQL Server DNS
   $env:DB_USER="sa"
   $env:DB_PASSWORD="<your_sa_password>"
   $env:REDIS_PASSWORD="<your_redis_password>"
   ```
4. Run:
   ```bash
   node index.js
   # API at http://localhost:5000
   ```

## Frontend (todo-list)

- Built with Create React App
- Served by NGINX in container
- Build-time env var: `REACT_APP_API_URL` (used in Dockerfile)

### Local Development (UI)

1. Prerequisites: Node.js 16+
2. Install deps:
   ```bash
   cd todo-list
   npm install
   ```
3. Start dev server:
   ```bash
   npm start
   # UI at http://localhost:3000
   ```
4. Configure API URL in the app (during development CRA proxy or direct axios base URL may be used). If using environment var in a local build:
   ```bash
   $env:REACT_APP_API_URL="http://localhost:5000"
   npm run build
   ```

## Container Images

- Backend image listens on `5000` (see `node-api/Dockerfile`)
- Frontend image listens on `80` (see `todo-list/Dockerfile`)

### Build & Push (example with Azure Container Registry)

Replace `k8sdemoproject.azurecr.io` with your ACR, and tag versions as needed.

```bash
# Backend
cd node-api
az acr login --name k8sdemoproject
docker build -t k8sdemoproject.azurecr.io/node-api:latest .
docker push k8sdemoproject.azurecr.io/node-api:latest

# Frontend
cd ../todo-list
az acr login --name k8sdemoproject
docker build --build-arg REACT_APP_API_URL="/api" -t k8sdemoproject.azurecr.io/react-ui:latest .
docker push k8sdemoproject.azurecr.io/react-ui:latest
```

Update the image tags in the manifests under `k8s/` if you use different tags.

## Kubernetes Manifests (k8s/)

Key files:
- `namespace.yaml` → Namespace `todo-app`
- `mssql-deployment.yaml` + `mssql-service.yaml` + `mssql-pvc.yaml` → SQL Server
- `mssql-secret.yaml` → SA password and DB connection values
- `redis-deployment.yaml` + `redis-service.yaml` + `redis-secret.yaml` → Redis
- `api-deployment.yaml` + `api-service.yaml` → Node API
- `ui-deployment.yaml` + `ui-service.yaml` → React UI
- `todo-app-ingress.yaml` → Ingress routing `/api` to API and `/` to UI

### Create AKS Namespace and Apply Manifests

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mssql-secret.yaml
kubectl apply -f k8s/redis-secret.yaml
kubectl apply -f k8s/mssql-pvc.yaml
kubectl apply -f k8s/mssql-deployment.yaml
kubectl apply -f k8s/mssql-service.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/redis-service.yaml
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/api-service.yaml
kubectl apply -f k8s/ui-deployment.yaml
kubectl apply -f k8s/ui-service.yaml
kubectl apply -f k8s/todo-app-ingress.yaml
```

- Ensure an Ingress controller (e.g., NGINX) is installed in the cluster.
- The API connects to SQL Server using `DB_HOST` from `mssql-secret` (`mssql-service.todo-app.svc.cluster.local`).
- The API connects to Redis at service name `redis:6379` with `REDIS_PASSWORD` from `redis-secret`.

## Accessing the App

- Ingress routes:
  - `http://<ingress-host>/api` → Node API
  - `http://<ingress-host>/` → React UI
- For local cluster without a DNS host, use the Ingress controller service EXTERNAL-IP.

## Argo CD

This repo layout is Argo CD-friendly. Typical steps:

1. Create an Argo CD Application pointing to this repo path `k8s/` and the target namespace `todo-app`.
2. Set sync policy (manual or automated).
3. On sync, Argo CD applies the manifests above.

Example Application (reference only; adjust repo URL and paths):

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: todo-app
  namespace: argocd
spec:
  destination:
    namespace: todo-app
    server: https://kubernetes.default.svc
  project: default
  source:
    repoURL: <your_git_repo_url>
    targetRevision: HEAD
    path: k8s
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Security Notes

- The `k8s/mssql-secret.yaml` and `k8s/redis-secret.yaml` currently store credentials in base64/clear text for demo purposes. For production, use Kubernetes secrets sourced from a secure store (e.g., Azure Key Vault) and disable committing plain secrets.
- Restrict network access to SQL Server and Redis as needed; consider NetworkPolicies.

## Troubleshooting

- API not starting: verify SQL Server and Redis are reachable; check env vars.
- No todos returned: ensure DB/table creation ran; inspect API logs.
- CORS: In k8s, traffic should go via Ingress; for local dev, enable CORS as configured in `index.js`.
- Frontend cannot reach API: ensure `REACT_APP_API_URL` points to `/api` when served behind the same host via Ingress.

---

This README intentionally excludes the `helm/` folder until it is tested.
