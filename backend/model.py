"""
Surf-Safe AI — 9-Feature ML Training Engine
============================================
Model: LightGBM Regression → predicts a continuous risk score 1-10

Features (9 total):
  1. wave_height              (metres)    — primary danger indicator
  2. wave_period              (seconds)   — shorter = choppier, more dangerous
  3. wave_direction           (degrees)   — onshore = more dangerous
  4. swell_height             (metres)    — background ocean energy
  5. swell_period             (seconds)   — longer period = more energy
  6. ocean_current_velocity   (m/s)       — rip current risk
  7. wind_speed               (km/h)      — higher wind = worse conditions
  8. visibility               (km)        — fog/haze increases risk
  9. water_temp               (°C)        — cold water = faster hypothermia risk

Dataset: 30,000 physics-informed synthetic samples
Output:  risk_score (float 1.0–10.0), rounded to int for display
"""

import pandas as pd
import numpy as np
import lightgbm as lgb
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score


def generate_dataset(n=30000, seed=42):
    np.random.seed(seed)

    # ── Realistic feature distributions ──
    wave_height            = np.random.exponential(scale=1.5, size=n).clip(0.2, 9.0)
    wave_period            = np.random.uniform(3, 22, n)
    wave_direction         = np.random.uniform(0, 360, n)        # degrees
    swell_height           = wave_height * np.random.uniform(0.4, 0.9, n)
    swell_period           = np.random.uniform(6, 25, n)         # seconds
    ocean_current_velocity = np.random.exponential(scale=0.3, size=n).clip(0, 3.0)  # m/s
    wind_speed             = np.random.exponential(scale=12, size=n).clip(0, 80)
    visibility             = np.random.uniform(0.5, 20, n)
    water_temp             = np.random.uniform(2, 30, n)

    # ── Wave direction danger factor ──
    # Onshore (waves pointing toward coast, ~180°) is most dangerous for surfers
    # Offshore (~0° or 360°) is less dangerous for the coast
    direction_danger = np.abs(np.sin(np.radians(wave_direction))) * 0.5   # 0 to 0.5

    # ── Physics-based risk score formula (9 features) ──
    score = (
        wave_height            * 1.10 +       # waves — biggest factor
        (20 / np.maximum(wave_period, 1)) * 0.8 +  # short period = rough chop
        direction_danger                    +  # onshore wave direction
        swell_height           * 0.50 +       # background swell energy
        (20 / np.maximum(swell_period, 1)) * 0.30 + # short swell period = more energy
        ocean_current_velocity * 1.20 +       # rip currents are very dangerous
        wind_speed             * 0.06 +       # strong wind raises risk
        (15 / np.maximum(visibility, 0.1)) * 0.2 +  # low visibility adds risk
        np.maximum(0, 15 - water_temp) * 0.05        # cold water → hypothermia
    )

    noise = np.random.normal(0, 0.4, n)
    score = (score + noise).clip(1.0, 10.0)

    df = pd.DataFrame({
        "wave_height":            wave_height,
        "wave_period":            wave_period,
        "wave_direction":         wave_direction,
        "swell_height":           swell_height,
        "swell_period":           swell_period,
        "ocean_current_velocity": ocean_current_velocity,
        "wind_speed":             wind_speed,
        "visibility":             visibility,
        "water_temp":             water_temp,
        "risk_score":             score,
    })
    return df


def train_engine():
    print("🧪 Generating 9-feature physics-informed dataset (30,000 samples)...")
    df = generate_dataset()

    FEATURES = [
        "wave_height", "wave_period", "wave_direction",
        "swell_height", "swell_period", "ocean_current_velocity",
        "wind_speed", "visibility", "water_temp"
    ]
    TARGET = "risk_score"

    X = df[FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("🚀 Training LightGBM Regressor (9 features)...")
    model = lgb.LGBMRegressor(
        n_estimators=500,
        learning_rate=0.03,
        max_depth=7,
        num_leaves=50,
        min_child_samples=20,
        subsample=0.85,
        colsample_bytree=0.85,
        reg_alpha=0.05,
        reg_lambda=0.1,
        objective="regression",
        random_state=42,
        verbose=-1,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test).clip(1, 10)
    mae   = mean_absolute_error(y_test, preds)
    r2    = r2_score(y_test, preds)

    print(f"\n✅ Training complete!")
    print(f"   Mean Absolute Error : {mae:.3f}  (lower = better, good target < 0.5)")
    print(f"   R² Score            : {r2:.4f}  (higher = better, target > 0.92)")

    # Feature importance
    print("\n📊 Feature Importance:")
    importances = model.feature_importances_
    for feat, imp in sorted(zip(FEATURES, importances), key=lambda x: -x[1]):
        bar = "█" * int(imp / max(importances) * 20)
        print(f"   {feat:<28} {bar} ({imp:.0f})")

    # Example predictions
    print("\n📊 Example predictions:")
    examples = pd.DataFrame({
        "wave_height":            [0.5, 1.0, 1.5, 2.5, 3.5, 5.0, 7.0],
        "wave_period":            [8,   9,   10,  11,  12,  14,  16],
        "wave_direction":         [45,  90,  135, 180, 200, 220, 250],
        "swell_height":           [0.3, 0.6, 0.9, 1.5, 2.0, 3.0, 4.5],
        "swell_period":           [12,  12,  14,  15,  16,  18,  20],
        "ocean_current_velocity": [0.1, 0.2, 0.3, 0.5, 0.8, 1.2, 2.0],
        "wind_speed":             [5,   10,  15,  25,  30,  45,  60],
        "visibility":             [15,  12,  10,  8,   6,   3,   1],
        "water_temp":             [25,  23,  20,  18,  15,  12,  8],
    })
    raw_preds = model.predict(examples).clip(1, 10)
    for i, row in examples.iterrows():
        print(
            f"   h={row.wave_height}m  curr={row.ocean_current_velocity}m/s  "
            f"wind={row.wind_speed}km/h  → score {raw_preds[i]:.1f}/10"
        )

    joblib.dump({"model": model, "features": FEATURES}, "surf_model.pkl")
    print("\n💾 Saved to surf_model.pkl (9-feature LightGBM regressor)")


if __name__ == "__main__":
    train_engine()