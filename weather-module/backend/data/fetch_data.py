"""
fetch_data.py
Downloads 1 year of hourly historical weather from Open-Meteo Archive API
and saves it as data/weather_history.csv
"""

import openmeteo_requests
import requests_cache
import pandas as pd
from retry_requests import retry
import os

# ── Setup Open-Meteo client with cache + retry ─────────────────────────────
cache_session = requests_cache.CachedSession('.cache', expire_after=-1)
retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
openmeteo = openmeteo_requests.Client(session=retry_session)

# ── Parameters ──────────────────────────────────────────────────────────────
# Gwalior as primary training location
LATITUDE  = 26.2183
LONGITUDE = 78.1828
START     = "2024-01-01"
END       = "2024-12-31"

url    = "https://archive-api.open-meteo.com/v1/archive"
params = {
    "latitude":  LATITUDE,
    "longitude": LONGITUDE,
    "start_date": START,
    "end_date":   END,
    "hourly": [
        "temperature_2m",
        "precipitation",
        "windspeed_10m",
        "relative_humidity_2m",
    ],
    "timezone": "Asia/Kolkata",
}

print("📡 Fetching historical data from Open-Meteo Archive API...")
responses = openmeteo.weather_api(url, params=params)
response  = responses[0]

print(f"✅ Data received for: {LATITUDE}°N, {LONGITUDE}°E")
print(f"   Elevation: {response.Elevation()} m")
print(f"   UTC offset: {response.UtcOffsetSeconds()} s")

# ── Parse hourly data ────────────────────────────────────────────────────────
hourly   = response.Hourly()
hourly_data = {
    "datetime":    pd.date_range(
        start = pd.to_datetime(hourly.Time(), unit="s", utc=True),
        end   = pd.to_datetime(hourly.TimeEnd(), unit="s", utc=True),
        freq  = pd.Timedelta(seconds=hourly.Interval()),
        inclusive="left",
    ),
    "temperature":  hourly.Variables(0).ValuesAsNumpy(),
    "precipitation":hourly.Variables(1).ValuesAsNumpy(),
    "windspeed":    hourly.Variables(2).ValuesAsNumpy(),
    "humidity":     hourly.Variables(3).ValuesAsNumpy(),
}

df = pd.DataFrame(data=hourly_data)
df["datetime"] = df["datetime"].dt.tz_convert("Asia/Kolkata")
df = df.dropna()

# ── Save ─────────────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(__file__), exist_ok=True)
out_path = os.path.join(os.path.dirname(__file__), "weather_history.csv")
df.to_csv(out_path, index=False)

print(f"\n✅ Saved {len(df)} hourly records → {out_path}")
print(df.head())
print(f"\nDate range: {df['datetime'].min()} → {df['datetime'].max()}")
