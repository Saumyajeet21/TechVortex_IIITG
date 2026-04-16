# 🌊 OceanGuard — Coastal Plastic Risk & Carbon Intelligence Platform

> AI-powered ocean monitoring system for detecting microplastic risk zones, estimating carbon absorption loss, and calculating economic damage along Indian coastlines.

---

## 📁 Project Structure

```
OceanGuard/
├── backend/                  # FastAPI Python backend
│   ├── main.py               # App entry point + CORS + lifespan
│   ├── requirements.txt      # Python dependencies
│   ├── Dockerfile            # Backend container
│   ├── models/               # ML models (XGBoost + Random Forest)
│   │   ├── plastic_model.py  # Plastic risk prediction (14 features)
│   │   └── carbon_model.py   # Carbon absorption model (12 features)
│   ├── routers/              # API route handlers
│   │   ├── zones.py          # GET /api/zones (12 monitored zones)
│   │   ├── plastic.py        # POST /api/plastic-risk
│   │   ├── carbon.py         # POST /api/carbon-absorption
│   │   ├── damage.py         # POST /api/damage-cost
│   │   ├── source.py         # POST /api/plastic-source
│   │   ├── simulate.py       # POST /api/simulate
│   │   └── improve.py        # POST /api/improve (Gemini AI)
│   ├── services/             # Core services
│   │   ├── data_fetcher.py   # Live ocean data (Open-Meteo, CMEMS, GFW)
│   │   ├── scheduler.py      # 3-hour auto-refresh for all 12 zones
│   │   ├── supabase_service.py # Supabase persistence layer
│   │   ├── gemini_service.py # Gemini 2.0 Flash AI suggestions
│   │   └── calculator.py     # Damage, attribution & simulation logic
│   └── data/                 # Zone cache + mock predictions
│
├── frontend/                 # Next.js 14 frontend
│   ├── app/                  # App router pages
│   │   ├── page.tsx          # Main dashboard
│   │   └── zones/[zoneId]/   # Zone detail page (Overview/Sources/Simulator)
│   ├── components/           # React components
│   │   ├── LocationAnalyzer.tsx   # Coastal search + AI analysis
│   │   ├── ZoneCard.tsx           # Zone summary card
│   │   ├── RecoverySimulator.tsx  # Recovery projection sliders
│   │   ├── SourceBreakdown.tsx    # Plastic source attribution
│   │   └── CarbonPriceDisplay.tsx # Carbon price tiers
│   ├── lib/
│   │   ├── zones.ts          # 12 zone definitions
│   │   └── api.ts            # Typed API client
│   └── public/               # Static assets
│
├── docker-compose.yml        # Full stack Docker setup
├── .env.example              # Environment variable template
└── README.md
```

---

## 🚀 Quick Start

### Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate        # Windows
pip install -r requirements.txt
# Copy .env.example → .env and fill in your keys
uvicorn main:app --reload --port 8000 --host 0.0.0.0
```

### Frontend
```bash
cd frontend
npm install
# Copy .env.example → .env.local and fill in your keys
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 🔑 Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon/service key |
| `GEMINI_API_KEY` | Google Gemini 2.0 Flash API key |
| `GOOGLE_MAPS_API_KEY` | Google Maps Geocoding API key |
| `COPERNICUS_USERNAME` | CMEMS username for ocean data |
| `COPERNICUS_PASSWORD` | CMEMS password |

### Frontend (`frontend/.env.local`)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend URL (default: http://localhost:8000) |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Google Maps key for geocoding |

---

## 🌊 Features

| Feature | Description |
|---|---|
| **12 Monitored Zones** | Real-time data for all major Indian coastal zones |
| **Plastic Risk ML** | XGBoost model (14 features, ~98% accuracy) |
| **Carbon Absorption ML** | Random Forest model (12 features, ~98% accuracy) |
| **Economic Damage** | Voluntary, EU ETS, and Social Cost pricing |
| **Source Attribution** | Shipping / river / fishing / drift breakdown |
| **Recovery Simulator** | Project ecosystem recovery with sliders |
| **AI Improvement Plan** | Gemini 2.0 Flash carbon credit suggestions |
| **Coastal Restriction** | Haversine-distance filter blocks inland searches |
| **Supabase Persistence** | All data auto-saved every 3 hours |

---

## 🗄️ Supabase Tables

| Table | Purpose |
|---|---|
| `zone_predictions` | ML predictions for all 12 zones (saved every 3h) |
| `custom_analyses` | User-triggered location searches |
| `model_logs` | Model training metrics (R², MAE) |

---

## 🛠️ Tech Stack

- **Backend**: FastAPI · Python · XGBoost · scikit-learn · APScheduler · Supabase · httpx
- **Frontend**: Next.js 14 · TypeScript · Tailwind CSS · Radix UI · Axios
- **AI**: Google Gemini 2.0 Flash (credit-saving cached mode)
- **Data**: Open-Meteo Marine API · Copernicus CMEMS · OpenStreetMap Overpass · Global Fishing Watch
