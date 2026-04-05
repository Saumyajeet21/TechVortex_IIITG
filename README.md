# TechVortex IIITG — Climate and Ocean Intelligence Platform

TechVortex is a multi-module AI-powered climate intelligence dashboard built by Team TechVortex at IIIT Guwahati. The platform integrates coastal ocean monitoring, atmospheric weather analysis, a climate chatbot, a recovery simulator, and an ocean awareness learning hub into a single unified interface.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Module Descriptions](#module-descriptions)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [Port Reference](#port-reference)
- [API Endpoints](#api-endpoints)

---

## Architecture Overview

The platform follows a hub-and-spoke architecture. A central React frontend (Vite) at port 5173 acts as the unified shell with a persistent sidebar navigation. Each functional module runs as an independent full-stack service. The hub communicates with backend services over HTTP and embeds sub-frontends either as native React components or via iframe.

```
Browser (port 5173) — Central Hub
    |
    |-- Sidebar navigation
    |       |-- Dashboard (AtmoSense weather module)
    |       |-- ClimateBot (Flask chatbot)
    |       |-- Ocean Risk ML (FastAPI + React)
    |       |-- OceanGuard (FastAPI + React native component)
    |       |-- OceanIQ (Vite iframe, port 3001)
    |
    |-- Backend services
            |-- Weather AI API         port 8000  (FastAPI)
            |-- Ocean Risk ML API      port 8001  (FastAPI)
            |-- OceanGuard API         port 8002  (FastAPI)
            |-- ClimateBot             port 5000  (Flask)
```

User authentication is handled client-side with localStorage persistence. A login screen (name and phone number) gates access to the full dashboard.

---

## Module Descriptions

### Central Hub — weather-module/frontend
The main React application that boots at port 5173. Contains the global sidebar, login page, routing between modules, and the embedded OceanGuard panel as a native React component.

### AtmoSense — weather-module
A weather intelligence module with real-time atmospheric data, heatmaps, and AI-powered forecasting. Backend is a FastAPI service that calls Open-Meteo and OpenWeatherMap APIs.

### ClimateBot — chatbot
A conversational AI assistant powered by Groq's Llama 3.3 70B model. Users can ask questions about ocean science, cyclones, coastal safety, and climate topics. Built with Flask and uses the Groq API.

### Ocean Risk ML — backend + frontend
A FastAPI backend and React frontend for real-time ocean plastic and carbon risk analysis across Indian coastal zones. Uses a trained GradientBoosting model for plastic risk scoring.

### OceanGuard
An ocean plastic climate monitoring dashboard integrated directly into the central hub as a native React component. Fetches data from its own FastAPI backend (port 8002) which exposes endpoints for carbon absorption, plastic source attribution, economic damage cost, and recovery simulation across 12 Indian coastal zones.

Key features:
- 12 pre-defined Indian coastal zone cards with risk sorting and live search
- Overview tab: Vegetation and Water Health metrics (NDVI, Turbidity, Sea Surface Temperature), carbon absorption figures, and economic damage pricing (Voluntary Carbon Market, EU ETS, EPA Social Cost)
- Sources tab: Plastic source attribution breakdown (Shipping, River Runoff, Fishing Nets, Ocean Drift) with a stacked bar chart and recommended interventions
- Simulator tab: Recovery projection comparing "If We Act" vs "Do Nothing" scenarios based on configurable plastic reduction targets and time horizons

### OceanIQ — Learning Hub
An independent Vite-based React frontend at port 3001 embedded in the central hub via iframe. Provides ocean science education content, safety guidance, and government resource listings. Includes an AI chatbot powered by the ClimateBot backend.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Central frontend | React 18, Vite, vanilla CSS |
| OceanIQ frontend | React 18, Vite |
| Ocean Risk frontend | React (Create React App) |
| Weather AI backend | Python, FastAPI, Uvicorn |
| Ocean Risk ML backend | Python, FastAPI, scikit-learn |
| OceanGuard backend | Python, FastAPI, scikit-learn |
| ClimateBot | Python, Flask, Groq SDK |
| ML models | scikit-learn GradientBoostingRegressor, RandomForestRegressor |
| External APIs | Open-Meteo, OpenWeatherMap, Groq (Llama 3.3 70B), Nominatim |

---

## Project Structure

```
TechVortex_IIITG/
|
|-- weather-module/                 # AtmoSense weather + central hub
|   |-- frontend/                   # Central hub React app (port 5173)
|   |   |-- src/
|   |   |   |-- App.jsx             # Main routing and sidebar
|   |   |   |-- components/
|   |   |   |   |-- Sidebar.jsx
|   |   |   |   |-- OceanGuardPanel.jsx
|   |   |   |   |-- LoginPage.jsx
|   |   |-- .env                    # VITE_API_URL etc.
|   |-- backend/
|   |   |-- api/
|   |   |   |-- forecast_api.py     # Weather FastAPI (port 8000)
|   |   |-- .env
|
|-- backend/                        # Ocean Risk ML backend (port 8001)
|   |-- main.py
|   |-- .env
|
|-- frontend/                       # Ocean Risk ML frontend (port 3000)
|   |-- src/
|
|-- ocean gaurd/                    # OceanGuard module
|   |-- backend/                    # OceanGuard FastAPI (port 8002)
|   |   |-- main.py
|   |   |-- routers/
|   |   |   |-- carbon.py
|   |   |   |-- damage.py
|   |   |   |-- simulate.py
|   |   |   |-- source.py
|   |   |   |-- zones.py
|   |   |-- models/
|   |   |   |-- plastic_model.py
|   |   |   |-- carbon_model.py
|   |   |-- services/
|   |   |-- data/
|   |   |-- .env
|   |-- frontend/                   # Standalone Next.js UI (requires node_modules)
|
|-- chatbot/                        # ClimateBot Flask service (port 5000)
|   |-- app.py
|   |-- .env
|
|-- learning hub/
|   |-- ocean-iq/                   # OceanIQ Vite app (port 3001)
|   |   |-- src/
|   |   |   |-- components/
|   |   |   |   |-- LearningHub.jsx
|   |   |   |   |-- Chatbot.jsx
|   |   |   |   |-- SafetyGuidance.jsx
|   |   |   |   |-- GovHelp.jsx
```

---

## Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher and npm
- Git

Python packages (install per service):
```
fastapi uvicorn scikit-learn numpy pandas python-dotenv httpx
flask flask-cors groq
```

---

## Environment Variables

Each service requires a `.env` file. The `.env` files are excluded from version control. Create them manually in each service directory.

### weather-module/backend/.env
```
WEATHER_API_KEY=your_openweathermap_api_key
```

### weather-module/frontend/.env
```
VITE_WEATHER_API_KEY=your_openweathermap_api_key
```

### chatbot/.env
```
GROQ_API_KEY=your_groq_api_key
```

### ocean gaurd/backend/.env
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_google_gemini_api_key
```

### ocean gaurd/frontend/.env
```
NEXT_PUBLIC_API_URL=http://localhost:8002
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_api_key
NEXT_PUBLIC_GEMINI_KEY=your_google_gemini_api_key
```

### backend/.env (Ocean Risk ML)
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

---

## Running the Project

Open eight separate terminal windows and run the following commands. Services must be started before the frontend connects to them.

### Step 1 — Weather AI Backend (port 8000)
```bash
cd weather-module/backend/api
pip install fastapi uvicorn python-dotenv httpx
uvicorn forecast_api:app --port 8000 --reload
```

### Step 2 — Ocean Risk ML Backend (port 8001)
```bash
cd backend
pip install fastapi uvicorn scikit-learn numpy pandas python-dotenv
uvicorn main:app --port 8001 --reload
```

### Step 3 — OceanGuard Backend (port 8002)
```bash
cd "ocean gaurd/backend"
pip install fastapi uvicorn scikit-learn numpy pandas python-dotenv httpx
uvicorn main:app --port 8002 --reload
```

### Step 4 — ClimateBot (port 5000)
```bash
cd chatbot
pip install flask flask-cors groq python-dotenv
python app.py
```

### Step 5 — Ocean Risk ML Frontend (port 3000)
```bash
cd frontend
npm install
npm start
```

### Step 6 — OceanIQ Learning Hub (port 3001)
```bash
cd "learning hub/ocean-iq"
npm install
npm run dev
```

### Step 7 — Central Hub (port 5173)
```bash
cd weather-module/frontend
npm install
npm run dev
```

Open your browser at: http://localhost:5173

---

## Port Reference

| Port | Service | Directory |
|---|---|---|
| 5173 | Central Hub (main entry point) | weather-module/frontend |
| 3000 | Ocean Risk ML Frontend | frontend/ |
| 3001 | OceanIQ Learning Hub | learning hub/ocean-iq |
| 8000 | Weather AI API | weather-module/backend/api |
| 8001 | Ocean Risk ML API | backend/ |
| 8002 | OceanGuard API | ocean gaurd/backend |
| 5000 | ClimateBot Flask | chatbot/ |

---

## API Endpoints

### OceanGuard API (port 8002)

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/zones | List of all 12 monitored Indian coastal zones |
| POST | /api/plastic-risk | Plastic risk score for a lat/lon zone |
| POST | /api/carbon-absorption | Carbon absorption metrics including NDVI and sea surface temperature |
| POST | /api/damage-cost | Economic damage cost at voluntary, EU ETS, and EPA pricing |
| POST | /api/plastic-source | Source attribution breakdown (shipping, rivers, fishing, drift) |
| POST | /api/simulate | Recovery vs do-nothing projection for a given plastic reduction target |
| POST | /api/validate-coastal | Checks whether a lat/lon coordinate is within an Indian coastal zone |

All POST endpoints accept JSON with at minimum: `{ "lat": float, "lon": float, "radius_km": float }`

### Weather API (port 8000)

| Method | Endpoint | Description |
|---|---|---|
| GET | /forecast | Weather forecast for a location |
| GET | /marine | Marine and sea surface data |

### ClimateBot API (port 5000)

| Method | Endpoint | Description |
|---|---|---|
| POST | /get_response | Send a message and receive an AI response |

Request body: `{ "message": "your question here" }`

---

## Notes

- The `.env` files are excluded from this repository for security. You must create them manually as described above.
- The OceanGuard frontend at `ocean gaurd/frontend` is a Next.js application that requires its own `npm install`. Due to disk space constraints during development, this UI was reimplemented as a native React component inside the central hub (`weather-module/frontend/src/components/OceanGuardPanel.jsx`).
- The OceanIQ module must be running at port 3001 before navigating to it in the hub, as it is embedded via an iframe.
- All machine learning models train on first run using synthetic and mock data if no live cache exists. Model files (`.pkl`, `.joblib`) are excluded from version control.
