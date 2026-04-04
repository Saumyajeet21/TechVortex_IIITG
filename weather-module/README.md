# 🌤️ Weather Intelligence Dashboard

> **TechVortex IIITG** — AI-powered climate intelligence dashboard  
> Team member: **Saumyajeet**

A full-stack weather forecasting system combining an **LSTM (MLPRegressor) neural network** trained on 1 year of hourly Open-Meteo data, **Gemini AI** narrative analysis, an **interactive Leaflet map**, and live **AQI monitoring** — all wrapped in a premium dark-mode UI.

---

## 🚀 Features

| Feature | Description |
|---|---|
| 🤖 72-Hour LSTM Forecast | Trained on Gwalior data · MAE ~1.9°C · R² ~0.76 |
| 🧠 Gemini AI Analysis | Narrative forecast, confidence score, weather events & safety advice |
| 🗺️ Interactive Map | Real-time weather dots with Supabase-backed caching |
| 🌫️ AQI Monitor | Air quality index with health recommendations |
| 📡 Per-location Accuracy | Live hindcast accuracy recalculated for every searched city |
| ⚡ Credit-efficient | Gemini calls cached 6h per city in sessionStorage |

---

## 🗂️ Project Structure

```
weather-module/
├── frontend/          # React + Vite app
│   ├── src/
│   │   ├── components/    # WeatherDashboard, AIForecastPanel, MapView, AQIPanel...
│   │   ├── hooks/         # useWeatherData (data orchestration)
│   │   └── services/      # gemini.js, supabase.js, openmeteo.js
│   ├── .env.example       # Copy → .env and fill in your keys
│   └── package.json
│
└── backend/           # FastAPI + scikit-learn
    ├── api/
    │   ├── forecast_api.py      # Main API (predict, live-accuracy, Gemini)
    │   └── gemini_forecast.py   # Server-side Gemini integration
    ├── model/
    │   ├── train_lstm.py        # Retrain the model
    │   └── predict.py           # Inference + live accuracy hindcast
    ├── data/
    │   └── fetch_data.py        # Download training data from Open-Meteo
    ├── .env.example             # Copy → .env and add GEMINI_API_KEY
    └── requirements.txt
```

---

## ⚙️ Setup

### Prerequisites

- **Node.js** ≥ 18  
- **Python** ≥ 3.10  
- A free [Supabase](https://supabase.com) project  
- A free [Google AI Studio](https://aistudio.google.com/app/apikey) Gemini API key

---

### 1. Backend

```bash
cd weather-module/backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# → Open .env and add your GEMINI_API_KEY

# Download 1 year of training data (Gwalior)
python data/fetch_data.py

# Train the LSTM model (~5 min on CPU)
python model/train_lstm.py

# Start the API server
cd api
uvicorn forecast_api:app --port 8000
```

API is now live at **http://localhost:8000**  
Docs: **http://localhost:8000/docs**

---

### 2. Frontend

```bash
cd weather-module/frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# → Open .env and fill in:
#   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
#   VITE_GEMINI_API_KEY
#   VITE_FORECAST_API_URL=http://localhost:8000

# Start development server
npm run dev
```

App is now live at **http://localhost:5173**

---

### 3. Supabase Table (optional — for map caching)

Run this SQL in your Supabase project's SQL editor:

```sql
create table weather_snapshots (
  id          bigserial primary key,
  lat         float not null,
  lon         float not null,
  city_name   text,
  temperature float,
  humidity    int,
  windspeed   float,
  weathercode int,
  aqi         int,
  recorded_at timestamptz default now()
);
```

---

## 🔑 API Keys Needed

| Key | Where to get |
|---|---|
| `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` | [supabase.com](https://supabase.com) → Project Settings → API |
| `VITE_GEMINI_API_KEY` / `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `VITE_OWM_API_KEY` | Optional — [openweathermap.org](https://openweathermap.org/api) free tier |

---

## 🛠️ Tech Stack

**Frontend:** React 18, Vite, Recharts, Leaflet, Lucide React  
**Backend:** FastAPI, scikit-learn (MLPRegressor), Uvicorn  
**AI:** Google Gemini 2.0 Flash Lite  
**Data:** Open-Meteo API (free, no key required)  
**Database:** Supabase (PostgreSQL)  
