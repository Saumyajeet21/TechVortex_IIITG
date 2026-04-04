"""
gemini_forecast.py
Calls Google Gemini API to validate + narrate the LSTM forecast.
Uses direct REST API (no SDK needed — just requests).
"""

import os, json, requests

GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_URL   = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"


def get_gemini_analysis(
    city: str,
    lat: float,
    lon: float,
    lstm_forecast: list,       # list of {time, temperature}
    current_weather: dict,     # {temperature, humidity, windspeed, condition}
) -> dict:
    """
    Send LSTM predictions + current weather to Gemini.
    Returns a dict with: narrative, confidence, events, validation,
                         adjusted_peak, adjusted_low, gemini_temps (list)
    """
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set in environment")

    # Build a compact hour summary for Gemini (every 3hrs to save tokens)
    compact = [
        f"{h['time'][11:16]} → {h['temperature']}°C"
        for h in lstm_forecast[::3]
    ]
    forecast_str = "\n".join(compact)

    # 24h summary stats
    first24 = lstm_forecast[:24]
    peak    = max(first24, key=lambda h: h["temperature"])
    low     = min(first24, key=lambda h: h["temperature"])

    prompt = f"""You are an expert meteorologist AI. An LSTM neural network has generated a 72-hour temperature forecast for {city} (coordinates: {lat}°N, {lon}°E).

CURRENT CONDITIONS (right now):
- Temperature: {current_weather.get('temperature', 'N/A')}°C
- Feels like: {current_weather.get('feelsLike', 'N/A')}°C
- Humidity: {current_weather.get('humidity', 'N/A')}%
- Wind speed: {current_weather.get('windspeed', 'N/A')} km/h
- Condition: {current_weather.get('description', 'N/A')}

LSTM MODEL FORECAST (every 3 hours):
{forecast_str}

LSTM Summary: Peak {peak['temperature']}°C at {peak['time'][11:16]}, Low {low['temperature']}°C at {low['time'][11:16]}

YOUR TASK:
1. Validate whether this LSTM forecast looks meteorologically reasonable for this region and season.
2. Write a concise 2-3 sentence public weather narrative (like a TV weather forecast).
3. List up to 3 notable weather events or alerts for the next 72 hours.
4. Give a confidence score 0-100 for the LSTM predictions.
5. Provide your own 24-hour temperature estimate in 3-hour intervals (8 values from now).

Respond ONLY with valid JSON in this exact format:
{{
  "narrative": "...",
  "confidence": 85,
  "validation": "...",
  "events": ["...", "..."],
  "gemini_24h": [
    {{"time_label": "Now+3h",  "temperature": 23.5}},
    {{"time_label": "Now+6h",  "temperature": 22.0}},
    {{"time_label": "Now+9h",  "temperature": 21.0}},
    {{"time_label": "Now+12h", "temperature": 24.0}},
    {{"time_label": "Now+15h", "temperature": 27.5}},
    {{"time_label": "Now+18h", "temperature": 26.0}},
    {{"time_label": "Now+21h", "temperature": 24.5}},
    {{"time_label": "Now+24h", "temperature": 23.0}}
  ]
}}"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1024,
            "responseMimeType": "application/json",
        },
    }

    resp = requests.post(
        f"{GEMINI_URL}?key={api_key}",
        json=payload,
        timeout=30,
    )
    resp.raise_for_status()

    raw_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]

    # Parse JSON from Gemini's response
    try:
        result = json.loads(raw_text)
    except json.JSONDecodeError:
        # Try to extract JSON if wrapped in markdown
        import re
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        result = json.loads(match.group()) if match else {}

    return result
