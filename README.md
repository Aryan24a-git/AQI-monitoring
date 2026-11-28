# VayuSaathi (वायु साथी) 🌬️

> **Actionable, privacy-first winter smog resilience companion for Indian households and communities.**  
> Moving families from passive AQI panic to practical physical engineering, safe ventilation windows, and collective clean air action.

[![GitHub](https://img.shields.io/badge/GitHub-Aryan24a--git%2FAQI--monitoring-181717?logo=github)](https://github.com/Aryan24a-git/AQI-monitoring)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black?logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24%20LTS-339933?logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%205.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Groq AI](https://img.shields.io/badge/Groq-openai--gpt--oss--120b-F55036?logo=groq)](https://groq.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🎯 The Problem

During winter smog across North and Eastern India (Delhi, Lucknow, Patna, Kolkata), particulate pollution regularly exceeds **300–500+ µg/m³ PM2.5**—the physiological equivalent of smoking 15–25 cigarettes a day.

Most air quality apps are **digital panic buttons**: they display a terrifying red number and tell users to "stay indoors". But ordinary families still commute, cook in unsealed homes, and cannot afford ₹15,000–₹35,000 commercial air purifiers for every room. Furthermore, well-intentioned common habits—such as dry broom sweeping (*jhadu*) or opening windows during morning thermal inversions—actually pull toxic particles directly into children's breathing zones.

---

## 💡 The Solution: VayuSaathi

**VayuSaathi** bridges atmospheric science and everyday household reality through a **Dual-Engine Architecture**:

1. **Physical Dispersion & Meteorology Engine**: Analyzes 24-hour diurnal wind speed and PM dispersion curves to calculate the exact **Safe Cross-Ventilation Window** (when midday solar convection dilutes surface smoke) and warns users before the **Evening Thermal Inversion** traps toxic exhaust at ground level.
2. **Grounded Groq AI (openai/gpt-oss-120b)**: Translates CPCB National AQI sub-indices into hyper-local, empathetic guidance tailored to household vulnerabilities (infants, asthmatics, seniors) and budget tiers (from ₹0 habit swaps to ₹2,000 DIY MERV-13 box-fan purifiers).
3. **Live Impact Meter**: Replaces vague suggestions with rough, cited estimates showing indoor exposure reduction (e.g. *-45% PM2.5*), cigarette-equivalents avoided, and community emissions averted.
4. **1-Click WhatsApp Community Broadcasts**: Generates ready-to-send bilingual (**English & हिन्दी**) morning bulletins for apartment societies, Resident Welfare Associations (RWAs), and school carpools.
5. **Privacy-first by design**: No accounts or logins. Your profile stays in your browser (localStorage). When AI is on, your question and the day's air data go to Groq; city names and rounded coordinates go to Open-Meteo and WAQI. No server-side user database.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    User["👤 Household User (Mobile / Desktop)"]
    SW["⚡ Service Worker (Offline Cache)"]
    LS["🔒 Browser LocalStorage (Zero Server Persistence)"]

    subgraph AppServer ["Next.js App Server (Node 24 Standalone)"]
        API["API Routes (/api/city-scenario, /api/air-quality, /api/playbook, /api/ask, /api/bulletin, /api/ready, /api/health)"]
        RateLimit["TokenBucket Limiter & Security Headers (Strict CSP)"]
        
        subgraph DomainEngine ["Domain Engine (src/domain)"]
            NAQI["CPCB NAQI & Safe Ventilation Window"]
            Emissions["Unified Emissions & Exposure Constants"]
            Playbook["Deterministic & AI Playbook Synthesizer"]
            Catalog["Curated Action Catalog (D1-D6 Rules)"]
        end
        
        LLMClient["Groq LLM Client (openai/gpt-oss-120b)"]
    end

    subgraph ExternalTelemetry ["Live Air Quality Providers"]
        WAQI["World Air Quality Index (WAQI Station Feed)"]
        OpenMeteo["Open-Meteo European Model (Hourly Forecasts)"]
        GroqAPI["Groq Chat Completions API"]
    end

    User <--> SW
    User <--> LS
    User <--> API
    API --> RateLimit
    RateLimit --> DomainEngine
    API --> OpenMeteo
    API --> WAQI
    API -.-> LLMClient
    LLMClient -.-> GroqAPI
```

---

## ✨ Key Features

| Feature | Description | Impact |
|---|---|---|
| **Safe Cross-Ventilation & Seal Window** | Diurnal curve algorithm identifying lowest-PM2.5 midday hours and evening seal hour | Prevents indoor CO₂ / VOC buildup while keeping peak smog out |
| **Budget-Tiered Playbook** | Actionable engineering from ₹0 (wet mopping, damp towel draft stopping) to ₹2,000 DIY box-fan filters | Accessible protection for low- and middle-income families |
| **Live Impact Meter** | Rough, cited estimates of % exposure cut, cigarettes avoided, and CO₂ saved | Helps families understand the value of daily habits |
| **Grounded AI Copilot** | Groq (openai/gpt-oss-120b) assistant with strict guardrails (zero medical claims, grounded numbers) | Plain English/Hinglish answers to household air quality questions |
| **Bilingual WhatsApp Generator** | Instant morning alert generator formatted for society and RWA groups (English + Hindi) | Spreads clean air practices across entire neighborhoods |
| **Privacy-first by design** | No accounts or logins. Profile stays in browser `localStorage`; coordinates are rounded to 2 decimals. | When AI is on, your question and the day's air data go to Groq; city names and rounded coordinates go to air data providers. |

---

## 🚀 Quickstart

### Prerequisites
- **Node.js**: `24.x` (matches the package engine and CI)
- **npm**: `10+`

### Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/Aryan24a-git/AQI-monitoring.git
cd AQI-monitoring

# 2. Install dependencies
npm ci

# 3. Configure environment variables
cp .env.example .env.local

# 4. (Optional) Add your Groq API Key in .env.local:
# GROQ_API_KEY=your_groq_api_key_here
# GROQ_MODEL=openai/gpt-oss-120b

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Zero-Key / Offline Fallback Mode

VayuSaathi is designed for resilience and **functions fully even without an AI API key**:
- If `GROQ_API_KEY` is not provided or rate-limited, the application seamlessly runs on its **deterministic rules engine** (`src/domain/playbookEngine.ts`).
- Upstream air quality automatically queries WAQI or Open-Meteo's open endpoints.
- If upstream networks fail, users can instantly enter manual AQI readings or use cached offline data.

---

## 🧪 Verification & Quality Suite

Every commit adheres to strict automated quality gates:

```bash
# Run full verification suite (Format, Lint, TypeScript, Knip, Madge, Vitest)
npm run check

# Run unit and integration tests
npm run test

# Run Playwright E2E integration test
npm run test:e2e

# Production build test (Next.js Standalone with Turbopack)
npm run build
```

---

## 📖 Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router (layout, page, API routes)
│   ├── catalog/             # Curated, scientific clean-air action catalog
│   ├── domain/              # Pure TypeScript business & atmospheric logic
│   │   ├── emissions.ts     # Unified emissions, exposure & conversion constants
│   │   ├── naqi.ts          # Official CPCB NAQI calculation & ventilation window
│   │   ├── playbookEngine.ts# Deterministic & AI playbook synthesizers
│   │   └── scenarios.ts     # Household profile definitions & impact models
│   ├── features/            # Modular React client UI components
│   │   ├── hero/            # Hero section, AQI badge, 24h dispersion chart
│   │   ├── playbook/        # Impact meter, checklist cards, AI explainer
│   │   ├── copilot/         # Grounded conversational assistant
│   │   ├── community/       # RWA WhatsApp generator, local action pinboard
│   │   └── profile/         # Drawer for vulnerability & housing settings
│   └── server/              # Server-only providers, LLM client, rate limiters
├── tests/
│   ├── unit/                # Unit tests for domain, math, and API routes
│   ├── integration/         # Security boundary & error handling tests
│   └── e2e/                 # End-to-end browser click-through specs
└── docs/                    # Architectural, security, and accessibility documentation
```

---

## ⚠️ Medical Disclaimer

VayuSaathi provides actionable physical engineering and environmental lifestyle recommendations. It does **not** provide medical diagnosis, clinical advice, or drug prescriptions. Individuals with severe chronic pulmonary conditions, acute asthma attacks, or chest pain should seek immediate professional medical assistance.

---

## 🔍 Honest Limitations

- **Air quality data**: NAQI calculations use Open-Meteo regional model concentrations (`pm2_5`, `pm10`, `no2`); when a WAQI station within 25 km and 3 hours is available, its reading is displayed separately as *Station AQI (US scale)*.
- **Impact estimates**: Exposure reduction %, cigarette equivalents, and CO₂/NOx savings are rough literature-based estimates with visible source notes, not clinical or sensor-verified measurements.
- **Device-local community state**: Saved ward pinboard reports, completed pledges, and household profile settings stay in your browser (`localStorage`) and are not synced to other devices or a server database.
- **AI consent**: Your question and the day's air quality data are sent to Groq (`openai/gpt-oss-120b`) only after you grant explicit consent (`Allow`), enforced both in the browser and by server routes (`aiConsent: true`).
- **Live demo**: No hosted demo URL is currently published. Run the app locally using the Quickstart steps above.
- **AI availability**: Live Groq responses require a valid server-side `GROQ_API_KEY`; deterministic guidance remains available without it. Live-provider behavior depends on upstream service availability.

## 📚 Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Security & Threat Model](./docs/SECURITY.md)
- [Accessibility](./docs/ACCESSIBILITY.md)
- [Sources & Evidence](./docs/SOURCES.md)
- [API Reference](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

---

## 🌐 Data Credits & Attribution

| Provider | Data Used | License / Terms |
|---|---|---|
| [Open-Meteo](https://open-meteo.com/) | Hourly PM2.5/PM10 forecasts, geocoding | [CC BY 4.0](https://open-meteo.com/en/terms) — attribution required |
| [World Air Quality Index Project](https://aqicn.org/) (WAQI) | Real-time station AQI readings | [Terms of service](https://aqicn.org/api/tos/) apply — data for display, not redistribution |
| [Groq](https://groq.com/) | AI narration via openai/gpt-oss-120b | Commercial API — questions and air data sent to Groq servers |

> **Privacy**: No accounts, no server-side user data. Your household profile stays in your browser. When AI is enabled, your question and the day's air data are sent to Groq.

---

## 📄 License

Licensed under the [MIT License](LICENSE). © 2026 VayuSaathi Contributors.
