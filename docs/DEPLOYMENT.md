# docs/DEPLOYMENT.md — VayuSaathi Deployment Guide
> Version: 2.0.0 | Stage: V2-28 | Authority: DEP-001 to DEP-004

This document describes the local standalone build and container deployment shape. No hosted deployment is currently claimed; validate platform-specific settings before release.

---

## 1. Deployment Architecture

VayuSaathi is packaged as an Alpine Docker container running Next.js standalone output on Node 24.

```
                    ┌────────────────────────────┐
                    │      Cloud Load Balancer   │
                    │   (TLS Termination, CDN)   │
                    └──────────────┬─────────────┘
                                   │ HTTPS :443
                                   ▼
                    ┌────────────────────────────┐
                    │     Docker Container       │
                    │   User: nextjs (UID 1001)  │
                    │   Port: 3000 (HTTP)        │
                    │   Healthcheck: /api/health │
                    └──────────────┬─────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   Open-Meteo Air Quality & Geocoding             Groq Chat Completions API (openai/gpt-oss-120b)
   (Free public REST API, keyless)            (Optional, server-only key)
```

### Key Architectural Invariants
1. **Unprivileged Execution**: The Docker runner uses the non-root user `nextjs` (UID 1001, GID 1001).
2. **Standalone Output**: Only bundled runtime assets in `.next/standalone` and static chunks in `.next/static` are packaged. Total image size is ~180 MB.
3. **Zero Secrets in Image**: Build does not accept or bake secret arguments or environment files.
4. **Deterministic Boot**: If `GROQ_API_KEY` is omitted, the service boots cleanly in deterministic Basic Mode.
5. **Environment Injection**: Production hosts (Cloud Run, Render, Docker) must inject environment variables directly via platform config/secrets. Locally, `npm start` uses `--env-file-if-exists=.env.local --env-file-if-exists=.env` for convenience.

---

## 2. Environment Variables Reference (NFR-003, DEP-003)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | No | `production` | Node.js runtime environment |
| `PORT` | No | `3000` | Port for the standalone server |
| `APP_ORIGIN` | No | `http://localhost:3000` | Base URL for CORS and absolute URL formation |
| `LOG_LEVEL` | No | `info` | Logging verbosity (`debug`, `info`, `warn`, `error`) |
| `AQ_PROVIDER` | No | `waqi` | Provider selection (validated in `src/server/config/env.ts`) |
| `RATE_LIMIT_PLAN` | No | `6` | Plan generation requests per minute per IP (`RATE_LIMITS.planPerMinute`) |
| `RATE_LIMIT_AQI` | No | `30` | Air quality requests per minute per IP (`RATE_LIMITS.airQualityPerMinute`) |
| `RATE_LIMIT_GEOCODE` | No | `30` | Geocoding requests per minute per IP (`RATE_LIMITS.geocodePerMinute`) |
| `TRUSTED_PROXY_HEADER` | No | unset | Optional trusted-proxy header for client identification; configure only behind a trusted proxy |
| `CLIENT_IP_SALT` | No | Random UUID per process | Salt for SHA-256 IP hashing |
| `GROQ_API_KEY` | Optional | `undefined` | Groq API key for AI narration. If absent, the app falls back to the deterministic rules engine |
| `GROQ_MODEL` | No | `openai/gpt-oss-120b` | Groq model identifier for AI narration |
| `LLM_ENABLED` | No | `true` | Master toggle for LLM narration |
| `LLM_DAILY_CALL_CAP`| No | `1000` | Daily budget circuit breaker for LLM invocations |

---

## 3. Local Container Build & Run (DEP-001)

### Building the Image
```bash
docker build -t vayusaathi:v2.0.0 .
```

### Running with Zero Keys (Basic Mode)
```bash
docker run -d \
  --name vayusaathi \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  vayusaathi:v2.0.0
```

### Running with Groq AI Key (Copilot AI Enabled)
```bash
docker run -d \
  --name vayusaathi \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e GROQ_API_KEY="your_groq_api_key_here" \
  -e LOG_LEVEL=info \
  vayusaathi:v2.0.0
```

---

## 4. Cloud Deployment Blueprints

### 4.1 Google Cloud Run Deployment
```bash
# 1. Build and push image to Google Artifact Registry
gcloud builds submit --tag gcr.io/$PROJECT_ID/vayusaathi:latest

# 2. Deploy to Cloud Run with unauthenticated access and autoscaling
gcloud run deploy vayusaathi \
  --image gcr.io/$PROJECT_ID/vayusaathi:latest \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production,LOG_LEVEL=info" \
  --set-secrets "GROQ_API_KEY=vayusaathi-groq-key:latest"
```

### 4.2 Render Container Service
1. Connect GitHub repository in Render Dashboard.
2. Select **Web Service** with **Docker** runtime.
3. Configure Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
   - `GROQ_API_KEY`: *(Secure Secret)*
4. Set Health Check Path: `/api/health`.

---

## 5. Verification & Smoke Testing (REL-003, DEP-001)

Build and run the image or standalone server before smoke testing. Container execution has not been verified by this document.

```bash
node scripts/smoke.mjs
```

The smoke script checks the server at its configured base URL. Record the actual result for the release; do not treat this example command as evidence of a completed deployment or rollback rehearsal.
