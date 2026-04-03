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
from predict import predict_72h

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
