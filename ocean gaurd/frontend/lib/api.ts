import axios from 'axios'
import { ZONE_MAP } from '@/lib/zones'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
})

// ── Types ────────────────────────────────────────────────────────────────────

export interface ZonesSummary {
  zones: ZoneListItem[]
  summary: {
    total_monthly_damage_usd: number
    zones_monitored: number
    worst_zone: string
    worst_zone_id: string
  }
}

export interface ZoneListItem {
  id: string
  name: string
  lat: number
  lon: number
  risk_score: number
  risk_label: string
  carbon_absorption_pct: number
  monthly_damage_usd: number
  last_updated: string
}

export interface PlasticRiskResult {
  zone_id: string
  plastic_risk_score: number
  risk_label: string
  confidence_interval: [number, number]
  top_contributing_features: { feature: string; importance: number }[]
  last_updated: string
}

export interface CarbonResult {
  carbon_absorption_pct: number
  baseline_absorption_tonnes_year: number
  actual_absorption_tonnes_year: number
  lost_absorption_tonnes_year: number
  vegetation_health: {
    seagrass_ndvi: number
    baseline_ndvi: number
    turbidity_ntu: number
    water_temp_c: number
  }
}

export interface DamageResult {
  period: string
  lost_absorption_tonnes: number
  carbon_prices: {
    voluntary_market_usd: number
    eu_ets_usd: number
    social_cost_carbon_usd: number
  }
  headline_damage_usd: number
  equivalent_to: string
}

export interface SourceResult {
  attribution: {
    shipping_pct: number
    river_runoff_pct: number
    fishing_nets_pct: number
    open_ocean_drift_pct: number
  }
  top_shipping_lanes: string[]
  top_rivers: string[]
  interventions: {
    action: string
    estimated_reduction_pct: number
    cost_usd: number
    feasibility: string
    description?: string
  }[]
}

export interface SimulateResult {
  current_state: { carbon_absorption_pct: number; monthly_damage_usd: number }
  projected_state: {
    carbon_absorption_pct: number
    absorption_recovery_pct: number
    damage_saved_usd_total: number
    months_to_recovery: number
  }
  do_nothing_projection: {
    carbon_absorption_pct_end: number
    economic_loss_usd_year: number
    ecosystem_collapse_months: number | null
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve lat/lon from a zone_id string. Fallback to Mumbai if unknown. */
function zoneToLatLon(zone_id: string): { lat: number; lon: number } {
  const z = ZONE_MAP[zone_id]
  if (z) return { lat: z.lat, lon: z.lon }
  // For custom USR- zones, parse the stored lat/lon from the zone name isn't possible here,
  // so fall back to Mumbai (safe default for Indian ocean context)
  return { lat: 18.92, lon: 72.82 }
}

// ── API Calls ─────────────────────────────────────────────────────────────────

export const fetchZones = (): Promise<ZonesSummary> =>
  api.get('/api/zones').then(r => r.data)

export const fetchPlasticRisk = (lat: number, lon: number, radius_km = 50): Promise<PlasticRiskResult> =>
  api.post('/api/plastic-risk', { lat, lon, radius_km }).then(r => r.data)

/** Fetch carbon absorption for a zone — converts zone_id → lat/lon automatically */
export const fetchCarbon = (zone_id: string, radius_km = 50): Promise<CarbonResult> => {
  const { lat, lon } = zoneToLatLon(zone_id)
  return api.post('/api/carbon-absorption', { lat, lon, radius_km }).then(r => r.data)
}

/** Fetch economic damage for a zone — converts zone_id → lat/lon automatically */
export const fetchDamage = (zone_id: string, period = 'monthly', radius_km = 50): Promise<DamageResult> => {
  const { lat, lon } = zoneToLatLon(zone_id)
  return api.post('/api/damage-cost', { lat, lon, radius_km, period }).then(r => r.data)
}

/** Fetch plastic source attribution for a zone */
export const fetchSource = (zone_id: string, radius_km = 50): Promise<SourceResult> => {
  const { lat, lon } = zoneToLatLon(zone_id)
  return api.post('/api/plastic-source', { lat, lon, radius_km }).then(r => r.data)
}

/** Run recovery simulation */
export const fetchSimulation = (
  zone_id: string,
  plastic_reduction_pct: number,
  months_ahead: number,
  radius_km = 50,
): Promise<SimulateResult> => {
  const { lat, lon } = zoneToLatLon(zone_id)
  return api.post('/api/simulate', { lat, lon, plastic_reduction_pct, months_ahead, radius_km }).then(r => r.data)
}
