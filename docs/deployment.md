# Deployment

Guide for local development, Docker Compose, and Kubernetes — including images from GitHub Actions.

## Environments

| Environment | Compose file | Images |
|-------------|--------------|--------|
| Development | `docker-compose.yml` | Built locally |
| Production (Compose) | `docker-compose.prod.yml` | Registry tags |
| Kubernetes | `k8s/*.yaml` | Registry tags |

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

## Kubernetes

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

### 2. ImagePullSecret (GHCR)

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

### 3. Deploy

```bash
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

Adjust ingress hosts in `k8s/ingress.yaml` to your real domain.

For production clusters with nginx ingress and cert-manager, use `k8s/ingress-nginx.yaml` instead of `k8s/ingress.yaml`.

### 4. Upgrade after a new release

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
