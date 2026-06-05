# Deployment

Guide for local development, Docker Compose, and Kubernetes — including images from GitHub Actions.

## Environments

| Environment | Compose file | Images / Charts |
|-------------|--------------|-----------------|
| Development | `docker-compose.yml` | Built locally |
| Production (Compose) | `docker-compose.prod.yml` | Registry tags |
| Kubernetes (manifests) | `k8s/*.yaml` | Registry tags |
| Kubernetes (Helm) | `helm/prompt-db` | Registry tags + [Helm repo](https://erlkoenig91.github.io/prompt-db) |

## Local development

```bash
cp .env.example .env
# SECRET_KEY: openssl rand -hex 32

docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| Frontend (HTTPS) | https://localhost (with certificates in `certs/`) |
| Backend | http://localhost:8000 |
| API docs | http://localhost:8000/docs |

PostgreSQL is reachable on port `5432`.

### Enable HTTPS locally

Place certificates at `certs/tls.crt` and `certs/tls.key`, then restart the stack:

```bash
docker compose up -d --build frontend
```

Without certificates, the frontend only serves HTTP on port 80.

## Production with Docker Compose

Prerequisite: images from GHCR (see [ci-cd.md](./ci-cd.md)).

```bash
cp .env.example .env
```

Important variables in `.env`:

```env
IMAGE_REGISTRY=ghcr.io/erlkoenig91
TAG=1.0.0
DATABASE_URL=postgresql+asyncpg://promptdb:<password>@postgres:5432/promptdb
SECRET_KEY=<openssl rand -hex 32>
ALLOW_REGISTRATION=true
CORS_ORIGINS=https://prompt-db.example.com
ENVIRONMENT=production
TRUST_PROXY_HEADERS=true
```

Start with external PostgreSQL or an added Postgres service:

```bash
docker compose -f docker-compose.prod.yml up -d
```

`docker-compose.prod.yml` expects these images:

- `${IMAGE_REGISTRY}/prompt-db-backend:${TAG}`
- `${IMAGE_REGISTRY}/prompt-db-frontend:${TAG}`

## Kubernetes (Helm)

Recommended for production. The chart is published automatically on each release tag to GitHub Pages and can be listed on [Artifact Hub](https://artifacthub.io).

### 1. Add the Helm repository

```bash
helm repo add prompt-db https://erlkoenig91.github.io/prompt-db
helm repo update
```

### 2. Install

```bash
helm install prompt-db prompt-db/prompt-db \
  -n prompt-db --create-namespace \
  --set secrets.postgresPassword='<password>' \
  --set secrets.secretKey='<openssl rand -hex 32>' \
  --set config.corsOrigins='https://prompt-db.example.com' \
  --set ingress.hosts.frontend='prompt-db.example.com' \
  --set ingress.hosts.api='api.prompt-db.example.com'
```

For clusters with **nginx ingress** and **cert-manager**:

```bash
helm install prompt-db prompt-db/prompt-db \
  -n prompt-db --create-namespace \
  -f helm/prompt-db/values-nginx.yaml \
  --set secrets.postgresPassword='<password>' \
  --set secrets.secretKey='<openssl rand -hex 32>'
```

### 3. ImagePullSecret (GHCR)

If images are private, create a pull secret and pass it to the chart:

```bash
kubectl create secret docker-registry ghcr-registry \
  --docker-server=ghcr.io \
  --docker-username=erlkoenig91 \
  --docker-password=<github-pat-with-read:packages> \
  -n prompt-db

helm upgrade prompt-db prompt-db/prompt-db \
  -n prompt-db \
  --set imagePullSecrets[0].name=ghcr-registry
```

### 4. Upgrade after a new release

```bash
helm repo update
helm upgrade prompt-db prompt-db/prompt-db \
  -n prompt-db \
  --set backend.image.tag=1.1.0 \
  --set frontend.image.tag=1.1.0
```

When no explicit tag is set, the chart defaults to `Chart.appVersion` from the release.

### 5. External PostgreSQL

Disable the bundled database and provide a connection string:

```bash
helm install prompt-db prompt-db/prompt-db \
  -n prompt-db --create-namespace \
  --set postgresql.enabled=false \
  --set secrets.databaseUrl='postgresql+asyncpg://user:pass@db.example.com:5432/promptdb' \
  --set secrets.secretKey='<openssl rand -hex 32>'
```

### 6. Artifact Hub

After the first chart release (Git tag `v*.*.*`), register the repository on Artifact Hub:

1. Sign in at [artifacthub.io](https://artifacthub.io) → **Control Panel** → **Add repository**
2. Kind: **Helm charts**
3. URL: `https://erlkoenig91.github.io/prompt-db`
4. Copy the **repository ID** from the control panel
5. Uncomment and set `repositoryID` in [`helm/artifacthub-repo.yml`](../helm/artifacthub-repo.yml), commit, and push — the release pipeline republishes the file to `gh-pages`
6. Wait for the next Artifact Hub sync (verified publisher badge)

Verify locally before registering:

```bash
curl -fsSL https://erlkoenig91.github.io/prompt-db/index.yaml
helm repo add prompt-db https://erlkoenig91.github.io/prompt-db
helm search repo prompt-db
```

## Kubernetes (raw manifests)

Alternative without Helm — manifests in `k8s/`.

### 1. Preparation

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
```

Adjust `k8s/configmap.yaml`:

- `CORS_ORIGINS` → frontend URL
- `VITE_API_URL` → backend URL (reference for docs; frontend image is baked at build time)

Secret from template:

```bash
cp k8s/secret.example.yaml k8s/secret.yaml
# Set values; do not commit this file
kubectl apply -f k8s/secret.yaml
```

### 2. ImagePullSecret (GHCR, manifests)

```bash
kubectl create secret docker-registry ghcr-registry \
  --docker-server=ghcr.io \
  --docker-username=erlkoenig91 \
  --docker-password=<github-pat-with-read:packages> \
  -n prompt-db
```

Add under `spec.template.spec` in `k8s/backend.yaml` and `k8s/frontend.yaml`:

```yaml
imagePullSecrets:
  - name: ghcr-registry
```

Image lines (placeholders in manifests):

```yaml
image: ghcr.io/erlkoenig91/prompt-db-backend:1.0.0
```

### 3. Deploy (manifests)

```bash
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

Adjust ingress hosts in `k8s/ingress.yaml` to your real domain.

For production clusters with nginx ingress and cert-manager, use `k8s/ingress-nginx.yaml` instead of `k8s/ingress.yaml`.

### 4. Upgrade after a new release (manifests)

```bash
export REGISTRY=ghcr.io/erlkoenig91
export TAG=1.1.0

kubectl set image deployment/prompt-db-backend \
  backend=${REGISTRY}/prompt-db-backend:${TAG} -n prompt-db
kubectl set image deployment/prompt-db-frontend \
  frontend=${REGISTRY}/prompt-db-frontend:${TAG} -n prompt-db

kubectl rollout status deployment/prompt-db-backend -n prompt-db
kubectl rollout status deployment/prompt-db-frontend -n prompt-db
```

## Configuration reference

### Backend

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL async URL |
| `SECRET_KEY` | JWT signing (32+ hex characters recommended) |
| `ALLOW_REGISTRATION` | `true`/`false` – allow registration |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `ENVIRONMENT` | `development` or `production` |
| `TRUST_PROXY_HEADERS` | `true` behind ingress/reverse proxy |

### Frontend (build time)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL for API calls and CSP `connect-src` |

Changes to `VITE_API_URL` require a **rebuild** of the frontend image.

## Health checks

| Service | Endpoint |
|---------|----------|
| Backend liveness | `GET /health` |
| Backend readiness | `GET /ready` |
| Frontend | `GET /health` |

## Security checklist

- [ ] `SECRET_KEY` and DB passwords only as secrets
- [ ] `ALLOW_REGISTRATION` set as needed
- [ ] CORS limited to frontend origin
- [ ] TLS at ingress / reverse proxy
- [ ] Registry access via PAT with minimal scopes
- [ ] Swagger/ReDoc only in `development` (disabled automatically in prod)
