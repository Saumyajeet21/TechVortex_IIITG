"""POST /api/plastic-risk — predict plastic risk for a lat/lon zone."""
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
    "MUM-001": (18.92, 72.82),
    "CHN-001": (13.05, 80.27),
    "KOC-001": (9.93,  76.26),
    "SUN-001": (21.94, 89.18),
    "GOA-001": (15.49, 73.82),
}


class PlasticRiskRequest(BaseModel):
    lat: float
    lon: float
    radius_km: float = 50.0
    use_cache: bool = False


def _find_nearest_zone(lat: float, lon: float) -> str:
    min_dist, nearest = float("inf"), "MUM-001"
    for zone_id, (zlat, zlon) in ZONE_LOOKUP.items():
        dist = math.sqrt((lat - zlat) ** 2 + (lon - zlon) ** 2)
        if dist < min_dist:
            min_dist, nearest = dist, zone_id
    return nearest


def _save_to_supabase(zone_id: str, plastic_result: dict, features: dict = {}):
    """Save prediction to Supabase — silently skips if not configured."""
    try:
        from services.supabase_service import save_zone_prediction
        save_zone_prediction(
            zone_id=zone_id,
            features=features,
            plastic_result=plastic_result,
            carbon_result={},
            damage_result={},
            attribution={},
        )
        logger.info(f"[Supabase] Saved plastic prediction for {zone_id}")
    except Exception as e:
        logger.warning(f"[Supabase] Plastic save skipped: {e}")


@router.post("/api/plastic-risk")
async def get_plastic_risk(req: PlasticRiskRequest):
    zone_id = _find_nearest_zone(req.lat, req.lon)

    # Try live cache first
    cache_path = CACHE_DIR / f"{zone_id}.json"
    if cache_path.exists() and not req.use_cache:
        with open(cache_path) as f:
            data = json.load(f)
        result = data.get("plastic_risk", {})
        result["zone_id"] = zone_id
        result["last_updated"] = data.get("updated_at", datetime.now(timezone.utc).isoformat())
        _save_to_supabase(zone_id, result)
        return result

    # Mock predictions fallback
    if MOCK_PATH.exists():
        with open(MOCK_PATH) as f:
            mock = json.load(f)
        zone_data = mock.get("zones", {}).get(zone_id, {})
        result = zone_data.get("plastic_risk", {})
        result["last_updated"] = datetime.now(timezone.utc).isoformat()
        _save_to_supabase(zone_id, result)
        return result

    # Live ML prediction path
    from services.data_fetcher import fetch_all_features
    from main import plastic_model

    features = await fetch_all_features(req.lat, req.lon, req.radius_km)
    prediction = plastic_model.predict(features)
    # Convert any numpy types to native Python for JSON serialization
    prediction = _to_python(prediction)
    prediction["zone_id"] = zone_id
    prediction["last_updated"] = datetime.now(timezone.utc).isoformat()
    _save_to_supabase(zone_id, prediction, features)
    return prediction


def _to_python(obj):
    """Recursively convert numpy types to native Python."""
    try:
        import numpy as np
        if isinstance(obj, (np.floating, np.integer)):
            return obj.item()
        if isinstance(obj, np.ndarray):
            return obj.tolist()
    except ImportError:
        pass
    if isinstance(obj, dict):
        return {k: _to_python(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_to_python(v) for v in obj]
    return obj

