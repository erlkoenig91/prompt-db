<p align="center">
  <img src="logo.png" alt="Prompt DB Logo" width="192">
</p>

# Prompt DB

Personal prompt database with a web UI: create prompts with metadata (model, task, tags, visibility), keep them private, or share them publicly.

Repository: [github.com/erlkoenig91/prompt-db](https://github.com/erlkoenig91/prompt-db)

## Screenshots

### Prompt overview

Search, filters, and list view with copy button.

![Prompt overview](docs/examples/overview.png)

### Statistics

Public prompts: most copied entries and new prompts over time.

![Statistics dashboard](docs/examples/statics.png)

### Settings

Personal preferences, password change, and global application settings (admin).

![Settings](docs/examples/settings.png)

### User management

Admin UI for managing accounts, roles, and status.

![User management](docs/examples/usermanagement.png)

**Social preview:** Link preview image at [`.github/social-preview.png`](.github/social-preview.png) (1280×640). Upload once under *Settings → General → Social preview*.

[![CI](https://github.com/erlkoenig91/prompt-db/actions/workflows/ci.yml/badge.svg)](https://github.com/erlkoenig91/prompt-db/actions/workflows/ci.yml)
[![License: Non-Commercial](https://img.shields.io/badge/License-Non--Commercial-orange.svg)](LICENSE)

## Documentation

| Topic | File |
|-------|------|
| Architecture & API | [docs/architecture.md](docs/architecture.md) |
| CI/CD & container versioning | [docs/ci-cd.md](docs/ci-cd.md) |
| Deployment (Compose, Kubernetes) | [docs/deployment.md](docs/deployment.md) |

## Quick start (Docker Compose)

```bash
cp .env.example .env
# Set SECRET_KEY: openssl rand -hex 32

docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost (port 80) |
| Frontend (TLS) | https://localhost (port 443, certificates in `./certs/`) |
| Backend API | http://localhost:8000 |
| API docs (dev) | http://localhost:8000/docs |

## Version

The current version is in [`VERSION`](VERSION) (currently **1.0.7**). It is used in the backend (`/health`, `/api/meta`), the UI, and GitHub Releases.

Publish a new version:

```bash
# Update VERSION, commit, then:
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

Git tags trigger the [release pipeline](.github/workflows/release.yml) to build container images and create a GitHub Release.

## CI/CD (GitHub Actions)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| [ci.yml](.github/workflows/ci.yml) | Push/PR to `main` | Backend and frontend validation |
| [release.yml](.github/workflows/release.yml) | Git tag `v*.*.*` | Push images to GHCR + release |

**Container registry:** `ghcr.io/erlkoenig91/prompt-db-backend` and `prompt-db-frontend`

Optional under **Settings → Secrets and variables → Actions → Variables**:

```
VITE_API_URL=https://api.your-domain.com
```

(leave empty if the API is reachable via the nginx proxy in the frontend container)

Details: [docs/ci-cd.md](docs/ci-cd.md)

## Features

- Registration and login with JWT (access + refresh token, rotation)
- Prompts: title, text, description, model, task, tags, private/public
- Search with debounce, task filter, three view modes (list, tiles, compact)
- Copy button per prompt with usage statistics
- Statistics dashboard for public prompts
- Settings: personal preferences and global app configuration (admin)
- User management: activate/deactivate accounts, roles, password reset (admin)
- UI languages: English and German (toggle in the header)
- Rate limiting on auth endpoints
- Security headers, password policy, bcrypt hashing
- Health (`/health`) and readiness (`/ready`) for Kubernetes

## Kubernetes

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
# Copy k8s/secret.example.yaml → secret.yaml, adjust values, then apply
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

Image names and registry access: [docs/deployment.md](docs/deployment.md)

## Local development

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+asyncpg://promptdb:promptdb@localhost:5432/promptdb
export SECRET_KEY=dev-secret
alembic upgrade head
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

## Manual image build

```bash
export VITE_API_URL=https://api.your-domain.com
./scripts/build-images.sh ghcr.io/erlkoenig91 1.0.0
```

## License

Open source, **non-commercial**: use, modification, and distribution are allowed for private and non-commercial purposes. **Commercial use** and **relicensing** (distribution under another license or as a certified product) require written permission.

Details: [LICENSE](LICENSE) – Copyright (c) Julian Kramer
