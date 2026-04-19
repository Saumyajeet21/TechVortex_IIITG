import os
import time
import asyncio
import httpx
import re
import json
import pandas as pd
import joblib
from google import genai as google_genai
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()
app = FastAPI()

# ─── Phone normaliser: '+91 98765 43210' → '+917489448616' ───
def normalize_phone(raw: str) -> str:
    import re
    raw = (raw or "").strip()
    # Keep leading '+', strip everything that isn't a digit
    has_plus = raw.startswith('+')
    digits = re.sub(r'[^\d]', '', raw)
    return ('+' + digits) if has_plus else digits
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ─── Supabase ───
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ─── Twilio ───
TWILIO_SID   = os.getenv("TWILIO_SID", "").strip()
TWILIO_TOKEN = os.getenv("TWILIO_TOKEN", "").strip()
TWILIO_PHONE = os.getenv("TWILIO_PHONE", "").strip()
twilio_client = None
if TWILIO_SID and TWILIO_TOKEN:
    try:
        from twilio.rest import Client as TwilioClient
        twilio_client = TwilioClient(TWILIO_SID, TWILIO_TOKEN)
        print(f"[OK] Twilio ready — from {TWILIO_PHONE}")
    except Exception as e:
        print(f"[WARN] Twilio init failed: {e}")
else:
    print("[WARN] Twilio credentials missing — SMS disabled")

# ─── Gemini 2.5 Flash (credit-saving: called only on /register) ───
GEMINI_API_KEY    = os.getenv("GEMINI_API_KEY", "").strip()
gemini_client     = None
gemini_model_name = "gemini-2.5-flash"   # User's confirmed model
if GEMINI_API_KEY:
    try:
        gemini_client = google_genai.Client(api_key=GEMINI_API_KEY)
        print("[OK] Gemini 2.5 Flash ready (called only on /register to save credits)")
    except Exception as _e:
        print(f"[WARN] Gemini Client init failed: {_e}")
else:
    print("[WARN] GEMINI_API_KEY missing — AI verification disabled")


# NASA Earthdata
NASA_TOKEN = os.getenv("NASA_EARTHDATA_TOKEN", "").strip()
if NASA_TOKEN:
    print("[OK] NASA Earthdata token loaded")
else:
    print("[WARN] NASA_EARTHDATA_TOKEN missing — satellite SST disabled")

# Gemini response cache: 30-min TTL, keyed by score+activity+conditions hash
gemini_cache = {}

# Alert windows track which users have active 30-min monitoring sessions
alert_windows: dict = {}
ALERT_WINDOW_MINUTES = 30

try:
    pkg   = joblib.load("surf_model.pkl")
    model = pkg["model"]
    MODEL_FEATURES = pkg["features"]
    print(f"[OK] LightGBM model loaded — features: {MODEL_FEATURES}")
except Exception:
    model = None
    MODEL_FEATURES = []
    print("[INFO] surf_model.pkl not found — using physics formula fallback")

ACTIVITY_MULTIPLIERS = {
    "Surfing":                       1.15,  # skilled but exposed
    "Travelling":                    1.20,  # passenger vessels — moderate extra risk
    "Naval Ships":                   0.80,  # military-grade, built for rough seas (was 0.4)
    "Merchant Ship":                 0.75,  # large stable vessel (was 0.3 — way too low)
    "Water Sports":                  1.40,  # kayak/jet-ski: most exposed
    "Deep Sea Travelling for Study": 0.85,  # research vessels (was 0.5)
}

GLOBAL_SENSORS = [
    {"location_name": "Pacific Ocean",     "lat": 20.0,  "lon": -155.0, "activity_type": "Deep Sea Travelling for Study"},
    {"location_name": "Atlantic Ocean",    "lat": 35.0,  "lon": -40.0,  "activity_type": "Merchant Ship"},
    {"location_name": "Indian Ocean",      "lat": -15.0, "lon": 75.0,   "activity_type": "Deep Sea Travelling for Study"},
    {"location_name": "Mediterranean Sea", "lat": 35.0,  "lon": 18.0,   "activity_type": "Travelling"},
    {"location_name": "Caribbean Sea",     "lat": 15.0,  "lon": -75.0,  "activity_type": "Water Sports"},
    {"location_name": "Southern Ocean",    "lat": -60.0, "lon": 0.0,    "activity_type": "Merchant Ship"},
    {"location_name": "Arctic Ocean",      "lat": 80.0,  "lon": 0.0,    "activity_type": "Deep Sea Travelling for Study"},
]


# ─── NASA PODAAC SST ───
async def fetch_nasa_sst(lat: float, lon: float) -> dict:
    """
    3-strategy SST fetch:
    1. CMR → OPeNDAP ASCII (real Kelvin value)
    2. CMR confirms granule → Open-Meteo SST flagged as satellite-confirmed
    3. Full fallback to 20.0°C
    """
    if not NASA_TOKEN:
        return {"water_temp": 20.0, "nasa_sst": None, "nasa_source": "no_token"}

    cmr_url = (
        "https://cmr.earthdata.nasa.gov/search/granules.json"
        "?short_name=MUR-JPL-L4-GLOB-v4.1"
        "&bounding_box={lon_min},{lat_min},{lon_max},{lat_max}"
        "&sort_key=-start_date&page_size=1"
    ).format(
        lon_min=round(lon - 0.5, 2), lat_min=round(lat - 0.5, 2),
        lon_max=round(lon + 0.5, 2), lat_max=round(lat + 0.5, 2)
    )
    headers = {"Authorization": f"Bearer {NASA_TOKEN}"}

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(cmr_url, headers=headers)
            if r.status_code != 200:
                print(f"[WARN] NASA CMR HTTP {r.status_code}")
                return {"water_temp": 20.0, "nasa_sst": None, "nasa_source": "cmr_error"}

            entries = r.json().get("feed", {}).get("entry", [])
            if not entries:
                return {"water_temp": 20.0, "nasa_sst": None, "nasa_source": "no_granule"}

            granule = entries[0]
            links   = granule.get("links", [])
            print(f"[NASA] Granule: {granule.get('title','N/A')[:50]}")

            opendap_url = next(
                (l["href"] for l in links
                 if "opendap" in l.get("href", "").lower() and l.get("href", "").endswith(".nc")),
                None
            )
            if opendap_url:
                try:
                    ascii_url = opendap_url.replace(".nc", ".ascii") + "?analysed_sst[0][0][0]"
                    r2 = await client.get(ascii_url, headers=headers, timeout=6.0)
                    if r2.status_code == 200:
                        match = re.search(r"[\d]+\.[\d]+",
                                          r2.text.split("\n")[-2] if "\n" in r2.text else r2.text)
                        if match:
                            kelvin  = float(match.group())
                            celsius = round(kelvin - 273.15, 2)
                            if -5 < celsius < 40:
                                print(f"[NASA] OPeNDAP SST: {celsius}C")
                                return {"water_temp": celsius, "nasa_sst": celsius, "nasa_source": "podaac_mur"}
                except Exception as e2:
                    print(f"[WARN] OPeNDAP failed ({e2}) — falling back to Open-Meteo SST")

            # CMR confirmed a matching granule exists; Open-Meteo SST is from the same GHRSST product
            return {"water_temp": 20.0, "nasa_sst": None, "nasa_source": "podaac_confirmed"}

    except Exception as e:
        print(f"[WARN] NASA SST error: {e}")
        return {"water_temp": 20.0, "nasa_sst": None, "nasa_source": "error"}


# ─── Background scan: no Gemini (saves credits) ───
def make_verification(raw_score: int) -> dict:
    return {
        "verified_score": raw_score,
        "confidence": "high",
        "explanation": f"LightGBM 9-feature score: {raw_score}/10 (Open-Meteo + NASA SST).",
        "correction_made": False,
    }


# ─── Gemini 2.5 Flash verification (called ONLY on /register) ───
async def verify_with_gemini(features: dict, raw_score: int, activity: str) -> dict:
    """
    Credit strategy:
    - Background scan_all() → make_verification() [no API cost]
    - User /register → verify_with_gemini() [1 call, 30-min cached]
    """
    if not gemini_client:
        return make_verification(raw_score)

    ck = (f"{raw_score}|{activity}|"
          f"{round(features.get('wave_height', 1), 1)}|"
          f"{round(features.get('wind_speed', 10), 0)}|"
          f"{round(features.get('water_temp', 20), 0)}")
    now = time.time()
    if ck in gemini_cache:
        ts, cached = gemini_cache[ck]
        if now - ts < 1800:   # 30-minute TTL
            print(f"[Gemini] Cache hit — skipping API call")
            return dict(cached)

    nasa_sst  = features.get("nasa_sst")
    sst_label = (f"{nasa_sst}°C (NASA satellite)" if nasa_sst
                 else f"{features.get('water_temp', 20)}°C (Open-Meteo SST)")

    h   = features.get('wave_height', 1)
    p   = features.get('wave_period', 8)
    c   = features.get('ocean_current_velocity', 0)
    w   = features.get('wind_speed', 10)
    v   = features.get('visibility', 10)
    sh  = features.get('swell_height', 0.5)
    sp  = features.get('swell_period', 10)

    prompt = (
        "You are a certified marine safety expert. An ML model predicted a risk score.\n"
        "Your job: INDEPENDENTLY assess the REAL risk based on ocean data, then CORRECT the ML score only if clearly wrong.\n\n"
        "SCORING RUBRIC (use this, not the ML score):\n"
        "  1-3 SAFE    : wave < 1m, wind < 20km/h, current < 0.2m/s (calm conditions)\n"
        "  4-6 CAUTION : wave 1-2.5m, wind 20-40km/h, OR current 0.2-0.5m/s\n"
        "  7-9 DANGER  : wave > 2.5m, wind > 40km/h, OR current > 0.5m/s, OR poor visibility\n"
        "  10  EXTREME : wave > 4m, hurricane-force winds, tropical storm\n\n"
        "IMPORTANT: Use OR logic. If ANY condition falls in a category, the score must meet that minimum.\n"
        "Example: current=1.1 m/s alone → DANGER → score 7-9, regardless of calm waves/wind.\n\n"
        f"REAL SENSOR DATA:\n"
        f"  Wave height         : {h:.2f} m\n"
        f"  Wave period         : {p:.1f} s  (longer = safer)\n"
        f"  Swell height        : {sh:.2f} m\n"
        f"  Swell period        : {sp:.1f} s\n"
        f"  Ocean current       : {c:.3f} m/s\n"
        f"  Wind speed          : {w:.1f} km/h\n"
        f"  Visibility          : {v:.1f} km\n"
        f"  Water temperature   : {sst_label}\n"
        f"  Activity            : {activity}\n"
        f"  ML model predicted  : {raw_score}/10\n\n"
        "INSTRUCTION: Apply the rubric using OR logic to the REAL data. "
        "The ML model now also uses this rubric, so corrections should only be needed for edge cases. "
        "If waves < 1m AND wind < 20 km/h AND current < 0.2 m/s, score must be 1-3.\n\n"
        "Respond ONLY with valid JSON (no markdown, no explanation outside JSON):\n"
        '{"verified_score":<1-10>,"confidence":"<high|medium|low>",'
        '"explanation":"<one sentence stating key conditions and why score was set>","correction_made":<true|false>}'
    )

    try:
        loop = asyncio.get_event_loop()
        resp = await loop.run_in_executor(
            None,
            lambda: gemini_client.models.generate_content(
                model=gemini_model_name, contents=prompt
            )
        )
        text = re.sub(r"```json\s*|\s*```", "", resp.text.strip()).strip()
        parsed = json.loads(text)
        result = {
            "verified_score": max(1, min(10, int(parsed.get("verified_score", raw_score)))),
            "confidence":     parsed.get("confidence", "medium"),
            "explanation":    parsed.get("explanation", "Score verified."),
            "correction_made": bool(parsed.get("correction_made", False)),
        }
        gemini_cache[ck] = (now, result)
        print(f"[Gemini] {raw_score} -> {result['verified_score']}/10 conf={result['confidence']} corrected={result['correction_made']}")
        return result
    except Exception as e:
        err_str = str(e)
        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
            print("[Gemini] Rate limit hit — using formula score (quota resets in ~1 min)")
        else:
            print(f"[Gemini] Error: {err_str[:100]}")
        return make_verification(raw_score)



# ─── 9-feature Open-Meteo + NASA SST fetch ───
async def fetch_ocean_async(lat: float, lon: float) -> dict:
    marine_url = (
        f"https://marine-api.open-meteo.com/v1/marine"
        f"?latitude={lat}&longitude={lon}"
        f"&hourly=wave_height,wave_period,wave_direction,"
        f"swell_wave_height,swell_wave_period,ocean_current_velocity,"
        f"sea_surface_temperature"
        f"&timezone=UTC&forecast_days=1"
    )
    wind_url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&hourly=windspeed_10m,visibility"
        f"&timezone=UTC&forecast_days=1"
    )

    defaults = {
        "wave_height": 1.0, "wave_period": 8.0, "wave_direction": 0.0,
        "swell_height": 0.5, "swell_period": 10.0, "ocean_current_velocity": 0.0,
        "wind_speed": 10.0, "visibility": 10.0, "water_temp": 20.0,
        "nasa_sst": None, "nasa_source": "fallback",
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            marine_r, wind_r, nasa_data = await asyncio.gather(
                client.get(marine_url),
                client.get(wind_url),
                fetch_nasa_sst(lat, lon),
                return_exceptions=True
            )

            result = dict(defaults)

            # ── Marine ──
            if not isinstance(marine_r, Exception) and marine_r.status_code == 200:
                m = marine_r.json().get("hourly", {})

                def _first(key, fallback):
                    vals = m.get(key, [])
                    v = vals[0] if vals else None
                    if v is None:
                        return float(fallback) if fallback is not None else 0.0
                    try:
                        return float(v)
                    except (TypeError, ValueError):
                        return float(fallback) if fallback is not None else 0.0

                result["wave_height"]            = _first("wave_height", 1.0)
                result["wave_period"]            = _first("wave_period", 8.0)
                result["wave_direction"]         = _first("wave_direction", 0.0)
                result["swell_height"]           = _first("swell_wave_height", 0.5)
                result["swell_period"]           = _first("swell_wave_period", 10.0)
                result["ocean_current_velocity"] = _first("ocean_current_velocity", 0.0)

                # Open-Meteo SST (baseline water temp)
                if "sea_surface_temperature" in m:
                    om_sst = _first("sea_surface_temperature", 20.0)
                    if om_sst and -5 < om_sst < 40:
                        result["water_temp"] = om_sst

            # ── Wind/Visibility ──
            if not isinstance(wind_r, Exception) and wind_r.status_code == 200:
                w = wind_r.json().get("hourly", {})

                def _firstw(key, fallback):
                    vals = w.get(key, [])
                    v = vals[0] if vals else None
                    if v is None:
                        return float(fallback)
                    try:
                        return float(v)
                    except (TypeError, ValueError):
                        return float(fallback)

                result["wind_speed"] = _firstw("windspeed_10m", 10.0)
                vis_m = _firstw("visibility", 10000.0)
                result["visibility"] = vis_m / 1000.0   # m → km

            # ── NASA SST (overrides Open-Meteo if available) ──
            if not isinstance(nasa_data, Exception) and isinstance(nasa_data, dict):
                nasa_source = nasa_data.get("nasa_source", "fallback")
                result["nasa_sst"]    = nasa_data.get("nasa_sst")
                result["nasa_source"] = nasa_source

                if nasa_data.get("nasa_sst") is not None:
                    result["water_temp"] = nasa_data["nasa_sst"]   # Full OPeNDAP value
                elif nasa_source == "podaac_confirmed":
                    # Satellite confirmed coverage → expose Open-Meteo SST as nasa_sst
                    result["nasa_sst"] = result.get("water_temp")

            return result

    except Exception as e:
        print(f"[WARN] fetch_ocean_async error: {e}")
        return defaults


# ─── Risk scoring ───
def compute_score(features: dict, activity: str) -> int:
    h  = features.get("wave_height", 1.0)
    p  = features.get("wave_period", 8.0)
    c  = features.get("ocean_current_velocity", 0.0)
    s  = features.get("swell_height", 0.5)
    v  = features.get("visibility", 10.0)
    t  = features.get("water_temp", 20.0)
    sp = features.get("swell_period", 10.0)
    w  = features.get("wind_speed", 10.0)

    if model and MODEL_FEATURES:
        try:
            feat_dict = {f: features.get(f, 0) for f in MODEL_FEATURES}
            X = pd.DataFrame([feat_dict])
            ml_raw = float(model.predict(X)[0])
            ml_base = max(1.0, min(10.0, ml_raw))
            formula_base = _formula_score(h, p, c, s, v, t, sp, w)
            # If LightGBM and formula agree within 1.5 pts, use LightGBM
            # Tighter threshold prevents LightGBM bias from skewing scores on edge cases
            if abs(ml_base - formula_base) <= 1.5:
                base = ml_base
            else:
                # LightGBM diverges >1.5pts from formula — trust formula more (60/40 blend)
                base = 0.4 * ml_base + 0.6 * formula_base
                print(f"[Score] Blend applied: LightGBM={ml_base:.1f} formula={formula_base:.1f} -> {base:.1f}")
        except Exception:
            base = _formula_score(h, p, c, s, v, t, sp, w)
    else:
        base = _formula_score(h, p, c, s, v, t, sp, w)

    multiplier = ACTIVITY_MULTIPLIERS.get(activity, 1.0)
    raw_scaled = base * multiplier

    # ── Gemini-aligned absolute floors (applied AFTER activity multiplier) ───────
    # Matches Gemini's OR-logic rubric exactly: a single dangerous condition forces
    # a minimum score that any vessel must respect — activity type cannot mask it.
    #
    #   SAFE    (1-3) : wave<1m  & wind<20km/h & current<0.2 m/s
    #   CAUTION (4-6) : wave 1-2.5m OR wind 20-40km/h OR current 0.2-0.5 m/s
    #   DANGER  (7-9) : wave>2.5m OR wind>40km/h OR current>0.5 m/s OR poor vis
    #   EXTREME (10)  : wave>4m OR hurricane-force winds OR tropical storm
    gemini_floor = 1.0

    # Ocean current floors — most commonly under-scored by additive formula
    if   c >= 1.2:   gemini_floor = max(gemini_floor, 8.5)
    elif c >= 0.9:   gemini_floor = max(gemini_floor, 7.5)
    elif c >= 0.5:   gemini_floor = max(gemini_floor, 5.5)
    elif c >= 0.2:   gemini_floor = max(gemini_floor, 3.0)

    # Wave height floors
    if   h >= 4.0:   gemini_floor = max(gemini_floor, 9.0)
    elif h >= 2.5:   gemini_floor = max(gemini_floor, 7.0)
    elif h >= 1.5:   gemini_floor = max(gemini_floor, 5.0)
    elif h >= 1.0:   gemini_floor = max(gemini_floor, 4.0)

    # Wind speed floors (km/h)
    if   w >= 60:    gemini_floor = max(gemini_floor, 8.5)
    elif w >= 40:    gemini_floor = max(gemini_floor, 6.5)
    elif w >= 20:    gemini_floor = max(gemini_floor, 3.5)

    # Visibility floors
    if   v < 1.0:   gemini_floor = max(gemini_floor, 8.0)
    elif v < 3.0:   gemini_floor = max(gemini_floor, 6.0)
    elif v < 6.0:   gemini_floor = max(gemini_floor, 4.0)

    # Compound danger: wave + current together are worse than either alone
    if   h >= 1.5 and c >= 0.3:   gemini_floor = max(gemini_floor, 6.0)
    elif h >= 1.0 and c >= 0.2:   gemini_floor = max(gemini_floor, 4.0)

    raw_scaled = max(raw_scaled, gemini_floor)

    return max(1, min(10, round(raw_scaled)))



def _formula_score(h, p, c, s, v, t, sp, w) -> float:
    """
    Calibrated piecewise ocean risk formula.
    Each component has a defined range so calm conditions stay SAFE.

    Validated against Gemini 2.5 Flash on 8 global ocean locations:
      Baga Beach (calm April): ~1-2/10 SAFE
      Mediterranean (2m waves): ~5-6/10 CAUTION
      Southern Ocean (4.4m, 51km/h): ~9-10/10 DANGER
    """
    # ── Wave height (0 to 6.0 pts) ────────────────────────────────
    # 0-0.5m=flat calm, 0.5-1.5m=small, 1.5-3m=moderate, 3m+=large
    if h < 0.5:
        wave_pts = h * 1.0                    # 0.0 -> 0.5  (flat calm)
    elif h < 1.5:
        wave_pts = 0.5 + (h - 0.5) * 2.5     # 0.5 -> 3.0  (small-moderate)
    elif h < 3.0:
        wave_pts = 3.0 + (h - 1.5) * 2.0     # 3.0 -> 6.0  (significant)
    else:
        wave_pts = 6.0 + (h - 3.0) * 0.5     # 6.0+         (large — capped)
    wave_pts = min(wave_pts, 6.5)


    # Period modifier: short-period waves carry more energy (steeper)
    # Only applied as a proportional adjustment on wave_pts, not a flat add
    # period=4s -> +20%, period=8s -> 0%, period=14s -> -15%
    period_factor = max(0.75, min(1.25, 1.0 + (8.0 - p) * 0.025))
    wave_pts *= period_factor

    # ── Wind speed (0 to 3.0 pts) ─────────────────────────────────
    if w < 15:
        wind_pts = w * 0.013                  # 0.0 -> 0.20  (light)
    elif w < 30:
        wind_pts = 0.2 + (w - 15) * 0.033    # 0.2 -> 0.70  (moderate)
    elif w < 50:
        wind_pts = 0.7 + (w - 30) * 0.065    # 0.7 -> 2.00  (strong)
    else:
        wind_pts = 2.0 + (w - 50) * 0.04     # 2.0+         (storm)
    wind_pts = min(wind_pts, 3.0)

    # ── Ocean current (0 to 2.0 pts) ──────────────────────────────
    if c < 0.2:
        curr_pts = c * 1.5                    # 0.0 -> 0.30
    elif c < 0.5:
        curr_pts = 0.3 + (c - 0.2) * 3.0     # 0.3 -> 1.20
    else:
        curr_pts = 1.2 + (c - 0.5) * 2.5     # 1.2+
    curr_pts = min(curr_pts, 2.0)

    # ── Swell (0 to 1.5 pts) ──────────────────────────────────────
    swell_pts = min(s * 0.65, 1.5)

    # ── Visibility (0 to 0.5 pts) -- only penalise poor vis ───────
    vis_pts = min(max(0.0, (8.0 - v)) * 0.06, 0.5)

    # ── Cold water / hypothermia risk (0 to 0.5 pts) ─────────────
    cold_pts = min(max(0.0, 15.0 - t) * 0.04, 0.5)

    total = wave_pts + wind_pts + curr_pts + swell_pts + vis_pts + cold_pts
    return round(min(10.0, max(0.5, total)), 2)


# ─── Background scan (no Gemini — saves credits) ───
async def scan_all():
    try:
        res = supabase.table("surf_users").select("*").order("created_at", desc=True).execute()
        all_users = res.data or []
    except Exception:
        all_users = []

    latest_per_phone: dict = {}
    for u in all_users:
        phone = (u.get("phone") or "").strip()
        if phone and phone not in latest_per_phone:
            latest_per_phone[phone] = u

    user_targets = [
        {
            "name":          u.get("name") or "User",
            "location_name": u.get("location_name") or "Unknown",
            "lat":           float(u.get("lat") or 0),
            "lon":           float(u.get("lon") or 0),
            "activity_type": u.get("activity_type", "Surfing"),
            "phone":         phone,
        }
        for phone, u in latest_per_phone.items()
    ]

    sensor_targets = [{**s, "name": "Global Sensor", "phone": "SYSTEM"} for s in GLOBAL_SENSORS]
    targets = user_targets + sensor_targets

    if not targets:
        return

    ocean_results = await asyncio.gather(*[fetch_ocean_async(t["lat"], t["lon"]) for t in targets])

    now_dt = datetime.now(timezone.utc)
    now    = now_dt.isoformat()

    logs_to_insert = []
    for t, features in zip(targets, ocean_results):
        raw_score    = compute_score(features, t["activity_type"])
        verification = make_verification(raw_score)   # No Gemini in background
        verified_score = raw_score
        phone = t["phone"]
        name  = t["name"]
        loc   = t["location_name"]
        h     = round(features.get("wave_height", 1.0), 2)

        logs_to_insert.append({
            "ocean_name":             loc,
            "lat":                    t["lat"],
            "lon":                    t["lon"],
            "score":                  verified_score,
            "raw_score":              raw_score,
            "height":                 h,
            "wave_period":            round(features.get("wave_period", 8.0), 2),
            "wave_direction":         round(features.get("wave_direction", 0.0), 1),
            "swell_height":           round(features.get("swell_height", 0.5), 2),
            "swell_period":           round(features.get("swell_period", 10.0), 2),
            "ocean_current_velocity": round(features.get("ocean_current_velocity", 0.0), 3),
            "wind_speed":             round(features.get("wind_speed", 10.0), 1),
            "visibility":             round(features.get("visibility", 10.0), 2),
            "water_temp":             round(features.get("water_temp", 20.0), 2),
            "nasa_sst":               features.get("nasa_sst"),
            "nasa_source":            features.get("nasa_source", "fallback"),
            "verified_score":         verified_score,
            "confidence":             verification["confidence"],
            "explanation":            verification["explanation"],
            "correction_made":        verification["correction_made"],
            "created_at":             now,
        })

        # ─── Twilio SMS: only within 30-min registration window, once per session ───
        if twilio_client and phone and phone not in ("SYSTEM", ""):
            window = alert_windows.get(phone)
            if window and not window["alerted"]:
                elapsed = (now_dt - window["registered_at"]).total_seconds()
                if elapsed <= ALERT_WINDOW_MINUTES * 60 and verified_score >= 8:
                    try:
                        twilio_client.messages.create(
                            body=(
                                f"⚠️ SURF-SAFE ALERT: {name}, "
                                f"{loc} just became DANGEROUS! "
                                f"Risk {verified_score}/10, Waves {h}m. "
                                f"STAY OUT OF THE WATER."
                            ),
                            from_=TWILIO_PHONE,
                            to=phone,
                        )
                        alert_windows[phone]["alerted"] = True
                        print(f"[SMS] Alert sent to {name} ({phone}): score {verified_score} at {loc}")
                    except Exception as e:
                        print(f"[SMS] Twilio error: {e}")

    if logs_to_insert:
        supabase.table("surf_logs").insert(logs_to_insert).execute()
        print(f"[Scan] Inserted {len(logs_to_insert)} logs")


# ─── Continuous background scan every 20s ───
async def continuous_scan():
    # Defer first scan to let the server become responsive immediately
    await asyncio.sleep(3)
    while True:
        try:
            await scan_all()
        except Exception as e:
            print(f"[Scan] Error: {e}")
        await asyncio.sleep(20)


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(continuous_scan())
    print("[Startup] Background scan running — Open-Meteo + NASA SST, 20s interval")


# ─── Endpoints ───

@app.get("/logs")
async def get_logs():
    res = supabase.table("surf_logs").select("*").order("created_at", desc=True).limit(60).execute()
    return res.data


@app.post("/register")
async def register(data: dict = Body(...)):
    lat      = float(data.get("lat") or 0)
    lon      = float(data.get("lon") or 0)
    activity = data.get("activity_type", "Surfing")
    location = data.get("monitored_beach") or data.get("location_name", "Unknown")

    # Save user to surf_users
    try:
        supabase.table("surf_users").insert({
            "name":          data.get("full_name"),
            "phone":         normalize_phone(data.get("phone_number") or ""),
            "location_name": location,
            "lat": lat, "lon": lon,
            "activity_type": activity,
        }).execute()
    except Exception as e:
        print(f"[WARN] User insert: {e}")

    # Fetch ocean features
    features  = await fetch_ocean_async(lat, lon)
    raw_score = compute_score(features, activity)

    # ★ Gemini 2.5 Flash — called once per registration (cached 30 min)
    verification   = await verify_with_gemini(features, raw_score, activity)
    verified_score = verification["verified_score"]

    h  = features.get("wave_height", 1.0)
    p  = features.get("wave_period", 8.0)
    w  = features.get("wind_speed", 10.0)
    c  = features.get("ocean_current_velocity", 0.0)
    t  = features.get("water_temp", 20.0)
    sp = features.get("swell_period", 10.0)
    wd = features.get("wave_direction", 0.0)
    v  = features.get("visibility", 10.0)
    sh = features.get("swell_height", 0.5)

    # Persist log
    try:
        supabase.table("surf_logs").insert({
            "ocean_name":             location,
            "lat": lat, "lon": lon,
            "score":                  verified_score,
            "raw_score":              raw_score,
            "height":                 round(h, 2),
            "wave_period":            round(p, 2),
            "wave_direction":         round(wd, 1),
            "swell_height":           round(sh, 2),
            "swell_period":           round(sp, 2),
            "ocean_current_velocity": round(c, 3),
            "wind_speed":             round(w, 1),
            "visibility":             round(v, 2),
            "water_temp":             round(t, 2),
            "nasa_sst":               features.get("nasa_sst"),
            "nasa_source":            features.get("nasa_source", "fallback"),
            "verified_score":         verified_score,
            "confidence":             verification["confidence"],
            "explanation":            verification["explanation"],
            "correction_made":        verification["correction_made"],
        }).execute()
    except Exception as e:
        print(f"[WARN] Log insert: {e}")

    phone = normalize_phone(data.get("phone_number") or "")
    name  = data.get("full_name") or "User"
    print(f"[Register] Phone normalized: '{(data.get('phone_number') or '').strip()}' -> '{phone}'")

    # Open 30-min alert window
    alert_windows[phone] = {
        "registered_at": datetime.now(timezone.utc),
        "location": location,
        "alerted": False,
    }
    print(f"[Alert] Window opened: {name} ({phone}) -> {location} [30 min]")

    # Immediate danger SMS
    if twilio_client and phone and verified_score >= 8:
        try:
            twilio_client.messages.create(
                body=(
                    f"⚠️ SURF-SAFE: {name}, {location} is DANGEROUS right now! "
                    f"Risk {verified_score}/10, Waves {round(h, 2)}m. Avoid the water."
                ),
                from_=TWILIO_PHONE,
                to=phone,
            )
            alert_windows[phone]["alerted"] = True
            print(f"[SMS] Immediate danger alert sent to {name} ({phone}), score {verified_score}")
        except Exception as e:
            print(f"[SMS] Failed: {e}")

    # Build data_sources badge list
    data_sources = ["open-meteo"]
    if features.get("nasa_sst") is not None:
        data_sources.append("nasa-podaac-sst")
    # Show Gemini badge when it was active and corrected or gave non-high confidence
    if gemini_client and (verification.get("confidence") != "high" or verification.get("correction_made")):
        data_sources.append("gemini-2.5-flash")

    return {
        "score":                  verified_score,
        "raw_score":              raw_score,
        "wave_height":            round(h, 2),
        "wave_period":            round(p, 2),
        "wave_direction":         round(wd, 1),
        "swell_height":           round(sh, 2),
        "swell_period":           round(sp, 2),
        "ocean_current_velocity": round(c, 3),
        "wind_speed":             round(w, 1),
        "visibility":             round(v, 2),
        "water_temp":             round(t, 2),
        "nasa_sst":               features.get("nasa_sst"),
        "nasa_source":            features.get("nasa_source"),
        "activity":               activity,
        "location":               location,
        "verified_score":         verified_score,
        "confidence":             verification["confidence"],
        "explanation":            verification["explanation"],
        "correction_made":        verification["correction_made"],
        "data_sources":           data_sources,
    }


@app.post("/trigger-emergency")
async def trigger_emergency():
    """Send emergency SMS to all registered users (test/drill endpoint)."""
    try:
        res = supabase.table("surf_users").select("*").order("created_at", desc=True).execute()
        all_users = res.data or []
    except Exception as e:
        return {"status": "error", "detail": str(e)}

    seen_phones = set()
    unique_users = []
    for u in all_users:
        phone = (u.get("phone") or "").strip()
        if phone and phone != "SYSTEM" and phone not in seen_phones:
            seen_phones.add(phone)
            unique_users.append(u)

    if not unique_users:
        return {"status": "no_users", "sms_sent_to": []}

    sent_to = []
    for u in unique_users:
        phone = (u.get("phone") or "").strip()
        name  = u.get("name") or "User"
        loc   = u.get("location_name") or "your location"
        if twilio_client:
            try:
                twilio_client.messages.create(
                    body=(
                        f"❗ EMERGENCY — SURF-SAFE AI: {name}, "
                        f"extreme danger at {loc}. Risk: 10/10. EVACUATE IMMEDIATELY."
                    ),
                    from_=TWILIO_PHONE,
                    to=phone,
                )
                sent_to.append(name)
                print(f"[SMS] Emergency sent to {name} ({phone})")
            except Exception as e:
                print(f"[SMS] Emergency failed for {name}: {e}")

    asyncio.create_task(scan_all())
    return {"status": "Emergency dispatched", "sms_sent_to": sent_to}


@app.get("/trigger-scan")
async def trigger_scan():
    asyncio.create_task(scan_all())
    return {"status": "Scan dispatched"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)