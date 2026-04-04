"""
forecast_api.py
FastAPI server exposing the LSTM weather forecast.
Run with:  uvicorn forecast_api:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import sys, os

# Add parent dir so we can import predict.py
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "model"))
from predict import predict_72h, get_accuracy_report, compute_live_accuracy
from gemini_forecast import get_gemini_analysis
import requests as http_requests

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# In-memory cache for live accuracy (keyed by rounded lat/lon, TTL = 1h)
import time as _time
_accuracy_cache: dict = {}
CACHE_TTL = 3600   # seconds

app = FastAPI(
    title="WeatherAI Forecast API",
    description="72-hour temperature forecast using LSTM model trained on Open-Meteo data",
    version="1.0.0",
)

# Allow React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "WeatherAI Forecast API is running 🌦", "version": "1.0.0"}


@app.get("/predict")
def get_forecast(
    lat: float = Query(..., description="Latitude", example=26.1445),
    lon: float = Query(..., description="Longitude", example=91.7362),
):
    """
    Returns a 72-hour hourly temperature forecast for the given coordinates.
    Uses LSTM model trained on Open-Meteo historical data.
    """
    try:
        forecast = predict_72h(lat, lon)
        return {
            "lat": lat,
            "lon": lon,
            "forecast_hours": len(forecast),
            "forecast": forecast,
        }
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Model not trained yet. Run model/train_lstm.py first.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    model_exists = os.path.exists(
        os.path.join(os.path.dirname(__file__), "..", "model", "saved_model", "weather_model.pkl")
    )
    return {
        "status": "ok",
        "model_ready": model_exists,
    }


@app.get("/accuracy")
def accuracy():
    """Return model accuracy metrics from last training run (global, training-time)."""
    report = get_accuracy_report()
    if not report:
        raise HTTPException(
            status_code=404,
            detail="No accuracy report found. Run model/train_lstm.py first."
        )
    return report


@app.get("/live-accuracy")
def live_accuracy(
    lat: float = Query(..., description="Latitude",  example=26.2183),
    lon: float = Query(..., description="Longitude", example=78.1828),
):
    """
    Returns live, per-location accuracy by hindcasting the LSTM model
    against the last 24h of real Open-Meteo observations.
    Cached per location for 1 hour.
    """
    # Round to 0.25° grid for cache key
    key = (round(lat * 4) / 4, round(lon * 4) / 4)
    cached = _accuracy_cache.get(key)
    if cached and (_time.time() - cached["_ts"]) < CACHE_TTL:
        return cached

    try:
        result = compute_live_accuracy(lat, lon)
    except FileNotFoundError:
        raise HTTPException(503, "Model not trained. Run model/train_lstm.py first.")
    except Exception as e:
        # Fallback to static training accuracy
        report = get_accuracy_report()
        if report:
            return {
                **report,
                "live": False,
                "quality_tier": "unknown",
                "suggestion": f"⚠️ Live accuracy unavailable ({e}). Showing training-time metrics.",
            }
        raise HTTPException(500, str(e))

    result["_ts"] = _time.time()
    _accuracy_cache[key] = result
    return result


@app.get("/predict-enhanced")
def get_enhanced_forecast(
    lat:  float = Query(..., description="Latitude",  example=26.1445),
    lon:  float = Query(..., description="Longitude", example=91.7362),
    city: str   = Query("Unknown", description="City name for Gemini context"),
):
    """
    Enhanced 72-hour forecast:
    1. Runs the LSTM model
    2. Fetches current weather from Open-Meteo
    3. Sends both to Gemini for validation, narrative, and comparison
    Returns: LSTM predictions + Gemini analysis side-by-side
    """
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured on server.")

    # ── Step 1: LSTM forecast ──────────────────────────────────────────────────
    try:
        lstm_forecast = predict_72h(lat, lon)
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Model not trained. Run train_lstm.py first.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LSTM error: {e}")

    # ── Step 2: Current weather from Open-Meteo ──────────────────────────────
    try:
        r = http_requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat, "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,windspeed_10m,weathercode,apparent_temperature",
                "timezone": "auto",
            },
            timeout=10,
        )
        c = r.json().get("current", {})
        current_weather = {
            "temperature": c.get("temperature_2m", "N/A"),
            "feelsLike":   c.get("apparent_temperature", "N/A"),
            "humidity":    c.get("relative_humidity_2m", "N/A"),
            "windspeed":   c.get("windspeed_10m", "N/A"),
            "description": "Current conditions",
        }
    except Exception:
        current_weather = {}

    # ── Step 3: Gemini analysis ───────────────────────────────────────────────
    try:
        gemini = get_gemini_analysis(city, lat, lon, lstm_forecast, current_weather)
    except Exception as e:
        gemini = {
            "narrative":  f"Gemini analysis unavailable: {e}",
            "confidence": None,
            "events":     [],
            "validation": "N/A",
            "gemini_24h": [],
        }

    # ── Step 4: Build comparison (LSTM vs Gemini for first 24h, every 3hrs) ──
    lstm_24h = [
        {"time_label": f"+{(i+1)*3}h", "lstm_temp": h["temperature"], "time": h["time"]}
        for i, h in enumerate(lstm_forecast[2::3][:8])   # 8 points × 3h = 24h
    ]
    for i, pt in enumerate(lstm_24h):
        if i < len(gemini.get("gemini_24h", [])):
            pt["gemini_temp"] = gemini["gemini_24h"][i].get("temperature")

    return {
        "city":           city,
        "lat":            lat,
        "lon":            lon,
        "lstm_forecast":  lstm_forecast,
        "current_weather": current_weather,
        "gemini": {
            "narrative":  gemini.get("narrative", ""),
            "confidence": gemini.get("confidence"),
            "validation": gemini.get("validation", ""),
            "events":     gemini.get("events", []),
        },
        "comparison_24h": lstm_24h,
    }
