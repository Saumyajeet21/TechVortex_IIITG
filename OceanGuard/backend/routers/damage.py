"""POST /api/damage-cost — calculate economic damage from lost carbon absorption."""
import json
import math
import logging
from pathlib import Path
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


class DamageRequest(BaseModel):
    lat: float
    lon: float
    radius_km: float = 50.0
    period: str = "monthly"   # "monthly" or "annual"


def _find_nearest_zone(lat: float, lon: float) -> str:
    min_dist, nearest = float("inf"), "MUM-001"
    for zone_id, (zlat, zlon) in ZONE_LOOKUP.items():
        dist = math.sqrt((lat - zlat) ** 2 + (lon - zlon) ** 2)
        if dist < min_dist:
            min_dist, nearest = dist, zone_id
    return nearest


@router.post("/api/damage-cost")
async def get_damage_cost(req: DamageRequest):
    from services.calculator import calculate_damage_cost

    zone_id = _find_nearest_zone(req.lat, req.lon)

    # Try live cache
    cache_path = CACHE_DIR / f"{zone_id}.json"
    if cache_path.exists():
        with open(cache_path) as f:
            data = json.load(f)
        carbon = data.get("carbon", {})
        lost_tonnes_year = carbon.get("lost_absorption_tonnes_year", 0)
        result = calculate_damage_cost(lost_tonnes_year, req.period)
        result["zone_id"] = zone_id
        return result

    # Mock fallback
    if MOCK_PATH.exists():
        with open(MOCK_PATH) as f:
            mock = json.load(f)
        zone_data = mock.get("zones", {}).get(zone_id, {})
        damage = zone_data.get("damage", {})

        if req.period == "annual":
            m = damage.get("carbon_prices", {})
            return {
                "zone_id": zone_id,
                "period": "annual",
                "lost_absorption_tonnes": round(damage.get("lost_absorption_tonnes", 0) * 12, 1),
                "carbon_prices": {k: round(v * 12, 2) for k, v in m.items()},
                "headline_damage_usd": round(damage.get("headline_damage_usd", 0) * 12, 2),
                "equivalent_to": damage.get("equivalent_to", ""),
            }
        damage["zone_id"] = zone_id
        return damage

    # Live computation
    from services.data_fetcher import fetch_all_features
    from main import carbon_model

    features = await fetch_all_features(req.lat, req.lon, req.radius_km)
    carbon_result = carbon_model.predict(features)
    lost = carbon_result.get("lost_absorption_tonnes_year", 0)
    result = calculate_damage_cost(lost, req.period)
    result["zone_id"] = zone_id
    return result
