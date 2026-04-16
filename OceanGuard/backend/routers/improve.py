"""
Improvement Suggestions Router
POST /api/improve — Gemini-powered carbon improvement plan
POST /api/validate-coastal — coastal area validation
POST /api/custom-analysis — save user query to Supabase
GET  /api/supabase-status — check if Supabase is connected
"""
import os
import math
import logging
import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()
logger = logging.getLogger(__name__)

GOOGLE_MAPS_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")


# ── Coastal Validation ────────────────────────────────────────────────────────

# Real Indian shoreline reference points (lat, lon) — ~150km coastal band
# Each point sits ON or very close to the actual Indian coast
INDIAN_COASTAL_POINTS = [
    # Gujarat / West coast north
    (23.22, 69.67),  # Kandla port
    (22.47, 69.12),  # Jamnagar
    (22.30, 72.63),  # Bhavnagar
    (21.19, 72.83),  # Surat
    (20.46, 72.90),  # Valsad coast
    # Mumbai & Konkan
    (19.07, 72.87),  # Mumbai harbor
    (18.40, 73.08),  # Alibag
    (17.68, 73.31),  # Ratnagiri
    (16.70, 73.83),  # Malvan
    (15.49, 73.82),  # Goa / Panaji
    # Karnataka coast
    (14.80, 74.13),  # Karwar
    (13.86, 74.69),  # Bhatkal
    (12.87, 74.84),  # Mangalore
    (12.30, 74.71),  # Kasaragod
    # Kerala
    (11.87, 75.35),  # Kozhikode
    (10.52, 76.21),  # Thrissur district coast
    (9.97,  76.24),  # Kochi / Ernakulam
    (8.73,  76.98),  # Thiruvananthapuram
    (8.09,  77.55),  # Kanyakumari
    # Tamil Nadu east coast
    (8.74,  78.10),  # Tuticorin
    (9.28,  79.32),  # Rameswaram
    (10.77, 79.84),  # Karaikal
    (11.40, 79.69),  # Nagapattinam
    (11.94, 79.83),  # Cuddalore
    (13.06, 80.28),  # Chennai / Marina
    # Andhra Pradesh
    (14.45, 80.03),  # Nellore coast
    (15.48, 80.35),  # Machilipatnam
    (16.31, 81.14),  # Kakinada
    (17.68, 83.22),  # Visakhapatnam
    # Odisha / West Bengal
    (19.30, 84.80),  # Chilika Lake coast
    (20.26, 85.83),  # Paradip
    (20.97, 86.73),  # Chandbali
    (21.60, 87.48),  # Digha area
    (21.94, 89.18),  # Sundarbans / Sagar Island
    (22.17, 88.92),  # Diamond Harbour
    # Islands
    (11.74, 92.66),  # Port Blair, Andaman
    (10.00, 92.50),  # S. Andaman
    (10.57, 72.64),  # Lakshadweep / Kavaratti
]

COASTAL_THRESHOLD_KM = 150  # within 150km of shoreline = coastal

# Global coastal cities for non-Indian queries
GLOBAL_COASTAL_CITIES = [
    # Major coastal cities worldwide for proximity check
    (1.35, 103.82),   # Singapore
    (22.3, 114.17),   # Hong Kong
    (13.75, 100.5),   # Bangkok
    (-6.2, 106.82),   # Jakarta
    (14.6, 121.0),    # Manila
    (31.23, 121.47),  # Shanghai
    (35.68, 139.69),  # Tokyo
    (37.57, 126.98),  # Seoul
    (-33.87, 151.21), # Sydney
    (25.2, 55.27),    # Dubai
    (51.51, -0.13),   # London
    (48.86, 2.35),    # Paris (near coast)
    (40.71, -74.0),   # New York
    (34.05, -118.24), # Los Angeles
    (-23.55, -46.63), # São Paulo
]


class CoastalValidationRequest(BaseModel):
    lat: float
    lon: float
    location_name: Optional[str] = ""


class ImprovementRequest(BaseModel):
    zone_name: str
    lat: float
    lon: float
    plastic_risk: float
    carbon_pct: float
    lost_tonnes: int
    monthly_damage_usd: float
    features: dict = {}


def _is_indian_coastal(lat: float, lon: float) -> tuple[bool, str]:
    """Check if coordinates are within 150km of the actual Indian shoreline."""
    min_dist = float("inf")
    for clat, clon in INDIAN_COASTAL_POINTS:
        d = _distance_km(lat, lon, clat, clon)
        if d < min_dist:
            min_dist = d
    if min_dist <= COASTAL_THRESHOLD_KM:
        # Determine region name from nearest reference point
        if lon < 73.0:
            return True, "Gulf of Kutch"
        elif lon < 77.0 and lat > 8.0:
            return True, "Arabian Sea Coast"
        elif lon > 92.0:
            return True, "Andaman & Nicobar"
        elif lon > 87.0:
            return True, "Sundarbans / Bay of Bengal"
        elif lat < 9.0:
            return True, "Gulf of Mannar"
        elif lon > 79.0:
            return True, "Bay of Bengal Coast"
        else:
            return True, "Indian Coastal Zone"
    return False, ""


def _distance_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def _is_global_coastal(lat: float, lon: float, threshold_km: float = 150) -> bool:
    """Fallback: check if near any known global coastal city."""
    for clat, clon in GLOBAL_COASTAL_CITIES:
        if _distance_km(lat, lon, clat, clon) < threshold_km:
            return True
    return False


async def _check_google_maps_coastal(lat: float, lon: float) -> dict:
    """
    Use Google Maps Reverse Geocoding to check for coastal indicators.
    Returns coastal confidence info.
    """
    if not GOOGLE_MAPS_KEY:
        return {"google_verified": False}

    try:
        url = f"https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lon}&key={GOOGLE_MAPS_KEY}"
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url)
            data = resp.json()

        if data.get("status") != "OK":
            return {"google_verified": False}

        results = data.get("results", [])
        coastal_keywords = [
            "coast", "bay", "beach", "sea", "ocean", "harbor", "harbour",
            "port", "marine", "littoral", "gulf", "estuary", "delta",
            "backwater", "creek", "tidal", "lagoon", "strait"
        ]

        all_text = " ".join([
            r.get("formatted_address", "") for r in results
        ]).lower()

        all_types = []
        for r in results:
            all_types.extend(r.get("types", []))

        keyword_match = any(kw in all_text for kw in coastal_keywords)
        type_match = any(t in ["natural_feature", "establishment", "park", "point_of_interest"]
                        for t in all_types)

        # Get the best address
        address = results[0].get("formatted_address", "") if results else ""

        return {
            "google_verified": True,
            "coastal_keywords_found": keyword_match,
            "address": address,
        }
    except Exception as e:
        return {"google_verified": False, "error": str(e)}


@router.post("/api/validate-coastal", tags=["Location"])
async def validate_coastal(req: CoastalValidationRequest):
    """
    Validate whether a given location is a coastal area near the ocean.
    Blocks landlocked areas (e.g., Delhi, Jaipur, Bhopal).
    Returns suggestions if not coastal.
    """
    lat, lon = req.lat, req.lon

    # 1. Check Indian coastal bounding boxes
    is_indian_coastal, coastal_region = _is_indian_coastal(lat, lon)

    # 2. Google Maps check (if key available)
    google_data = await _check_google_maps_coastal(lat, lon)

    # 3. Global coastal city proximity check
    is_global_coastal = _is_global_coastal(lat, lon)

    # Final decision
    is_coastal = is_indian_coastal or is_global_coastal or google_data.get("coastal_keywords_found", False)

    if is_coastal:
        return {
            "is_coastal": True,
            "region": coastal_region or "Coastal Area",
            "address": google_data.get("address", req.location_name),
            "message": "✅ Valid coastal location",
        }
    else:
        # Suggest nearest coastal cities based on distance
        suggestions = _suggest_nearby_coastal(lat, lon)
        return {
            "is_coastal": False,
            "region": None,
            "address": google_data.get("address", req.location_name),
            "message": "⚠️ This location does not appear to be near an ocean or coastline.",
            "suggestions": suggestions,
        }


def _suggest_nearby_coastal(lat: float, lon: float) -> list:
    """Return nearest Indian coastal cities to suggest instead."""
    coastal_cities = [
        (18.92, 72.82, "Mumbai, Maharashtra"),
        (13.08, 80.27, "Chennai, Tamil Nadu"),
        (9.93, 76.26, "Kochi, Kerala"),
        (15.49, 73.82, "Panaji, Goa"),
        (21.94, 89.18, "Sundarbans, West Bengal"),
        (17.69, 83.29, "Visakhapatnam, Andhra Pradesh"),
        (11.66, 78.15, "Cuddalore, Tamil Nadu"),
        (19.30, 84.79, "Puri, Odisha"),
        (14.45, 80.01, "Nellore, Andhra Pradesh"),
        (23.86, 86.20, "Digha, West Bengal"),
        (8.18, 77.42, "Kanyakumari, Tamil Nadu"),
        (12.87, 74.84, "Mangalore, Karnataka"),
    ]

    with_distance = [
        (city, _distance_km(lat, lon, clat, clon))
        for clat, clon, city in coastal_cities
    ]
    with_distance.sort(key=lambda x: x[1])
    return [{"city": city, "distance_km": round(dist, 1)} for city, dist in with_distance[:4]]


# ── Improvement Suggestions ───────────────────────────────────────────────────

@router.post("/api/improve", tags=["Improvement"])
async def get_improvement_plan(req: ImprovementRequest):
    """
    Generate AI-powered improvement plan using Gemini.
    Returns actionable suggestions for:
    - Reducing plastic risk
    - Improving carbon absorption
    - Increasing carbon credit value
    """
    from services.gemini_service import generate_improvement_suggestions
    result = generate_improvement_suggestions(
        zone_name=req.zone_name,
        plastic_risk=req.plastic_risk,
        carbon_pct=req.carbon_pct,
        lost_tonnes=req.lost_tonnes,
        monthly_damage_usd=req.monthly_damage_usd,
        features=req.features,
    )
    return result


# ── Custom Analysis (saves user searches to Supabase) ─────────────────────────

class CustomAnalysisRequest(BaseModel):
    location_name: str
    lat: float
    lon: float
    radius_km: int = 50
    plastic: dict = {}
    carbon: dict = {}
    damage: dict = {}


@router.post("/api/custom-analysis", tags=["Supabase"])
async def save_custom_analysis(req: CustomAnalysisRequest):
    """Save a user's custom location analysis to Supabase custom_analyses table."""
    try:
        from services.supabase_service import save_custom_analysis as _save
        result = _save(
            location_name=req.location_name,
            lat=req.lat,
            lon=req.lon,
            radius_km=req.radius_km,
            plastic_result=req.plastic,
            carbon_result=req.carbon,
            damage_result=req.damage,
        )
        logger.info(f"[Supabase] Saved custom analysis for {req.location_name}")
        return {"saved": True, "data": result}
    except Exception as e:
        logger.error(f"[Supabase] Custom analysis save failed: {e}")
        return {"saved": False, "error": str(e)}


# ── Supabase Health Check ─────────────────────────────────────────────────────

@router.get("/api/supabase-status", tags=["Supabase"])
async def supabase_status():
    """Check if Supabase is connected and return row counts for OceanGuard tables."""
    try:
        from services.supabase_service import get_supabase_client
        client = get_supabase_client()
        if not client:
            return {"connected": False, "reason": "SUPABASE_URL or SUPABASE_ANON_KEY missing in .env"}

        zones_r    = client.table("zones").select("id", count="exact").execute()
        preds_r    = client.table("zone_predictions").select("id", count="exact").execute()
        analyses_r = client.table("custom_analyses").select("id", count="exact").execute()
        logs_r     = client.table("model_logs").select("id", count="exact").execute()

        return {
            "connected": True,
            "tables": {
                "zones":            zones_r.count,
                "zone_predictions": preds_r.count,
                "custom_analyses":  analyses_r.count,
                "model_logs":       logs_r.count,
            }
        }
    except Exception as e:
        return {"connected": False, "error": str(e)}


# ── Gemini Usage Monitor ──────────────────────────────────────────────────────

@router.get("/api/gemini-status", tags=["AI"])
async def gemini_status():
    """
    Check Gemini API status and daily credit usage.
    Gemini is only called when users click 'Get Improvement Plan' — never automatically.
    """
    from services.gemini_service import GEMINI_API_KEY, get_daily_call_count, _cache
    key_set = bool(GEMINI_API_KEY)
    calls_today = get_daily_call_count()
    cache_hits  = len(_cache)

    return {
        "gemini_key_configured": key_set,
        "model": "gemini-2.0-flash",
        "calls_today": calls_today,
        "cache_entries": cache_hits,
        "credit_saving_rules": [
            "Cached per zone + risk bucket (same score = 0 credits)",
            "Called ONLY on explicit user request (/api/improve)",
            "Max 350 tokens per call",
            "Rule-based fallback always available",
        ],
        "estimated_cost_today_usd": round(calls_today * 0.000011, 6),
    }

