<p align="center">
  <img src="logo.png" alt="Prompt DB Logo" width="192">
</p>

# Prompt DB

Persönliche Prompt-Datenbank mit Web-Oberfläche: Prompts mit Metadaten (Modell, Aufgabe, Tags, Sichtbarkeit) erstellen, privat speichern oder öffentlich teilen.

Repository: [github.com/erlkoenig91/prompt-db](https://github.com/erlkoenig91/prompt-db)

**Social Preview:** Bild für Link-Vorschauen liegt unter [`.github/social-preview.png`](.github/social-preview.png) (1280×640). Einmalig unter *Settings → General → Social preview* hochladen.

[![CI](https://github.com/erlkoenig91/prompt-db/actions/workflows/ci.yml/badge.svg)](https://github.com/erlkoenig91/prompt-db/actions/workflows/ci.yml)
[![License: Non-Commercial](https://img.shields.io/badge/License-Non--Commercial-orange.svg)](LICENSE)

## Dokumentation

| Thema | Datei |
|-------|-------|
| Architektur & API | [docs/architecture.md](docs/architecture.md) |
| CI/CD & Container-Versionierung | [docs/ci-cd.md](docs/ci-cd.md) |
| Deployment (Compose, Kubernetes) | [docs/deployment.md](docs/deployment.md) |

## Schnellstart (Docker Compose)

```bash
cp .env.example .env
# SECRET_KEY setzen: openssl rand -hex 32

docker compose up --build
```

| Dienst | URL |
|--------|-----|
| Frontend | http://localhost (Port 80) |
| Frontend (TLS) | https://localhost (Port 443, Zertifikate in `./certs/`) |
| Backend API | http://localhost:8000 |
| API Docs (Dev) | http://localhost:8000/docs |

## Version

Die aktuelle Version steht in [`VERSION`](VERSION) (aktuell **1.0.0**). Sie wird im Backend (`/health`, `/api/meta`), in der UI und in GitHub Releases verwendet.

Neue Version veröffentlichen:

```bash
# VERSION anpassen, committen, dann:
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

Bei Git-Tags baut die [Release-Pipeline](.github/workflows/release.yml) Container-Images und erstellt ein GitHub Release.

## CI/CD (GitHub Actions)

| Workflow | Auslöser | Zweck |
|----------|----------|-------|
| [ci.yml](.github/workflows/ci.yml) | Push/PR auf `main` | Backend- und Frontend-Validierung |
| [release.yml](.github/workflows/release.yml) | Git-Tag `v*.*.*` | Images nach GHCR pushen + Release |

**Container-Registry:** `ghcr.io/erlkoenig91/prompt-db-backend` und `prompt-db-frontend`

Optional unter **Settings → Secrets and variables → Actions → Variables**:

```
VITE_API_URL=https://api.deine-domain.de
```

(leer lassen, wenn die API über den nginx-Proxy im Frontend-Container erreichbar ist)

Details: [docs/ci-cd.md](docs/ci-cd.md)

## Features

- Registrierung und Login mit JWT (Access + Refresh Token, Rotation)
- Prompts: Titel, Text, Beschreibung, Modell, Aufgabe, Tags, privat/öffentlich
- Suche mit Debounce, Aufgabenfilter, drei Ansichtsmodi (Liste, Kacheln, Kompakt)
- Kopieren-Button pro Prompt
- Rate Limiting auf Auth-Endpunkten
- Security Headers, Passwort-Policy, bcrypt-Hashing
- Health (`/health`) und Readiness (`/ready`) für Kubernetes

## Kubernetes

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
# k8s/secret.example.yaml → secret.yaml anpassen und anwenden
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

Image-Namen und Registry-Zugang: [docs/deployment.md](docs/deployment.md)

## Entwicklung lokal

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+asyncpg://promptdb:promptdb@localhost:5432/promptdb
export SECRET_KEY=dev-secret
alembic upgrade head
uvicorn app.main:app --reload

# Frontend (separates Terminal)
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

## Manuelle Image-Erstellung

```bash
export VITE_API_URL=https://api.deine-domain.de
./scripts/build-images.sh ghcr.io/erlkoenig91 1.0.0
```

## Lizenz

Open Source, **nicht-kommerziell**: Nutzung, Änderung und Weitergabe sind für private und nicht-kommerzielle Zwecke erlaubt. **Kommerzielle Nutzung** und **Relizenzierung** (Weitergabe unter anderer Lizenz oder als eigenes/zertifiziertes Produkt) sind ohne schriftliche Zustimmung nicht gestattet.

Details: [LICENSE](LICENSE) – Copyright (c) Julian Kramer
