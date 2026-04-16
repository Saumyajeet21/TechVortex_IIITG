// Zone definitions for all 12 Indian coastal monitoring zones

export interface Zone {
  id: string
  name: string
  lat: number
  lon: number
  risk: number
  risk_label: 'LOW' | 'MEDIUM' | 'HIGH'
  carbon_pct: number
  damage_usd: number
  region: string
  description: string
  is_custom?: boolean
}

export const ZONES: Zone[] = [
  {
    id: 'MUM-001', name: 'Mumbai Coast', lat: 18.92, lon: 72.82,
    risk: 0.78, risk_label: 'HIGH', carbon_pct: 0.34, damage_usd: 29837,
    region: 'Maharashtra',
    description: 'High shipping traffic zone near Mumbai port with Ulhas and Mithi river outflows.',
  },
  {
    id: 'CHN-001', name: 'Chennai Marina', lat: 13.05, lon: 80.27,
    risk: 0.61, risk_label: 'MEDIUM', carbon_pct: 0.52, damage_usd: 18200,
    region: 'Tamil Nadu',
    description: "World's longest urban beach facing Bay of Bengal with high fishing vessel activity.",
  },
  {
    id: 'KOC-001', name: 'Kochi Backwaters', lat: 9.93, lon: 76.26,
    risk: 0.44, risk_label: 'MEDIUM', carbon_pct: 0.71, damage_usd: 9100,
    region: 'Kerala',
    description: 'Rich mangrove ecosystem in Vembanad Lake region. Periyar River main inflow.',
  },
  {
    id: 'SUN-001', name: 'Sundarbans Delta', lat: 21.94, lon: 89.18,
    risk: 0.83, risk_label: 'HIGH', carbon_pct: 0.28, damage_usd: 41500,
    region: 'West Bengal',
    description: "World's largest mangrove delta. Critical carbon sink under severe plastic stress.",
  },
  {
    id: 'GOA-001', name: 'Goa North Coast', lat: 15.49, lon: 73.82,
    risk: 0.29, risk_label: 'LOW', carbon_pct: 0.86, damage_usd: 4200,
    region: 'Goa',
    description: 'Relatively pristine coastal zone. Mandovi and Zuari rivers. Tourism pressure manageable.',
  },
  {
    id: 'VIZ-001', name: 'Visakhapatnam Coast', lat: 17.68, lon: 83.22,
    risk: 0.67, risk_label: 'HIGH', carbon_pct: 0.45, damage_usd: 21600,
    region: 'Andhra Pradesh',
    description: 'Industrial port city with steel plant discharges. Bay of Bengal fishing hotspot.',
  },
  {
    id: 'ORS-001', name: 'Odisha Coast', lat: 19.90, lon: 86.10,
    risk: 0.58, risk_label: 'MEDIUM', carbon_pct: 0.55, damage_usd: 14300,
    region: 'Odisha',
    description: 'Chilika Lake biodiversity hotspot. Mahanadi delta under heavy agricultural runoff.',
  },
  {
    id: 'AND-001', name: 'Andaman Islands', lat: 11.74, lon: 92.66,
    risk: 0.22, risk_label: 'LOW', carbon_pct: 0.91, damage_usd: 3100,
    region: 'Andaman & Nicobar',
    description: 'Pristine coral reefs. Remote location shields from mainland pollution.',
  },
  {
    id: 'MAN-001', name: 'Gulf of Mannar', lat: 9.10, lon: 79.10,
    risk: 0.52, risk_label: 'MEDIUM', carbon_pct: 0.63, damage_usd: 11800,
    region: 'Tamil Nadu',
    description: 'Marine national park with seagrass beds. Heavy pearl oyster fishing activity.',
  },
  {
    id: 'KUT-001', name: 'Gulf of Kutch', lat: 22.60, lon: 70.20,
    risk: 0.71, risk_label: 'HIGH', carbon_pct: 0.38, damage_usd: 24500,
    region: 'Gujarat',
    description: 'Major industrial port zone. ONGC oil operations and refinery discharges.',
  },
  {
    id: 'MAN-002', name: 'Mangalore Coast', lat: 12.87, lon: 74.84,
    risk: 0.48, risk_label: 'MEDIUM', carbon_pct: 0.67, damage_usd: 12900,
    region: 'Karnataka',
    description: 'Netravathi river delta. Mangalore port shipping traffic increasing rapidly.',
  },
  {
    id: 'PAR-001', name: 'Paradip Port', lat: 20.32, lon: 86.61,
    risk: 0.74, risk_label: 'HIGH', carbon_pct: 0.33, damage_usd: 27800,
    region: 'Odisha',
    description: "India's eastern gateway port. Mahanadi outflow makes this a high-risk accumulation zone.",
  },
]

export const ZONE_MAP = Object.fromEntries(ZONES.map(z => [z.id, z]))

export function getRiskColor(risk: number): string {
  if (risk < 0.3) return '#22c55e'
  if (risk < 0.6) return '#f59e0b'
  return '#ef4444'
}

export function getRiskBg(label: string): string {
  if (label === 'LOW') return 'bg-green-500/20 text-green-400 border-green-500/30'
  if (label === 'MEDIUM') return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  return 'bg-red-500/20 text-red-400 border-red-500/30'
}

export function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`
  return `$${val.toFixed(0)}`
}
