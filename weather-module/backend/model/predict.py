"""
predict.py

KEY FIXES vs previous version:
  1. Hour signals use IST (matching training data which was in IST)
     → fixes the ~5.5h diurnal phase shift
  2. Added day-of-year sin/cos signals (seasonal awareness)
     → fixes April under-prediction (model now knows it's hot season)
  3. Switched from archive API (lags 1-2 days) to forecast API (past_days)

Input shape: (24h × 8 features) + (4 future signals × 72) = 192 + 288 = 480
"""

import numpy as np
import pickle, os, requests
from datetime import datetime, timezone, timedelta

MODEL_DIR   = os.path.join(os.path.dirname(__file__), "saved_model")
MODEL_PATH  = os.path.join(MODEL_DIR, "weather_model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
REPORT_PATH = os.path.join(MODEL_DIR, "accuracy_report.pkl")

LOOKBACK     = 24
FORECAST     = 72
FEATURES     = ["temperature", "precipitation", "windspeed", "humidity"]
ALL_FEATURES = FEATURES + ["hour_sin", "hour_cos", "day_sin", "day_cos"]  # 8 features

IST_OFFSET   = timedelta(hours=5, minutes=30)


def _to_ist(utc_dt: datetime) -> datetime:
    """Convert UTC datetime to IST."""
    return utc_dt + IST_OFFSET


def _fetch_recent_hours(lat: float, lon: float, past_days: int = 2) -> list:
    """
    Fetch recent hourly observations using Open-Meteo forecast API (no archive lag).
    Returns records with IST hour + day-of-year for feature encoding.
    """
    resp = requests.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude":      lat,
            "longitude":     lon,
            "hourly":        "temperature_2m,precipitation,windspeed_10m,relative_humidity_2m",
            "past_days":     past_days,
            "forecast_days": 1,
            "timezone":      "UTC",
        },
        timeout=15,
    )
    resp.raise_for_status()
    h = resp.json()["hourly"]

    now_utc = datetime.now(timezone.utc)
    records = []
    for t_str, temp, prec, wind, humi in zip(
        h["time"],
        h["temperature_2m"],
        h["precipitation"],
        h["windspeed_10m"],
        h["relative_humidity_2m"],
    ):
        # Parse as UTC (the API returns UTC times when timezone=UTC)
        t_utc = datetime.fromisoformat(t_str).replace(tzinfo=timezone.utc)
        if t_utc > now_utc:
            break
        if None in (temp, prec, wind, humi):
            continue

        t_ist = _to_ist(t_utc)
        records.append({
            "temperature":   float(temp),
            "precipitation": float(prec),
            "windspeed":     float(wind),
            "humidity":      float(humi),
            "hour":          t_ist.hour,                       # IST hour (0-23)
            "day_of_year":   t_ist.timetuple().tm_yday,        # IST day (1-365)
        })

    return records[-LOOKBACK:]


def _build_X_raw(records: list) -> np.ndarray:
    """Build (N × 8) raw feature matrix matching training feature order."""
    return np.array([
        [
            r["temperature"], r["precipitation"], r["windspeed"], r["humidity"],
            np.sin(2 * np.pi * r["hour"]       / 24),
            np.cos(2 * np.pi * r["hour"]       / 24),
            np.sin(2 * np.pi * r["day_of_year"] / 365),
            np.cos(2 * np.pi * r["day_of_year"] / 365),
        ]
        for r in records
    ])  # shape (24, 8)


def _build_future_signals(base_utc: datetime) -> tuple:
    """
    Build future IST hour + day-of-year signals for all 72 forecast hours.
    Returns (fut_sin_h, fut_cos_h, fut_sin_d, fut_cos_d) each shape (72,).
    """
    future_ists = [_to_ist(base_utc + timedelta(hours=i + 1)) for i in range(FORECAST)]
    hours      = np.array([t.hour              for t in future_ists])
    days       = np.array([t.timetuple().tm_yday for t in future_ists])

    return (
        np.sin(2 * np.pi * hours / 24),
        np.cos(2 * np.pi * hours / 24),
        np.sin(2 * np.pi * days  / 365),
        np.cos(2 * np.pi * days  / 365),
    )


def _compute_bias_correction(lat: float, lon: float, model, scaler) -> float:
    """
    Compute systematic prediction offset by hindcasting over the past 48h.
    Uses direct API fetch (NOT _fetch_recent_hours which is capped at 24 records).
    Returns mean(actual - predicted), capped at ±8°C.
    """
    resp = requests.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude":      lat,
            "longitude":     lon,
            "hourly":        "temperature_2m,precipitation,windspeed_10m,relative_humidity_2m",
            "past_days":     3,
            "forecast_days": 1,
            "timezone":      "UTC",
        },
        timeout=15,
    )
    resp.raise_for_status()
    h = resp.json()["hourly"]

    now_utc = datetime.now(timezone.utc)
    records = []
    for t_str, temp, prec, wind, humi in zip(
        h["time"],
        h["temperature_2m"],
        h["precipitation"],
        h["windspeed_10m"],
        h["relative_humidity_2m"],
    ):
        t_utc = datetime.fromisoformat(t_str).replace(tzinfo=timezone.utc)
        if t_utc > now_utc:
            break
        if None in (temp, prec, wind, humi):
            continue
        t_ist = _to_ist(t_utc)
        records.append({
            "temperature":   float(temp),
            "precipitation": float(prec),
            "windspeed":     float(wind),
            "humidity":      float(humi),
            "hour":          t_ist.hour,
            "day_of_year":   t_ist.timetuple().tm_yday,
        })

    if len(records) < 48:
        print(f"⚠️  Bias correction: only {len(records)} records, skipping")
        return 0.0

    lookback_r = records[-48:-24]   # 24h input window
    actual_r   = records[-24:]      # ground truth to compare against

    X_raw     = _build_X_raw(lookback_r)
    past_flat = scaler.transform(X_raw).flatten()

    start_utc = now_utc.replace(minute=0, second=0, microsecond=0) - timedelta(hours=24)
    sh, ch, sd, cd = _build_future_signals(start_utc)

    X_input  = np.concatenate([past_flat, sh, ch, sd, cd]).reshape(1, -1)
    y_scaled = model.predict(X_input)[0]
    t_min, t_max = scaler.data_min_[0], scaler.data_max_[0]
    pred = y_scaled[:24] * (t_max - t_min) + t_min
    obs  = np.array([r["temperature"] for r in actual_r])

    bias = float(np.mean(obs - pred))
    print(f"📐 Bias: {bias:+.2f}C  (obs={obs.mean():.1f}  pred={pred.mean():.1f}  n={len(obs)})")
    return float(np.clip(bias, -8.0, 8.0))



def predict_72h(lat: float, lon: float) -> list:
    """Return 72-hour temperature forecast as list of {time, temperature, bias_applied}."""
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("Model not found. Run model/train_lstm.py first.")

    with open(MODEL_PATH,  "rb") as f: model  = pickle.load(f)
    with open(SCALER_PATH, "rb") as f: scaler = pickle.load(f)

    # ── Fetch recent 24h (lag-free, IST-encoded) ──────────────────────────────
    recent = _fetch_recent_hours(lat, lon, past_days=2)
    if len(recent) < LOOKBACK:
        raise ValueError(f"Need {LOOKBACK} hours of data, got {len(recent)}")

    # ── Build scaled past window ───────────────────────────────────────────────
    X_raw     = _build_X_raw(recent)
    past_flat = scaler.transform(X_raw).flatten()   # (192,)

    # ── Future IST hour + day-of-year signals ─────────────────────────────────
    base = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    sh, ch, sd, cd = _build_future_signals(base)

    # ── Predict (480 features) ────────────────────────────────────────────────
    X_input  = np.concatenate([past_flat, sh, ch, sd, cd]).reshape(1, -1)
    y_scaled = model.predict(X_input)[0]   # (72,)

    t_min = scaler.data_min_[0]
    t_max = scaler.data_max_[0]
    temps = y_scaled * (t_max - t_min) + t_min

    # ── Residual bias correction ───────────────────────────────────────────────
    try:
        bias = _compute_bias_correction(lat, lon, model, scaler)
    except Exception as e:
        print(f"⚠️  Bias correction skipped: {e}")
        bias = 0.0

    return [
        {
            "time":         (base + timedelta(hours=i + 1)).strftime("%Y-%m-%dT%H:%M"),
            "temperature":  round(float(t) + bias, 2),
            "bias_applied": round(bias, 2),
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
      1. Fetch 5 days of real data
      2. Use hours[-48:-24] as lookback → predict 72h
      3. Compare prediction[:24] vs actual[-24:]
      4. Return MAE, RMSE, R², tier and suggestion
    """
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("Model not found. Run model/train_lstm.py first.")

    with open(MODEL_PATH,  "rb") as f: model  = pickle.load(f)
    with open(SCALER_PATH, "rb") as f: scaler = pickle.load(f)

    records = _fetch_recent_hours(lat, lon, past_days=5)
    if len(records) < 48:
        raise ValueError(f"Not enough data: {len(records)} valid hours")

    lookback_r = records[-48:-24]
    actual_r   = records[-24:]

    X_raw     = _build_X_raw(lookback_r)
    past_flat = scaler.transform(X_raw).flatten()

    start_utc = datetime.now(timezone.utc) - timedelta(hours=24)
    start_utc = start_utc.replace(minute=0, second=0, microsecond=0)
    sh, ch, sd, cd = _build_future_signals(start_utc)

    X_input  = np.concatenate([past_flat, sh, ch, sd, cd]).reshape(1, -1)
    y_scaled = model.predict(X_input)[0]
    t_min, t_max = scaler.data_min_[0], scaler.data_max_[0]
    pred_all = y_scaled * (t_max - t_min) + t_min

    n    = len(actual_r)
    pred = pred_all[:n]
    obs  = np.array([r["temperature"] for r in actual_r])

    mae    = float(np.mean(np.abs(pred - obs)))
    rmse   = float(np.sqrt(np.mean((pred - obs) ** 2)))
    ss_res = float(np.sum((obs - pred) ** 2))
    ss_tot = float(np.sum((obs - np.mean(obs)) ** 2))
    r2     = 1.0 - ss_res / ss_tot if ss_tot > 1e-9 else 0.0

    if r2 >= 0.85 and mae <= 2.0:
        tier = "excellent"
        suggestion = (
            f"✅ Excellent forecast quality (MAE {mae:.1f}°C, R² {r2*100:.0f}%). "
            "Predictions are highly reliable for this location."
        )
    elif r2 >= 0.70:
        tier = "good"
        suggestion = (
            f"👍 Good confidence (MAE {mae:.1f}°C, R² {r2*100:.0f}%). "
            f"Expect minor variations of ±{mae:.1f}°C. Temperature trends are reliable."
        )
    elif r2 >= 0.50:
        tier = "moderate"
        suggestion = (
            f"⚠️ Moderate accuracy (MAE {mae:.1f}°C, R² {r2*100:.0f}%). "
            "Use ±3°C as your confidence interval and cross-check with the Gemini AI analysis."
        )
    else:
        tier = "low"
        suggestion = (
            f"🔴 Lower accuracy for this region (MAE {mae:.1f}°C, R² {r2*100:.0f}%). "
            "This location's climate differs from the Gwalior training data. "
            "Gemini AI analysis is recommended for reliable estimates."
        )

    return {
        "mae_celsius":     round(mae, 3),
        "rmse_celsius":    round(rmse, 3),
        "r2_score":        round(r2, 4),
        "temp_min":        round(float(obs.min()), 1),
        "temp_max":        round(float(obs.max()), 1),
        "features":        ALL_FEATURES,
        "lookback":        LOOKBACK,
        "forecast":        FORECAST,
        "live":            True,
        "quality_tier":    tier,
        "suggestion":      suggestion,
        "evaluated_hours": n,
    }


if __name__ == "__main__":
    print("🔮 Test prediction for Gwalior...")
    result = predict_72h(26.2183, 78.1828)
    print(f"\n{'─'*40}")
    print(f"  {'Time (UTC)':<20}  Temp     Bias")
    print(f"{'─'*40}")
    for r in result[:12]:
        print(f"  {r['time']}   {r['temperature']:5.1f}°C  ({r['bias_applied']:+.1f}°C)")
    print(f"  ... ({len(result)} total hours)")

    report = get_accuracy_report()
    if report:
        print(f"\n📊 Training accuracy: MAE={report['mae_celsius']}°C  R²={report['r2_score']}")
