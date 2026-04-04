# Weather Intelligence Dashboard

> **TechVortex IIITG** — AI-powered climate intelligence dashboard  
> Team member: **Saumyajeet**

A full-stack weather forecasting system combining an LSTM (Multi-Layer Perceptron Regressor) neural network trained on 1 year of hourly Open-Meteo data, Gemini AI narrative analysis, an interactive Leaflet map, and live AQI monitoring. The application evaluates its own prediction accuracy in real-time.

---

## Features

- **72-Hour AI Forecast**: Trained specifically on Gwalior climate data. Evaluates live models (MAE: ~2.15 C). Uses sine/cosine temporal features to account for diurnal and seasonal variations.
- **Gemini AI Analysis**: Extracts actionable insights, computes a narrative forecast, and issues confidence scores and safety advice based on raw data inputs.
- **Interactive Map**: Presents real-time weather nodes using a frontend state management system backed by Supabase caching.
- **AQI Monitor**: Computes the Air Quality Index and supplies health recommendations based on Indian CPCB guidelines.
- **Bias Correction**: The backend calculates a dynamic real-time offset by hindcasting past 48 hours to dynamically align predictions with localized, short-term climate anomalies.

---

## Project Structure

```
weather-module/
├── frontend/          # React + Vite application
│   ├── src/
│   │   ├── components/    # WeatherDashboard, AIForecastPanel, MapView, AQIPanel
│   │   ├── hooks/         # useWeatherData (data orchestration and API merging)
│   │   └── services/      # gemini.js, supabase.js, openmeteo.js
│   ├── .env.example       # Example variables for the React build
│   └── package.json
│
└── backend/           # FastAPI + Scikit-Learn
    ├── api/
    │   ├── forecast_api.py      # Main API (predict, live-accuracy)
    │   └── gemini_forecast.py   # Server-side Gemini AI orchestration
    ├── model/
    │   ├── train_lstm.py        # Retrain the MLP model
    │   └── predict.py           # Inference + live accuracy hindcasting
    ├── data/
    │   └── fetch_data.py        # Script to download training data
    ├── .env.example             # Backend environment template
    └── requirements.txt
```

---

## Setup Requirements

- **Node.js** v18 or higher
- **Python** v3.10 or higher
- **Supabase** account (Free tier)
- **Google AI Studio** Gemini API key (Free tier)

---

## Installation & Deployment

### 1. Backend Server

```bash
cd weather-module/backend

# Install required mathematical and server dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and insert your GEMINI_API_KEY

# Prepare the data pipeline (Download 1 year of training data for Gwalior)
python data/fetch_data.py

# Train the Neural Network model on CPU
python model/train_lstm.py

# Launch the FastAPI server
cd api
uvicorn forecast_api:app --port 8000
```
*The backend API will be running at http://localhost:8000*  
*Swagger Documentation available at http://localhost:8000/docs*

---

### 2. Frontend React Client

```bash
cd weather-module/frontend

# Install node dependencies
npm install

# Configure environment keys
cp .env.example .env
# Open the .env file and define:
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
# VITE_GEMINI_API_KEY
# VITE_FORECAST_API_URL=http://localhost:8000

# Start the Vite development server
npm run dev
```
*The application will initialize at http://localhost:5173*

---

### 3. Supabase Schema (For Map Caching)

Deploy the following SQL schema in your Supabase project's SQL editor to enable distributed caching:

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

## Technical Stack

**Frontend Layer:** React 18, Vite, Recharts, Leaflet, Lucide React  
**Backend Layer:** Python, FastAPI, Scikit-Learn (MLPRegressor), Numpy, Uvicorn  
**Artificial Intelligence:** Google Gemini 2.0 Flash Lite  
**Data Infrastructure:** Open-Meteo API (High-resolution numerical models)  
**Database Persistence:** Supabase (PostgreSQL)
