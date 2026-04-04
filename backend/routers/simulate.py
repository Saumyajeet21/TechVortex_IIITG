"""POST /api/simulate — project ecosystem recovery vs doing nothing."""
import json
import math
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

MOCK_PATH  = Path(__file__).parent.parent / "data" / "mock_predictions.json"
CACHE_DIR  = Path(__file__).parent.parent / "data" / "zone_cache"

ZONE_LOOKUP = {
    "MUM-001": (18.92, 72.82), "CHN-001": (13.05, 80.27),
    "KOC-001": (9.93,  76.26), "SUN-001": (21.94, 89.18),
    "GOA-001": (15.49, 73.82), "VIZ-001": (17.68, 83.22),
    "ORS-001": (19.90, 86.10), "AND-001": (11.74, 92.66),
    "MAN-001": (9.10,  79.10), "KUT-001": (22.60, 70.20),
    "MAN-002": (12.87, 74.84), "PAR-001": (20.32, 86.61),
}


class SimulateRequest(BaseModel):
    lat: float
    lon: float
    radius_km: float = 50.0
    plastic_reduction_pct: float  # 0–100
    months_ahead: int = 6


def _find_nearest_zone(lat: float, lon: float) -> str:
    min_dist, nearest = float("inf"), "MUM-001"
    for zone_id, (zlat, zlon) in ZONE_LOOKUP.items():
        dist = math.sqrt((lat - zlat) ** 2 + (lon - zlon) ** 2)
        if dist < min_dist:
            min_dist, nearest = dist, zone_id
    return nearest


@router.post("/api/simulate")
async def simulate(req: SimulateRequest):
    from services.calculator import calculate_simulation

    zone_id = _find_nearest_zone(req.lat, req.lon)

    carbon_data  = {}
    plastic_data = {}

    # Try live cache for this zone
    cache_path = CACHE_DIR / f"{zone_id}.json"
    if cache_path.exists():
        with open(cache_path) as f:
            data = json.load(f)
        carbon_data  = data.get("carbon", {})
        plastic_data = data.get("plastic_risk", {})
    elif MOCK_PATH.exists():
        with open(MOCK_PATH) as f:
            mock = json.load(f)
        zone_data    = mock.get("zones", {}).get(zone_id, {})
        carbon_data  = zone_data.get("carbon", {})
        plastic_data = zone_data.get("plastic_risk", {})
    else:
        # Live fetch fallback
        from services.data_fetcher import fetch_all_features
        from main import plastic_model, carbon_model
        features     = await fetch_all_features(req.lat, req.lon, req.radius_km)
        plastic_data = plastic_model.predict(features)
        carbon_data  = carbon_model.predict(features)

    current_carbon_pct  = carbon_data.get("carbon_absorption_pct", 0.5)
    lost_tonnes_year    = carbon_data.get("lost_absorption_tonnes_year", 10000)
    baseline_tonnes_year = carbon_data.get("baseline_absorption_tonnes_year", 20000)
    current_plastic_risk = plastic_data.get("plastic_risk_score", 0.5)

    result = calculate_simulation(
        current_plastic_risk=float(current_plastic_risk),
        current_carbon_pct=float(current_carbon_pct),
        lost_tonnes_year=float(lost_tonnes_year),
        baseline_tonnes_year=float(baseline_tonnes_year),
        plastic_reduction_pct=req.plastic_reduction_pct,
        months_ahead=req.months_ahead,
    )
    result["zone_id"] = zone_id
    return result
