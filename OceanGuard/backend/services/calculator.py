"""
Calculator Service — damage costs, source attribution, interventions, equivalents.
"""
import os
import math
from dotenv import load_dotenv

load_dotenv()

CARBON_CREDIT_PRICE = float(os.getenv("CARBON_CREDIT_PRICE_USD", "15.50"))
EU_ETS_PRICE = float(os.getenv("EU_ETS_PRICE_USD", "75.00"))
SOCIAL_COST_CARBON = float(os.getenv("SOCIAL_COST_CARBON_USD", "51.00"))


# ─────────────────────────────────────────────────────────
# DAMAGE COST CALCULATOR
# ─────────────────────────────────────────────────────────

def calculate_damage_cost(lost_tonnes_year: float, period: str = "monthly") -> dict:
    """
    Calculate economic damage from lost carbon absorption at three price tiers.

    Args:
        lost_tonnes_year: lost CO₂ absorption in tonnes per year
        period: "monthly" or "annual"

    Returns:
        Dictionary with damage at voluntary, EU ETS, and social cost of carbon prices.
    """
    divisor = 12 if period == "monthly" else 1
    lost_period = lost_tonnes_year / divisor

    voluntary_usd = round(lost_period * CARBON_CREDIT_PRICE, 2)
    eu_ets_usd = round(lost_period * EU_ETS_PRICE, 2)
    social_cost_usd = round(lost_period * SOCIAL_COST_CARBON, 2)

    return {
        "period": period,
        "lost_absorption_tonnes": round(lost_period, 1),
        "carbon_prices": {
            "voluntary_market_usd": voluntary_usd,
            "eu_ets_usd": eu_ets_usd,
            "social_cost_carbon_usd": social_cost_usd,
        },
        "headline_damage_usd": voluntary_usd,
        "equivalent_to": _calculate_equivalent(voluntary_usd),
        "price_reference": {
            "voluntary_market": f"${CARBON_CREDIT_PRICE}/tonne (VCM spot)",
            "eu_ets": f"${EU_ETS_PRICE}/tonne (EU regulatory)",
            "social_cost": f"${SOCIAL_COST_CARBON}/tonne (US EPA true damage)",
        },
    }


def _calculate_equivalent(usd: float) -> str:
    """Convert $ damage to relatable equivalents."""
    FLIGHT_CO2_KG = 1800  # Mumbai to London round-trip
    FLIGHT_COST_USD = 100  # approximate carbon cost of one flight

    flights = round(usd / FLIGHT_COST_USD)
    cars_off_road = round(usd / 1500)  # avg car emits ~4.6t CO2/yr, $15.50/t ≈ $71/yr

    if flights > 1000:
        return f"{flights:,} round-trip flights Mumbai to London (or {cars_off_road:,} cars off-road for a year)"
    elif flights > 100:
        return f"{flights} round-trip flights Mumbai to London"
    elif flights > 10:
        return f"{flights} flights Mumbai to London (or {cars_off_road} cars off-road for a year)"
    else:
        return f"{flights} round-trip flights (or {round(usd / 15.5)} tonnes CO₂ unsequestered)"


# ─────────────────────────────────────────────────────────
# SOURCE ATTRIBUTION
# Reference: Lebreton et al. 2017, Schmidt et al. 2017
# ─────────────────────────────────────────────────────────

def calculate_source_attribution(zone_features: dict) -> dict:
    """
    Weighted attribution of plastic sources for a coastal zone.

    Weights derived from Lebreton et al. 2017 (river/ocean model) and
    Schmidt et al. 2017 (riverine plastic input study).
    """
    ship_density = zone_features.get("ship_density_count", 0)
    river_discharge = zone_features.get("river_discharge_m3s", 0)
    fishing_hours = zone_features.get("fishing_vessel_hours", 0)

    # Normalize inputs to comparable scales
    ship_norm = min(ship_density / 150.0, 2.0)
    river_norm = min(river_discharge / 80.0, 2.0)
    fishing_norm = min(fishing_hours / 40.0, 2.0)

    shipping_score = ship_norm * 0.40
    river_score = river_norm * 0.35
    fishing_score = fishing_norm * 0.15
    drift_score = 0.10  # baseline open ocean drift

    total = shipping_score + river_score + fishing_score + drift_score
    if total == 0:
        total = 1.0

    return {
        "shipping_pct": round(shipping_score / total * 100, 1),
        "river_runoff_pct": round(river_score / total * 100, 1),
        "fishing_nets_pct": round(fishing_score / total * 100, 1),
        "open_ocean_drift_pct": round(drift_score / total * 100, 1),
    }


def generate_interventions(
    attribution: dict,
    zone_features: dict,
    top_rivers: list = None,
    zone_name: str = "this zone",
) -> list:
    """
    Generate prioritized, actionable interventions based on source attribution.
    """
    interventions = []
    shipping_pct = attribution.get("shipping_pct", 0)
    river_pct = attribution.get("river_runoff_pct", 0)
    fishing_pct = attribution.get("fishing_nets_pct", 0)

    if shipping_pct > 35:
        reduction = round(shipping_pct * 0.55)
        interventions.append({
            "action": f"Reroute major shipping lanes near {zone_name} 15km offshore",
            "estimated_reduction_pct": reduction,
            "cost_usd": 0,
            "feasibility": "high",
            "source_type": "shipping",
            "description": (
                f"Shipping contributes {shipping_pct:.0f}% of plastic load. "
                "MARPOL Annex V zone designation can achieve ~38% reduction with zero infrastructure cost."
            ),
        })

    if river_pct > 28:
        river_name = (top_rivers[0] if top_rivers else "main river") + " mouth"
        reduction = round(river_pct * 0.65)
        interventions.append({
            "action": f"Deploy plastic interceptor at {river_name}",
            "estimated_reduction_pct": reduction,
            "cost_usd": 250000,
            "feasibility": "medium",
            "source_type": "river",
            "description": (
                f"River runoff accounts for {river_pct:.0f}% of plastic input. "
                "A single Interceptor 004 unit can remove ~1000kg/day at peak monsoon flow."
            ),
        })

    if fishing_pct > 20:
        reduction = round(fishing_pct * 0.50)
        interventions.append({
            "action": f"Establish fishing gear buyback program at {zone_name} harbour",
            "estimated_reduction_pct": reduction,
            "cost_usd": 80000,
            "feasibility": "high",
            "source_type": "fishing",
            "description": (
                f"Ghost gear and fishing nets make up {fishing_pct:.0f}% of plastic. "
                "FAO-recognized gear exchange programs reduce fishing-related plastic by 40–60%."
            ),
        })

    # Always add a monitoring intervention
    interventions.append({
        "action": "Install real-time plastic monitoring buoys",
        "estimated_reduction_pct": 0,
        "cost_usd": 45000,
        "feasibility": "high",
        "source_type": "monitoring",
        "description": "Data-driven monitoring improves intervention targeting accuracy by ~40%.",
    })

    return interventions


# ─────────────────────────────────────────────────────────
# SIMULATION CALCULATOR
# ─────────────────────────────────────────────────────────

def calculate_simulation(
    current_plastic_risk: float,
    current_carbon_pct: float,
    lost_tonnes_year: float,
    baseline_tonnes_year: float,
    plastic_reduction_pct: float,
    months_ahead: int,
) -> dict:
    """
    Project ecosystem recovery if plastic is reduced versus doing nothing.

    Assumptions:
      - Carbon absorption recovers at ~0.8% per month per 10% plastic reduction
        (gradual ecosystem recovery, non-linear)
      - Doing nothing: carbon degrades at 0.6% per month (ongoing stress)
      - Recovery asymptotes toward the healthy baseline
    """
    # ── "If we act" projection ──────────────────────────
    plastic_factor = plastic_reduction_pct / 100.0
    monthly_recovery_rate = plastic_factor * 0.008  # 0.8% per month per 10% reduction

    projected_carbon_pct = current_carbon_pct
    for _ in range(months_ahead):
        gap = 1.0 - projected_carbon_pct
        projected_carbon_pct += gap * monthly_recovery_rate
    projected_carbon_pct = min(1.0, round(projected_carbon_pct, 3))

    projected_actual_tonnes = round(baseline_tonnes_year * projected_carbon_pct)
    projected_lost_tonnes = baseline_tonnes_year - projected_actual_tonnes
    projected_monthly_damage = calculate_damage_cost(projected_lost_tonnes, "monthly")

    current_monthly_damage = calculate_damage_cost(lost_tonnes_year, "monthly")
    damage_saved_usd = round(
        (current_monthly_damage["headline_damage_usd"] - projected_monthly_damage["headline_damage_usd"])
        * months_ahead, 2
    )

    absorption_recovery_pct = round(
        (projected_carbon_pct - current_carbon_pct) / max(0.001, 1.0 - current_carbon_pct) * 100, 1
    )

    # Estimate months to 50% recovery (half the gap to full health — practical metric)
    if plastic_reduction_pct > 0 and monthly_recovery_rate > 0:
        # Time to close 50% of the remaining gap: log(0.5) / log(1 - rate)
        months_to_half_recovery = math.ceil(
            math.log(0.5) / math.log(1 - monthly_recovery_rate)
        )
        months_to_full = min(months_to_half_recovery, 600)
    else:
        months_to_full = 999

    # ── "Do nothing" projection ──────────────────────────
    monthly_degradation_rate = 0.006
    do_nothing_carbon_pct = current_carbon_pct
    for _ in range(months_ahead):
        do_nothing_carbon_pct *= (1 - monthly_degradation_rate)
    do_nothing_carbon_pct = max(0.0, round(do_nothing_carbon_pct, 3))

    do_nothing_lost_annual = round(baseline_tonnes_year * (1 - do_nothing_carbon_pct))
    do_nothing_damage = calculate_damage_cost(do_nothing_lost_annual, "annual")

    collapse_months = None
    if current_carbon_pct > 0.05:
        carbon_temp = current_carbon_pct
        m = 0
        while carbon_temp > 0.05 and m < 240:
            carbon_temp *= (1 - monthly_degradation_rate)
            m += 1
        collapse_months = m

    return {
        "current_state": {
            "carbon_absorption_pct": current_carbon_pct,
            "monthly_damage_usd": current_monthly_damage["headline_damage_usd"],
        },
        "projected_state": {
            "carbon_absorption_pct": projected_carbon_pct,
            "absorption_recovery_pct": absorption_recovery_pct,
            "damage_saved_usd_total": damage_saved_usd,
            "months_to_recovery": min(months_to_full, 999),
        },
        "do_nothing_projection": {
            "carbon_absorption_pct_end": do_nothing_carbon_pct,
            "economic_loss_usd_year": do_nothing_damage["headline_damage_usd"],
            "ecosystem_collapse_months": collapse_months,
        },
    }
