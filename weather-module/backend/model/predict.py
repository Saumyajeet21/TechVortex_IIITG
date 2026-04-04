"""
predict.py  (updated to match improved train_lstm.py with time features)

Input = flatten(24h × 6 features) + future_hour_sin(72) + future_hour_cos(72) = 288
"""

import numpy as np
import pickle, os, requests
from datetime import datetime, timezone, timedelta

MODEL_DIR   = os.path.join(os.path.dirname(__file__), "saved_model")
MODEL_PATH  = os.path.join(MODEL_DIR, "weather_model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
REPORT_PATH = os.path.join(MODEL_DIR, "accuracy_report.pkl")

LOOKBACK      = 24
FORECAST      = 72
FEATURES      = ["temperature", "precipitation", "windspeed", "humidity"]
ALL_FEATURES  = FEATURES + ["hour_sin", "hour_cos"]   # must match training order


def fetch_recent_24h(lat: float, lon: float) -> list:
    """Fetch last 24 hours from Open-Meteo archive (with timestamps)."""
    now   = datetime.now(timezone.utc)
    start = (now - timedelta(hours=48)).strftime("%Y-%m-%d")
    end   = now.strftime("%Y-%m-%d")

    resp = requests.get(
        "https://archive-api.open-meteo.com/v1/archive",
        params={
            "latitude": lat, "longitude": lon,
            "start_date": start, "end_date": end,
            "hourly": "temperature_2m,precipitation,windspeed_10m,relative_humidity_2m",
            "timezone": "UTC",
        },
        timeout=15,
    )
    resp.raise_for_status()
    h = resp.json()["hourly"]

    records = []
    for i in range(len(h["time"])):
        hour = int(h["time"][i][11:13])   # extract HH from "YYYY-MM-DDTHH:00"
        records.append({
            "temperature":  h["temperature_2m"][i]       or 0.0,
            "precipitation":h["precipitation"][i]         or 0.0,
            "windspeed":    h["windspeed_10m"][i]         or 0.0,
            "humidity":     h["relative_humidity_2m"][i]  or 0.0,
            "hour":         hour,
        })

    return records[-LOOKBACK:]


def predict_72h(lat: float, lon: float) -> list:
    """Return 72-hour temperature forecast as list of {time, temperature} dicts."""
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("Model not found. Run model/train_lstm.py first.")

    with open(MODEL_PATH, "rb")  as f: model  = pickle.load(f)
    with open(SCALER_PATH, "rb") as f: scaler = pickle.load(f)

    # ── Fetch recent 24h ──────────────────────────────────────────────────────
    recent = fetch_recent_24h(lat, lon)
    if len(recent) < LOOKBACK:
        raise ValueError(f"Need {LOOKBACK} hours, got {len(recent)}")

    # ── Build feature matrix with hour encoding ───────────────────────────────
    X_raw = np.array([
        [r["temperature"], r["precipitation"], r["windspeed"], r["humidity"],
         np.sin(2 * np.pi * r["hour"] / 24),
         np.cos(2 * np.pi * r["hour"] / 24)]
        for r in recent
    ])  # shape (24, 6)

    X_scaled  = scaler.transform(X_raw)     # (24, 6)
    past_flat = X_scaled.flatten()           # (144,)

    # ── Future hour time signals ──────────────────────────────────────────────
    base = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    future_hours = np.array([(base + timedelta(hours=i + 1)).hour for i in range(FORECAST)])
    fut_sin = np.sin(2 * np.pi * future_hours / 24)   # (72,)
    fut_cos = np.cos(2 * np.pi * future_hours / 24)   # (72,)

    # ── Construct full input (288 features) ───────────────────────────────────
    X_input = np.concatenate([past_flat, fut_sin, fut_cos]).reshape(1, -1)

    # ── Predict ───────────────────────────────────────────────────────────────
    y_scaled = model.predict(X_input)[0]   # (72,) scaled temperature

    temp_min = scaler.data_min_[0]
    temp_max = scaler.data_max_[0]
    temps    = y_scaled * (temp_max - temp_min) + temp_min

    return [
        {
            "time":        (base + timedelta(hours=i + 1)).strftime("%Y-%m-%dT%H:%M"),
            "temperature": round(float(t), 2),
        }
        for i, t in enumerate(temps)
    ]


def get_accuracy_report() -> dict:
    """Return cached accuracy metrics from last training run."""
    if not os.path.exists(REPORT_PATH):
        return {}
    with open(REPORT_PATH, "rb") as f:
        return pickle.load(f)


def compute_live_accuracy(lat: float, lon: float) -> dict:
    """
    Computes live, per-location accuracy by hindcasting:
      1. Fetch 120h (5 days) of actual Open-Meteo data for this lat/lon
      2. Use hours [0..24] as the lookback window → predict 72h
      3. Compare prediction[0..24] vs actual[24..48]
      4. Return MAE, RMSE, R², quality tier and actionable suggestion
    """
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("Model not found. Run model/train_lstm.py first.")

    with open(MODEL_PATH,  "rb") as f: model  = pickle.load(f)
    with open(SCALER_PATH, "rb") as f: scaler = pickle.load(f)

    # ── Fetch 5 days of past hourly data ──────────────────────────────────────
    now   = datetime.now(timezone.utc)
    start = (now - timedelta(days=5)).strftime("%Y-%m-%d")
    end   = now.strftime("%Y-%m-%d")

    resp = requests.get(
        "https://archive-api.open-meteo.com/v1/archive",
        params={
            "latitude": lat, "longitude": lon,
            "start_date": start, "end_date": end,
            "hourly": "temperature_2m,precipitation,windspeed_10m,relative_humidity_2m",
            "timezone": "UTC",
        },
        timeout=20,
    )
    resp.raise_for_status()
    h = resp.json()["hourly"]

    records = []
    for i in range(len(h["time"])):
        t  = h["temperature_2m"][i]
        p  = h["precipitation"][i]
        w  = h["windspeed_10m"][i]
        hu = h["relative_humidity_2m"][i]
        if None in (t, p, w, hu):
            continue
        records.append({
            "temperature":   float(t),
            "precipitation": float(p),
            "windspeed":     float(w),
            "humidity":      float(hu),
            "hour":          int(h["time"][i][11:13]),
        })

    if len(records) < 48:
        raise ValueError(f"Not enough data: only {len(records)} valid hours")

    # ── Lookback window: records[-48:-24] ─────────────────────────────────────
    lookback = records[-48:-24]   # 24 hours used as LSTM input
    actual   = records[-24:]      # next 24 hours used as ground truth

    # ── Scale lookback ────────────────────────────────────────────────────────
    X_raw = np.array([
        [r["temperature"], r["precipitation"], r["windspeed"], r["humidity"],
         np.sin(2 * np.pi * r["hour"] / 24),
         np.cos(2 * np.pi * r["hour"] / 24)]
        for r in lookback
    ])  # (24, 6)
    X_scaled  = scaler.transform(X_raw)
    past_flat = X_scaled.flatten()   # (144,)

    # ── Future hour signals starting from evaluation window ───────────────────
    start_hour = actual[0]["hour"]
    future_hours = np.array([(start_hour + i) % 24 for i in range(FORECAST)])
    fut_sin = np.sin(2 * np.pi * future_hours / 24)
    fut_cos = np.cos(2 * np.pi * future_hours / 24)

    X_input   = np.concatenate([past_flat, fut_sin, fut_cos]).reshape(1, -1)

    # ── Predict & denormalise ─────────────────────────────────────────────────
    y_scaled = model.predict(X_input)[0]   # (72,)
    t_min    = scaler.data_min_[0]
    t_max    = scaler.data_max_[0]
    pred_all = y_scaled * (t_max - t_min) + t_min

    # ── Evaluate against the 24h of actual data ───────────────────────────────
    n    = len(actual)
    pred = pred_all[:n]
    obs  = np.array([r["temperature"] for r in actual])

    mae  = float(np.mean(np.abs(pred - obs)))
    rmse = float(np.sqrt(np.mean((pred - obs) ** 2)))
    ss_res = float(np.sum((obs - pred) ** 2))
    ss_tot = float(np.sum((obs - np.mean(obs)) ** 2))
    r2   = 1.0 - ss_res / ss_tot if ss_tot > 1e-9 else 0.0

    # ── Quality tier + actionable suggestion ──────────────────────────────────
    if r2 >= 0.85 and mae <= 2.0:
        tier = "excellent"
        suggestion = (
            f"✅ Excellent forecast quality for this location (MAE {mae:.1f}°C, R² {r2*100:.0f}%). "
            "The model is well-calibrated here — predictions are highly reliable."
        )
    elif r2 >= 0.70:
        tier = "good"
        suggestion = (
            f"👍 Good confidence for this region (MAE {mae:.1f}°C, R² {r2*100:.0f}%). "
            f"Expect minor variations of ±{mae:.1f}°C. Temperature trends are reliable."
        )
    elif r2 >= 0.50:
        tier = "moderate"
        suggestion = (
            f"⚠️ Moderate accuracy for this location (MAE {mae:.1f}°C, R² {r2*100:.0f}%). "
            "The model was trained on a different climate zone. Use ±3°C as your confidence interval "
            "and cross-check with the Gemini AI analysis."
        )
    else:
        tier = "low"
        suggestion = (
            f"🔴 Lower accuracy detected for this region (MAE {mae:.1f}°C, R² {r2*100:.0f}%). "
            "This location's climate differs significantly from the training data (Gwalior). "
            "Strongly recommend enabling Gemini AI analysis for more reliable estimates. "
            "Consider retraining the model with local historical data for best results."
        )

    return {
        "mae_celsius":       round(mae, 3),
        "rmse_celsius":      round(rmse, 3),
        "r2_score":          round(r2, 4),
        "temp_min":          round(float(obs.min()), 1),
        "temp_max":          round(float(obs.max()), 1),
        "features":          ALL_FEATURES,
        "lookback":          LOOKBACK,
        "forecast":          FORECAST,
        "live":              True,
        "quality_tier":      tier,
        "suggestion":        suggestion,
        "evaluated_hours":   n,
    }


if __name__ == "__main__":
    print("🔮 Test prediction for Gwalior...")
    result = predict_72h(26.2183, 78.1828)
    print(f"\n{'─'*35}")
    print(f"  {'Time':<18}  Temp")
    print(f"{'─'*35}")
    for r in result[:24]:
        print(f"  {r['time']}   {r['temperature']}°C")
    print(f"  ... ({len(result)} total hours)")

    report = get_accuracy_report()
    if report:
        print(f"\n📊 Model accuracy: MAE={report['mae_celsius']}°C  RMSE={report['rmse_celsius']}°C  R²={report['r2_score']}")
