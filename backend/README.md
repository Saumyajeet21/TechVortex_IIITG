# Ocean AI

Real-time ocean risk monitoring API. Fetches live sensor data from Open-Meteo and NASA PODAAC, scores risk using a LightGBM + physics formula blend, verifies via Gemini 2.5 Flash, and sends Twilio SMS alerts.

## Stack

- **FastAPI** — async REST API
- **LightGBM** — ML risk scoring model
- **Open-Meteo** — live wave, wind, swell data 
- **NASA PODAAC** — satellite sea surface temperature
- **Gemini 2.5 Flash** — AI score verification
- **Supabase** — PostgreSQL database (surf_logs, surf_users)
- **Twilio** — SMS danger alerts

## File Structure

```
backend/
├── main.py           # Full FastAPI app — all endpoints, scoring, scanning
├── model.py          # LightGBM model training script
├── surf_model.pkl    # Trained model (2.2 MB)
├── requirements.txt  # Python dependencies
├── .gitignore        # Excludes .env and secrets
└── .env              # API keys — NOT committed 
```

## Setup

```bash
pip install -r requirements.txt
```

Create a `.env` file with:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
NASA_EARTHDATA_TOKEN=your_nasa_token
TWILIO_SID=your_twilio_sid
TWILIO_TOKEN=your_twilio_auth_token
TWILIO_PHONE=+1xxxxxxxxxx
GEMINI_API_KEY=your_gemini_api_key
REACT_APP_GOOGLE_KEY=your_google_maps_key
```

## Run

```bash
uvicorn main:app --reload --port 8000
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/register` | Register user, get Gemini-verified risk score |
| `GET` | `/logs` | Last 60 sensor log entries |
| `POST` | `/trigger-emergency` | Send emergency SMS to all registered users |
| `GET` | `/trigger-scan` | Force an immediate background scan |

## Risk Scoring

- **Physics formula** (piecewise calibrated) + **LightGBM** model blended
- Blend threshold: if they disagree by > 1.5 pts, formula gets 60% weight
- Tiered safety floor for extreme conditions (prevents capable-vessel multipliers masking storms)
- Verified by Gemini 2.5 Flash on each `/register` call (cached 30 min)

## Risk Labels

| Score | Label |
|-------|-------|
| 1–4 | SAFE |
| 5–7 | CAUTION |
| 8–10 | DANGER |
