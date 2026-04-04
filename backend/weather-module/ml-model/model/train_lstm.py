"""
train_lstm.py  (scikit-learn version — no TensorFlow needed)
Uses MLPRegressor (neural network) + a sliding window approach
to forecast 72 hours of temperature from the last 24 hours.

Input:  24 hours × 4 features (flattened) = 96 values
Output: 72 hours of temperature predictions
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import pickle, os

# ── Config ────────────────────────────────────────────────────────────────────
LOOKBACK  = 24
FORECAST  = 72
FEATURES  = ["temperature", "precipitation", "windspeed", "humidity"]
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "weather_history.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_model")
os.makedirs(MODEL_DIR, exist_ok=True)

# ── Load data ──────────────────────────────────────────────────────────────────
print("📂 Loading training data...")
df = pd.read_csv(DATA_PATH)
df = df[FEATURES].dropna().reset_index(drop=True)
print(f"   {len(df)} hourly records | ~{len(df)//24} days")

# ── Scale ──────────────────────────────────────────────────────────────────────
scaler = MinMaxScaler()
scaled = scaler.fit_transform(df[FEATURES])

with open(os.path.join(MODEL_DIR, "scaler.pkl"), "wb") as f:
    pickle.dump(scaler, f)
print("✅ Scaler saved")

# ── Build sequences (flatten 24h window → 1D input) ───────────────────────────
def make_sequences(data, lookback, forecast):
    X, y = [], []
    for i in range(len(data) - lookback - forecast):
        window = data[i : i + lookback].flatten()   # shape (96,)
        target = data[i + lookback : i + lookback + forecast, 0]  # (72,) temp only
        X.append(window)
        y.append(target)
    return np.array(X), np.array(y)

print("🔧 Building sequences...")
X, y = make_sequences(scaled, LOOKBACK, FORECAST)
print(f"   X: {X.shape}  |  y: {y.shape}")

X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.15, shuffle=False)

# ── Train MLP Neural Network ──────────────────────────────────────────────────
print("\n🚀 Training neural network (this takes ~2-5 minutes on CPU)...")
model = MLPRegressor(
    hidden_layer_sizes=(256, 128, 64),
    activation="relu",
    solver="adam",
    max_iter=300,
    early_stopping=True,
    validation_fraction=0.1,
    n_iter_no_change=15,
    random_state=42,
    verbose=True,
)

model.fit(X_train, y_train)

# ── Evaluate ──────────────────────────────────────────────────────────────────
y_pred = model.predict(X_val)
mae_scaled = mean_absolute_error(y_val, y_pred)

temp_min = scaler.data_min_[0]
temp_max = scaler.data_max_[0]
mae_celsius = mae_scaled * (temp_max - temp_min)

print(f"\n✅ Training complete!")
print(f"   Validation MAE: ~{mae_celsius:.2f}°C")

# ── Save ──────────────────────────────────────────────────────────────────────
with open(os.path.join(MODEL_DIR, "weather_model.pkl"), "wb") as f:
    pickle.dump(model, f)

print(f"💾 Model saved → {MODEL_DIR}/weather_model.pkl")
