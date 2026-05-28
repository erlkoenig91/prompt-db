# Deployment

Anleitung für lokale Entwicklung, Docker Compose und Kubernetes – inklusive Images aus GitHub Actions.

## Umgebungen

| Umgebung | Compose-Datei | Images |
|----------|---------------|--------|
| Entwicklung | `docker-compose.yml` | Lokal gebaut |
| Produktion (Compose) | `docker-compose.prod.yml` | Registry-Tags |
| Kubernetes | `k8s/*.yaml` | Registry-Tags |

## Lokale Entwicklung

```bash
cp .env.example .env
# SECRET_KEY: openssl rand -hex 32

docker compose up --build
```

| Dienst | URL |
|--------|-----|
| Frontend | http://localhost |
| Frontend (HTTPS) | https://localhost (mit Zertifikaten in `certs/`) |
| Backend | http://localhost:8000 |
| API-Docs | http://localhost:8000/docs |

PostgreSQL ist auf Port `5432` erreichbar.

### HTTPS lokal aktivieren

Zertifikate nach `certs/tls.crt` und `certs/tls.key` legen, dann Stack neu starten:

```bash
docker compose up -d --build frontend
```

Ohne Zertifikate antwortet das Frontend nur per HTTP auf Port 80.

## Produktion mit Docker Compose

Voraussetzung: Images aus GHCR (siehe [ci-cd.md](./ci-cd.md)).

```bash
cp .env.example .env
```

Wichtige Variablen in `.env`:

```env
IMAGE_REGISTRY=ghcr.io/erlkoenig91
TAG=1.0.0
DATABASE_URL=postgresql+asyncpg://promptdb:<passwort>@postgres:5432/promptdb
SECRET_KEY=<openssl rand -hex 32>
ALLOW_REGISTRATION=true
CORS_ORIGINS=https://prompt-db.example.com
ENVIRONMENT=production
TRUST_PROXY_HEADERS=true
```

Start mit externer PostgreSQL oder ergänztem Postgres-Service:

```bash
docker compose -f docker-compose.prod.yml up -d
```

`docker-compose.prod.yml` erwartet die Images:

- `${IMAGE_REGISTRY}/prompt-db-backend:${TAG}`
- `${IMAGE_REGISTRY}/prompt-db-frontend:${TAG}`

## Kubernetes

### 1. Vorbereitung

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
```

`k8s/configmap.yaml` anpassen:

- `CORS_ORIGINS` → Frontend-URL
- `VITE_API_URL` → Backend-URL (Referenz für Dokumentation; Frontend-Image wird beim Build gebaked)

Secret aus Vorlage:

```bash
cp k8s/secret.example.yaml k8s/secret.yaml
# Werte setzen, Datei nicht committen
kubectl apply -f k8s/secret.yaml
```

### 2. ImagePullSecret (GHCR)

```bash
kubectl create secret docker-registry ghcr-registry \
  --docker-server=ghcr.io \
  --docker-username=erlkoenig91 \
  --docker-password=<github-pat-mit-read:packages> \
  -n prompt-db
```

In `k8s/backend.yaml` und `k8s/frontend.yaml` unter `spec.template.spec` ergänzen:

```yaml
imagePullSecrets:
  - name: ghcr-registry
```

Image-Zeilen (Platzhalter in den Manifesten):

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

Ingress-Hosts in `k8s/ingress.yaml` an die echte Domain anpassen.

### 4. Upgrade nach neuem Release

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

## Konfigurationsreferenz

### Backend

| Variable | Beschreibung |
|----------|--------------|
| `DATABASE_URL` | PostgreSQL async URL |
| `SECRET_KEY` | JWT-Signatur (min. 32 Zeichen Hex empfohlen) |
| `ALLOW_REGISTRATION` | `true`/`false` – Registrierung erlauben |
| `CORS_ORIGINS` | Kommaseparierte erlaubte Origins |
| `ENVIRONMENT` | `development` oder `production` |
| `TRUST_PROXY_HEADERS` | `true` hinter Ingress/Reverse Proxy |

### Frontend (Build-Zeit)

| Variable | Beschreibung |
|----------|--------------|
| `VITE_API_URL` | Backend-URL für API-Aufrufe und CSP `connect-src` |

Änderungen an `VITE_API_URL` erfordern einen **Neubau** des Frontend-Images.

## Health Checks

| Dienst | Endpoint |
|--------|----------|
| Backend Liveness | `GET /health` |
| Backend Readiness | `GET /ready` |
| Frontend | `GET /health` |

## Sicherheit (Checkliste)

- [ ] `SECRET_KEY` und DB-Passwörter nur als Secrets
- [ ] `ALLOW_REGISTRATION` nach Bedarf gesetzt
- [ ] CORS auf Frontend-Origin begrenzt
- [ ] TLS am Ingress / Reverse Proxy
- [ ] Registry-Zugang über PAT mit minimalen Rechten
- [ ] Swagger/ReDoc nur in `development` (automatisch deaktiviert in Prod)
