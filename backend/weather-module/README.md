# 🌦 WeatherAI — AI-Driven Climate Intelligence Module

> **Team:** TechVortex IIITG | **Branch:** `Saumyajeet` | **Module:** Weather

A real-time weather intelligence dashboard powered by an LSTM neural network, featuring live station data, interactive maps, and 72-hour AI-generated forecasts for Indian cities.

---

## 🚀 Features

| Feature | Description |
|---|---|
| 📡 **Live Weather** | Real-time data from OpenWeatherMap (station-accurate) |
| 🗺 **Interactive Map** | Leaflet map with temperature-coded city markers |
| 📊 **Weather Charts** | 24hr temperature, precipitation, wind & humidity graphs |
| 🤖 **AI Forecast** | 72-hour prediction using custom-trained MLP neural network |
| 🔔 **Smart Alerts** | Real-time notifications for extreme weather events |
| 🗄 **Data Persistence** | Hourly snapshots saved to Supabase PostgreSQL |

---

## 🏗 Architecture

```
weather-module/
├── frontend/               ← React + Vite dashboard
│   └── src/
│       ├── components/     ← WeatherMap, Charts, ForecastPanel, etc.
│       ├── services/       ← OpenMeteo, OpenWeatherMap, Supabase APIs
│       └── hooks/          ← useWeatherData (polling + state)
└── ml-model/               ← Python ML pipeline
    ├── data/fetch_data.py  ← Downloads 1yr historical data (OpenMeteo Archive)
    ├── model/
    │   ├── train_lstm.py   ← Trains MLP neural network (sklearn)
    │   └── predict.py      ← Generates 72hr forecast
    └── api/forecast_api.py ← FastAPI server serving predictions
```

---

## ⚙️ Tech Stack

**Frontend:** React 18, Vite, Recharts, Leaflet, react-hot-toast, Supabase JS  
**ML Model:** Python 3.11, scikit-learn (MLPRegressor), pandas, numpy  
**API Server:** FastAPI, Uvicorn  
**Data Sources:** OpenWeatherMap (current), Open-Meteo (hourly/archive), Supabase

---

## 🔧 Setup & Run

### 1. Frontend

```bash
cd weather-module/frontend
npm install

# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your API keys (see Environment Variables table below)

npm run dev
# → http://localhost:5173
```

### 2. ML Model + FastAPI

```bash
cd weather-module/ml-model

# Install dependencies
pip install -r requirements.txt

# Step 1: Download training data (1 year historical)
python data/fetch_data.py

# Step 2: Train the model (~2-5 min)
python model/train_lstm.py

# Step 3: Start prediction API
cd api
uvicorn forecast_api:app --reload --port 8000
# → http://localhost:8000/docs
```

### 3. Supabase (Database)

Run in your Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS weather_snapshots (
  id BIGSERIAL PRIMARY KEY, location TEXT,
  latitude FLOAT, longitude FLOAT,
  temperature FLOAT, windspeed FLOAT,
  precipitation FLOAT, weathercode INT,
  humidity FLOAT, fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weather_forecasts (
  id BIGSERIAL PRIMARY KEY, location TEXT,
  forecast_generated_at TIMESTAMPTZ DEFAULT NOW(),
  forecast_data JSONB
);
```

---

## 🔑 Environment Variables

Copy `frontend/.env.example` → `frontend/.env` and fill in:

| Variable | Description | Where to get it |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | supabase.com → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | supabase.com → Project Settings → API |
| `VITE_OWM_API_KEY` | OpenWeatherMap key | openweathermap.org/api (free tier) |
| `VITE_FORECAST_API_URL` | FastAPI server URL | `http://localhost:8000` (local) |

---

## 📡 API Endpoints

| Endpoint | Description |
|---|---|
| `GET /` | API status |
| `GET /predict?lat=26.14&lon=91.74` | 72-hour temperature forecast |
| `GET /health` | Model readiness check |
| `GET /docs` | Swagger UI |


