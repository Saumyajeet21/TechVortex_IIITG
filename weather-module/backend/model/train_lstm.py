"""
train_lstm.py  (scikit-learn MLP — improved with seasonal + cyclic time features)

Features per hour (past window):
  temperature, precipitation, windspeed, humidity,
  hour_sin, hour_cos   ← time of day (IST)
  day_sin,  day_cos    ← day of year (seasonality)

Input shape:  (24h × 8 features) + (72 × 4 future signals)
            = 192 + 288 = 480 input features
Output shape: 72 hourly temperatures
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import pickle, os, math

# ── Config ────────────────────────────────────────────────────────────────────
LOOKBACK  = 24
FORECAST  = 72
FEATURES  = ["temperature", "precipitation", "windspeed", "humidity"]
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "weather_history.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_model")
os.makedirs(MODEL_DIR, exist_ok=True)

# ── Load data ──────────────────────────────────────────────────────────────────
print("📂 Loading training data...")
df = pd.read_csv(DATA_PATH, parse_dates=["datetime"])
df = df[["datetime"] + FEATURES].dropna().reset_index(drop=True)
print(f"   {len(df)} hourly records | ~{len(df)//24} days")

# ── Cyclic time + seasonal features ─────────────────────────────────────────
# IST hour encoding (data is already in IST from fetch_data.py)
df["hour_sin"] = np.sin(2 * np.pi * df["datetime"].dt.hour / 24)
df["hour_cos"] = np.cos(2 * np.pi * df["datetime"].dt.hour / 24)
# Day-of-year encoding → model knows April ≠ January
df["day_sin"]  = np.sin(2 * np.pi * df["datetime"].dt.dayofyear / 365)
df["day_cos"]  = np.cos(2 * np.pi * df["datetime"].dt.dayofyear / 365)

ALL_FEATURES = FEATURES + ["hour_sin", "hour_cos", "day_sin", "day_cos"]  # 8 features
print(f"   Features ({len(ALL_FEATURES)}): {ALL_FEATURES}")

# ── Scale (only the 6 features, NOT the raw hour) ─────────────────────────────
scaler = MinMaxScaler()
scaled = scaler.fit_transform(df[ALL_FEATURES])       # shape (N, 6)

with open(os.path.join(MODEL_DIR, "scaler.pkl"), "wb") as f:
    pickle.dump(scaler, f)
print("✅ Scaler saved")

# ── Build sequences ───────────────────────────────────────────────────────────
def make_sequences(scaled_data, datetimes, lookback, forecast):
    """
    Input  = flatten(24h × 8 features)
           + future_hour_sin(72) + future_hour_cos(72)
           + future_day_sin(72)  + future_day_cos(72)
           = 192 + 288 = 480 features
    Output = 72 future temperatures (scaled index-0 values)
    """
    X, y = [], []
    for i in range(len(scaled_data) - lookback - forecast):
        # ── Past window (8 features × 24h) ───────────────────────────────────
        past_flat = scaled_data[i : i + lookback].flatten()   # (192,)

        # ── Future time signals ───────────────────────────────────────────────
        fut_slice  = datetimes.iloc[i + lookback : i + lookback + forecast]
        fut_hours  = fut_slice.dt.hour.values          # IST hours (0-23)
        fut_days   = fut_slice.dt.dayofyear.values     # day of year (1-365)

        fut_sin_h  = np.sin(2 * np.pi * fut_hours / 24)    # (72,)
        fut_cos_h  = np.cos(2 * np.pi * fut_hours / 24)    # (72,)
        fut_sin_d  = np.sin(2 * np.pi * fut_days  / 365)   # (72,)
        fut_cos_d  = np.cos(2 * np.pi * fut_days  / 365)   # (72,)

        X.append(np.concatenate([past_flat, fut_sin_h, fut_cos_h,
                                             fut_sin_d, fut_cos_d]))  # (480,)

        # ── Target: 72 scaled temperatures ──────────────────────────────────
        target = scaled_data[i + lookback : i + lookback + forecast, 0]  # (72,)
        y.append(target)

    return np.array(X), np.array(y)

print("\n🔧 Building sequences with time signals...")
X, y = make_sequences(scaled, df["datetime"], LOOKBACK, FORECAST)
print(f"   X: {X.shape}  |  y: {y.shape}")

X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.15, shuffle=False)

# ── Train MLP ─────────────────────────────────────────────────────────────────
print("\n🚀 Training neural network (2-5 min on CPU)...")
model = MLPRegressor(
    hidden_layer_sizes=(512, 256, 128, 64),
    activation="relu",
    solver="adam",
    max_iter=500,
    early_stopping=True,
    validation_fraction=0.1,
    n_iter_no_change=20,
    learning_rate_init=0.001,
    random_state=42,
    verbose=True,
)

model.fit(X_train, y_train)

# ── Evaluate ──────────────────────────────────────────────────────────────────
y_pred = model.predict(X_val)

temp_min = scaler.data_min_[0]
temp_max = scaler.data_max_[0]
temp_range = temp_max - temp_min

# Denormalise for human-readable metrics
y_val_c  = y_val  * temp_range + temp_min
y_pred_c = y_pred * temp_range + temp_min

mae   = mean_absolute_error(y_val_c, y_pred_c)
rmse  = math.sqrt(mean_squared_error(y_val_c, y_pred_c))
r2    = r2_score(y_val_c, y_pred_c)

print(f"\n{'='*45}")
print(f"  📊  MODEL ACCURACY REPORT")
print(f"{'='*45}")
print(f"  MAE  (Mean Absolute Error)  : {mae:.2f}°C")
print(f"  RMSE (Root Mean Sq Error)   : {rmse:.2f}°C")
print(f"  R²   (Explained Variance)   : {r2:.4f}  ({r2*100:.1f}%)")
print(f"  Temp range in training data : {temp_min:.1f}°C – {temp_max:.1f}°C")
print(f"{'='*45}")
if r2 > 0.85:
    print("  ✅ Model quality: GOOD")
elif r2 > 0.70:
    print("  ⚠️  Model quality: ACCEPTABLE")
else:
    print("  ❌ Model quality: POOR — consider more data or features")
print()

# ── Save model ────────────────────────────────────────────────────────────────
with open(os.path.join(MODEL_DIR, "weather_model.pkl"), "wb") as f:
    pickle.dump(model, f)

# Save accuracy report alongside model
report = {
    "mae_celsius": round(mae, 3),
    "rmse_celsius": round(rmse, 3),
    "r2_score": round(r2, 4),
    "temp_min": temp_min,
    "temp_max": temp_max,
    "features": ALL_FEATURES,
    "lookback": LOOKBACK,
    "forecast": FORECAST,
}
with open(os.path.join(MODEL_DIR, "accuracy_report.pkl"), "wb") as f:
    pickle.dump(report, f)

print(f"💾 Model saved → {MODEL_DIR}/weather_model.pkl")
print(f"📄 Accuracy report saved → {MODEL_DIR}/accuracy_report.pkl")
