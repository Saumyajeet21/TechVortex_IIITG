"""POST /api/plastic-source — source attribution and interventions for a zone."""
import json
import math
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

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


class SourceRequest(BaseModel):
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


@router.post("/api/plastic-source")
async def get_plastic_source(req: SourceRequest):
    from services.calculator import calculate_source_attribution, generate_interventions

    zone_id = _find_nearest_zone(req.lat, req.lon)

    # Try live cache
    cache_path = CACHE_DIR / f"{zone_id}.json"
    if cache_path.exists():
        with open(cache_path) as f:
            data = json.load(f)
        features = data.get("features", {})
        attribution = calculate_source_attribution(features)
        interventions = generate_interventions(
            attribution, features,
            top_rivers=features.get("top_rivers", []),
            zone_name=data.get("name", zone_id),
        )
        return {
            "zone_id": zone_id,
            "attribution": attribution,
            "top_shipping_lanes": data.get("source", {}).get("top_shipping_lanes", []),
            "top_rivers": features.get("top_rivers", []),
            "interventions": interventions,
        }

    # Live data fetch
    from services.data_fetcher import fetch_all_features
    features = await fetch_all_features(req.lat, req.lon, req.radius_km)
    attribution = calculate_source_attribution(features)
    interventions = generate_interventions(
        attribution, features,
        top_rivers=features.get("top_rivers", []),
        zone_name=zone_id,
    )
    return {
        "zone_id": zone_id,
        "attribution": attribution,
        "top_shipping_lanes": [],
        "top_rivers": features.get("top_rivers", []),
        "interventions": interventions,
    }
