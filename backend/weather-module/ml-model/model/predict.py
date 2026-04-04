"""
predict.py  (scikit-learn version)
Loads the trained MLP model + scaler, fetches latest 24 hours
from Open-Meteo, and returns 72-hour temperature forecast.
"""

import numpy as np
import pickle
import os
import requests
from datetime import datetime, timezone, timedelta

MODEL_DIR   = os.path.join(os.path.dirname(__file__), "saved_model")
MODEL_PATH  = os.path.join(MODEL_DIR, "weather_model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")

LOOKBACK      = 24
FORECAST      = 72
FEATURE_ORDER = ["temperature", "precipitation", "windspeed", "humidity"]


def fetch_recent_24h(lat: float, lon: float) -> list:
    """Fetch last 24 hours of observed weather from Open-Meteo."""
    now   = datetime.now(timezone.utc)
    start = (now - timedelta(hours=48)).strftime("%Y-%m-%d")
    end   = now.strftime("%Y-%m-%d")

    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude":   lat,
        "longitude":  lon,
        "start_date": start,
        "end_date":   end,
        "hourly": "temperature_2m,precipitation,windspeed_10m,relative_humidity_2m",
        "timezone":   "UTC",
    }
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    h = data["hourly"]
    records = []
    for i in range(len(h["time"])):
        records.append([
            h["temperature_2m"][i]       or 0.0,
            h["precipitation"][i]        or 0.0,
            h["windspeed_10m"][i]        or 0.0,
            h["relative_humidity_2m"][i] or 0.0,
        ])
    return records[-LOOKBACK:]


def predict_72h(lat: float, lon: float) -> list:
    """Return 72-hour temperature forecast as list of dicts."""
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("Model not trained. Run model/train_lstm.py first.")

    with open(MODEL_PATH, "rb")  as f: model  = pickle.load(f)
    with open(SCALER_PATH, "rb") as f: scaler = pickle.load(f)

    recent = fetch_recent_24h(lat, lon)
    if len(recent) < LOOKBACK:
        raise ValueError(f"Need {LOOKBACK} hours, got {len(recent)}")

    X_raw    = np.array(recent)
    X_scaled = scaler.transform(X_raw)
    X_input  = X_scaled.flatten().reshape(1, -1)   # (1, 96)

    y_scaled = model.predict(X_input)[0]           # (72,)

    temp_min = scaler.data_min_[0]
    temp_max = scaler.data_max_[0]
    temps    = y_scaled * (temp_max - temp_min) + temp_min

    base = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    return [
        {"time": (base + timedelta(hours=i + 1)).strftime("%Y-%m-%dT%H:%M"),
         "temperature": round(float(t), 2)}
        for i, t in enumerate(temps)
    ]


if __name__ == "__main__":
    print("🔮 Test prediction for Guwahati...")
    result = predict_72h(26.1445, 91.7362)
    for r in result[:6]:
        print(f"  {r['time']}  →  {r['temperature']}°C")
    print(f"  ... ({len(result)} total hours)")
