"""POST /api/carbon-absorption — carbon absorption metrics for a lat/lon zone."""
import json
import math
import logging
from pathlib import Path
from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

CACHE_DIR = Path(__file__).parent.parent / "data" / "zone_cache"
MOCK_PATH  = Path(__file__).parent.parent / "data" / "mock_predictions.json"

ZONE_LOOKUP = {
    "MUM-001": (18.92, 72.82), "CHN-001": (13.05, 80.27),
    "KOC-001": (9.93,  76.26), "SUN-001": (21.94, 89.18),
    "GOA-001": (15.49, 73.82), "VIZ-001": (17.68, 83.22),
    "ORS-001": (19.90, 86.10), "AND-001": (11.74, 92.66),
    "MAN-001": (9.10,  79.10), "KUT-001": (22.60, 70.20),
    "MAN-002": (12.87, 74.84), "PAR-001": (20.32, 86.61),
}


class CarbonRequest(BaseModel):
    lat: float
    lon: float
    radius_km: float = 50.0


def _find_nearest_zone(lat: float, lon: float) -> str:
    min_dist, nearest = float("inf"), "MUM-001"
    for zone_id, (zlat, zlon) in ZONE_LOOKUP.items():
        dist = math.sqrt((lat - zlat) ** 2 + (lon - zlon) ** 2)
        if dist < min_dist:
            min_dist, nearest = dist, zone_id
    return nearest


def _save_to_supabase(zone_id: str, carbon_result: dict):
    try:
        from services.supabase_service import save_zone_prediction
        save_zone_prediction(
            zone_id=zone_id,
            features={},
            plastic_result={},
            carbon_result=carbon_result,
            damage_result={},
            attribution={},
        )
    except Exception as e:
        logger.warning(f"[Supabase] Carbon save skipped: {e}")


@router.post("/api/carbon-absorption")
async def get_carbon_absorption(req: CarbonRequest):
    zone_id = _find_nearest_zone(req.lat, req.lon)

    # Try live cache first
    cache_path = CACHE_DIR / f"{zone_id}.json"
    if cache_path.exists():
        with open(cache_path) as f:
            data = json.load(f)
        result = data.get("carbon", {})
        result["zone_id"] = zone_id
        result["last_updated"] = data.get("updated_at", datetime.now(timezone.utc).isoformat())
        _save_to_supabase(zone_id, result)
        return result

    # Mock fallback
    if MOCK_PATH.exists():
        with open(MOCK_PATH) as f:
            mock = json.load(f)
        zone_data = mock.get("zones", {}).get(zone_id, {})
        result = zone_data.get("carbon", {})
        result["last_updated"] = datetime.now(timezone.utc).isoformat()
        _save_to_supabase(zone_id, result)
        return result

    # Live ML prediction path
    from services.data_fetcher import fetch_all_features
    from main import carbon_model

    features = await fetch_all_features(req.lat, req.lon, req.radius_km)
    result = carbon_model.predict(features)
    # Ensure vegetation_health block exists
    if "vegetation_health" not in result:
        result["vegetation_health"] = {
            "seagrass_ndvi":  float(features.get("ndvi_score", 0.55)),
            "baseline_ndvi":  0.70,
            "turbidity_ntu":  float(features.get("water_turbidity_ntu", 4.0)),
            "water_temp_c":   float(features.get("sea_surface_temperature_c", 27.0)),
        }
    result["zone_id"] = zone_id
    result["last_updated"] = datetime.now(timezone.utc).isoformat()
    _save_to_supabase(zone_id, result)
    return result
