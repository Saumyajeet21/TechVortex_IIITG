'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, MapPin, Navigation, AlertTriangle, CheckCircle, Loader2, X, Waves } from 'lucide-react'
import axios from 'axios'

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''

// 35 real Indian shoreline reference points (lat, lon)
const INDIAN_COASTAL_POINTS: [number, number][] = [
  [23.22, 69.67], [22.47, 69.12], [22.30, 72.63], [21.19, 72.83], [20.46, 72.90],
  [19.07, 72.87], [18.40, 73.08], [17.68, 73.31], [16.70, 73.83], [15.49, 73.82],
  [14.80, 74.13], [13.86, 74.69], [12.87, 74.84], [12.30, 74.71], [11.87, 75.35],
  [10.52, 76.21], [9.97,  76.24], [8.73,  76.98], [8.09,  77.55], [8.74,  78.10],
  [9.28,  79.32], [10.77, 79.84], [11.40, 79.69], [11.94, 79.83], [13.06, 80.28],
  [14.45, 80.03], [15.48, 80.35], [16.31, 81.14], [17.68, 83.22], [19.30, 84.80],
  [20.26, 85.83], [20.97, 86.73], [21.60, 87.48], [21.94, 89.18], [22.17, 88.92],
  [11.74, 92.66], [10.00, 92.50], [10.57, 72.64],
]

const COASTAL_MAX_KM = 150

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function isNearIndianCoast(lat: number, lon: number): boolean {
  // Quick bounding box: only check if within India's rough extent
  if (lat < 6 || lat > 25 || lon < 68 || lon > 97) {
    // Outside India — allow (will be validated server-side)
    return true
  }
  const minDist = Math.min(...INDIAN_COASTAL_POINTS.map(([clat, clon]) =>
    haversineKm(lat, lon, clat, clon)
  ))
  return minDist <= COASTAL_MAX_KM
}


interface Suggestion { display_name: string; lat: string; lon: string }
interface CoastalResult {
  is_coastal: boolean
  region?: string
  message: string
  suggestions?: { city: string; distance_km: number }[]
}

interface AnalysisResult {
  location: string
  lat: number
  lon: number
  radius_km: number
  plastic: any
  carbon: any
  damage: any
  coastal_region?: string
}

interface Props {
  onResult?: (result: AnalysisResult) => void
}

function isLikelyLandlocked(lat: number, lon: number): string | null {
  if (!isNearIndianCoast(lat, lon)) {
    return 'Inland area'
  }
  return null
}

export default function LocationAnalyzer({ onResult }: Props) {
  const [query, setQuery] = useState('')
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [radius, setRadius] = useState(50)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [coastal, setCoastal] = useState<CoastalResult | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [locationName, setLocationName] = useState('')
  const [autoFilled, setAutoFilled] = useState(false)
  const [improving, setImproving] = useState(false)
  const [improvements, setImprovements] = useState<any>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // ── Geocoding: Google Maps or Nominatim fallback ───────────────────────────
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 3) { setSuggestions([]); return }

    try {
      if (GOOGLE_MAPS_KEY) {
        // Google Places Autocomplete — restrict to coastal/marine types
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&types=geocode&key=${GOOGLE_MAPS_KEY}`
        // Note: Direct browser calls to Google Maps Places API require CORS proxy in production
        // Using Nominatim as primary client-side geocoder, Google Maps for server-side validation
        throw new Error('use-nominatim') // fallthrough to Nominatim for client-side
      }
    } catch {}

    // Nominatim fallback (free, no key needed)
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await resp.json()
      // Filter to coastal results only using haversine distance to Indian shoreline
      const filtered = data.filter((d: any) => {
        const lat = parseFloat(d.lat)
        const lon = parseFloat(d.lon)
        if (isNaN(lat) || isNaN(lon)) return false
        return isNearIndianCoast(lat, lon)
      })
      setSuggestions(filtered.slice(0, 5))
    } catch {
      setSuggestions([])
    }
  }, [])

  const handleQueryChange = (val: string) => {
    setQuery(val)
    setCoastal(null)
    setError('')
    setAutoFilled(false)
    if (!val) { setLat(''); setLon('') }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350)
  }

  const selectSuggestion = async (s: Suggestion) => {
    const latVal = parseFloat(s.lat).toFixed(4)
    const lonVal = parseFloat(s.lon).toFixed(4)
    setQuery(s.display_name.split(',')[0])
    setLat(latVal)
    setLon(lonVal)
    setLocationName(s.display_name.split(',').slice(0, 2).join(','))
    setAutoFilled(true)
    setSuggestions([])
    // Validate coastal after selection
    await validateCoastal(parseFloat(latVal), parseFloat(lonVal))
  }

  const validateCoastal = async (latV: number, lonV: number) => {
    setValidating(true)
    setCoastal(null)

    // Quick client-side landlocked check
    const landlocked = isLikelyLandlocked(latV, lonV)
    if (landlocked) {
      setCoastal({
        is_coastal: false,
        message: `⚠️ ${landlocked} is landlocked — no ocean or sea nearby.`,
        suggestions: [
          { city: 'Mumbai, Maharashtra', distance_km: 0 },
          { city: 'Chennai, Tamil Nadu', distance_km: 0 },
          { city: 'Kochi, Kerala', distance_km: 0 },
          { city: 'Visakhapatnam, Andhra Pradesh', distance_km: 0 },
        ]
      })
      setValidating(false)
      return
    }

    // Server-side validation
    try {
      const resp = await axios.post(`${BACKEND}/api/validate-coastal`, {
        lat: latV, lon: lonV, location_name: locationName
      })
      setCoastal(resp.data)
    } catch {
      // If backend not available, proceed
      setCoastal({ is_coastal: true, message: '✅ Location accepted', region: 'Coastal Area' })
    }
    setValidating(false)
  }

  const handleAnalyze = async () => {
    const latV = parseFloat(lat)
    const lonV = parseFloat(lon)
    if (!lat || !lon || isNaN(latV) || isNaN(lonV)) {
      setError('Please search for a coastal city or enter coordinates.')
      return
    }
    if (coastal && !coastal.is_coastal) {
      setError('Please select a coastal location near the ocean.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const payload = { lat: latV, lon: lonV, radius_km: radius }
      const [plasticResp, carbonResp, damageResp] = await Promise.all([
        axios.post(`${BACKEND}/api/plastic-risk`, payload),
        axios.post(`${BACKEND}/api/carbon-absorption`, payload),
        axios.post(`${BACKEND}/api/damage-cost`, payload),
      ])

      const r: AnalysisResult = {
        location: locationName || query || `${latV}, ${lonV}`,
        lat: latV, lon: lonV, radius_km: radius,
        plastic: plasticResp.data,
        carbon: carbonResp.data,
        damage: damageResp.data,
        coastal_region: coastal?.region,
      }
      setResult(r)
      onResult?.(r)

      // Save to Supabase via backend
      try {
        await axios.post(`${BACKEND}/api/custom-analysis`, {
          location_name: r.location,
          lat: latV,
          lon: lonV,
          radius_km: radius,
          plastic: r.plastic,
          carbon: r.carbon,
          damage: r.damage,
        })
      } catch {} // non-critical
      setImprovements(null) // reset improvements on new search
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Backend not reachable. Is the server running on port 8000?')
    }
    setLoading(false)
  }

  const handleImprove = async () => {
    if (!result) return
    setImproving(true)
    try {
      const resp = await axios.post(`${BACKEND}/api/improve`, {
        zone_name: result.location,
        lat: result.lat,
        lon: result.lon,
        plastic_risk: result.plastic.plastic_risk_score,
        carbon_pct: result.carbon.carbon_absorption_pct,
        lost_tonnes: result.carbon.lost_absorption_tonnes_year,
        monthly_damage_usd: result.damage?.headline_damage_usd || 0,
        features: {},
      })
      setImprovements(resp.data)
    } catch {
      setImprovements({ error: 'Could not fetch suggestions. Please retry.' })
    }
    setImproving(false)
  }

  const riskColor = (label: string) =>
    label === 'HIGH' ? '#ef4444' : label === 'MEDIUM' ? '#f59e0b' : '#00ff88'

  const riskBg = (label: string) =>
    label === 'HIGH' ? 'rgba(239,68,68,0.1)' : label === 'MEDIUM' ? 'rgba(245,158,11,0.1)' : 'rgba(0,255,136,0.1)'

  return (
    <div className="space-y-4">
      {/* ── Search Card ───────────────────────────────────────────── */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Waves size={16} className="text-[#00d4ff]" />
          <h3 className="font-bold text-white text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Analyze Any Coastal Area
          </h3>
        </div>
        <p className="text-[11px] text-slate-400 mb-4">
          Search a coastal city — coordinates auto-fill. Inland areas are blocked.
        </p>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="e.g. Visakhapatnam, Kochi, Goa..."
            className="ocean-input w-full pl-8 pr-8 py-2.5 text-sm"
          />
          {query && (
            <button onClick={() => { setQuery(''); setLat(''); setLon(''); setCoastal(null); setSuggestions([]) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X size={13} />
            </button>
          )}

          {/* Dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg overflow-hidden border border-[rgba(0,212,255,0.2)] shadow-xl"
              style={{ background: '#0a1628' }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => selectSuggestion(s)}
                  className="w-full text-left px-3 py-2.5 text-xs text-slate-300 hover:bg-[rgba(0,212,255,0.08)] flex items-start gap-2 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                  <MapPin size={11} className="text-[#00d4ff] mt-0.5 shrink-0" />
                  <span className="line-clamp-1">{s.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Coastal Validation Feedback */}
        {validating && (
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
            <Loader2 size={12} className="animate-spin text-[#00d4ff]" />
            Validating coastal location...
          </div>
        )}

        {coastal && !validating && (
          <div className={`rounded-lg px-3 py-2.5 mb-3 text-xs flex items-start gap-2 ${
            coastal.is_coastal
              ? 'bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.2)] text-emerald-300'
              : 'bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-red-300'
          }`}>
            {coastal.is_coastal
              ? <CheckCircle size={13} className="text-emerald-400 mt-0.5 shrink-0" />
              : <AlertTriangle size={13} className="text-red-400 mt-0.5 shrink-0" />}
            <div>
              <p>{coastal.message}</p>
              {coastal.region && <p className="text-slate-400 mt-0.5">Region: {coastal.region}</p>}
              {!coastal.is_coastal && coastal.suggestions && (
                <div className="mt-2">
                  <p className="text-slate-400 mb-1">Try instead:</p>
                  <div className="flex flex-wrap gap-1">
                    {coastal.suggestions.map((s, i) => (
                      <button key={i}
                        onClick={() => { setQuery(s.city.split(',')[0]); fetchSuggestions(s.city) }}
                        className="tech-badge text-[10px] cursor-pointer hover:bg-[rgba(0,212,255,0.15)]">
                        {s.city.split(',')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lat / Lon inputs */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { label: 'LATITUDE', val: lat, set: setLat, placeholder: '-90 to 90' },
            { label: 'LONGITUDE', val: lon, set: setLon, placeholder: '-180 to 180' },
          ].map(f => (
            <div key={f.label}>
              <div className="flex items-center gap-1 mb-1">
                <Navigation size={9} className="text-slate-500" />
                <span className="text-[9px] text-slate-500 uppercase tracking-wider">{f.label}</span>
                {autoFilled && f.val && (
                  <span className="text-[8px] text-[#00d4ff] font-bold">● AUTO</span>
                )}
              </div>
              <input
                type="number"
                value={f.val}
                onChange={e => { f.set(e.target.value); setAutoFilled(false); setCoastal(null) }}
                placeholder={f.placeholder}
                className="ocean-input w-full px-2 py-2 text-sm font-mono"
              />
            </div>
          ))}
        </div>

        {/* Radius Chips */}
        <div className="mb-4">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-2">Analysis Radius</p>
          <div className="flex gap-2">
            {[25, 50, 100, 200].map(r => (
              <button key={r} onClick={() => setRadius(r)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  radius === r
                    ? 'bg-[#00d4ff] text-[#060d1a]'
                    : 'border border-[rgba(0,212,255,0.2)] text-slate-400 hover:border-[rgba(0,212,255,0.4)]'
                }`}>
                {r}km
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="text-xs text-red-400 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={loading || !lat || !lon || (coastal !== null && !coastal.is_coastal)}
          className="btn-ocean w-full py-2.5 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : <><Search size={14} /> Analyze This Area</>}
        </button>
      </div>

      {/* ── Result Card ───────────────────────────────────────────── */}
      {result && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {result.location}
              </h3>
              <p className="text-[10px] text-slate-400">
                {result.lat}°N, {result.lon}°E · {result.radius_km}km radius
                {result.coastal_region && ` · ${result.coastal_region}`}
              </p>
            </div>
            <span className="tech-badge">Live Analysis</span>
          </div>

          {/* Plastic Risk */}
          <div className="rounded-xl p-3.5" style={{ background: riskBg(result.plastic.risk_label), border: `1px solid ${riskColor(result.plastic.risk_label)}30` }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-300">⚠ Plastic Risk</span>
              <span className="text-lg font-black" style={{ color: riskColor(result.plastic.risk_label), fontFamily: 'Space Grotesk, sans-serif' }}>
                {Math.round(result.plastic.plastic_risk_score * 100)}%
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${result.plastic.plastic_risk_score * 100}%`, background: riskColor(result.plastic.risk_label) }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px]" style={{ color: riskColor(result.plastic.risk_label) }}>{result.plastic.risk_label} RISK</span>
              <span className="text-[10px] text-slate-500">CI: {Math.round(result.plastic.confidence_interval?.[0] * 100 || 0)}–{Math.round(result.plastic.confidence_interval?.[1] * 100 || 0)}%</span>
            </div>
          </div>

          {/* Carbon Health */}
          <div className="rounded-xl p-3.5 bg-[rgba(0,255,136,0.06)] border border-[rgba(0,255,136,0.15)]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-300">🌱 Carbon Health</span>
              <span className="text-lg font-black text-emerald-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {Math.round(result.carbon.carbon_absorption_pct * 100)}%
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${result.carbon.carbon_absorption_pct * 100}%`, background: 'linear-gradient(90deg, #10b981, #00ff88)' }} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Lost: <span className="text-red-400 font-bold">{result.carbon.lost_absorption_tonnes_year?.toLocaleString()} t CO₂/yr</span>
            </p>
          </div>

          {/* Economic Damage */}
          <div className="rounded-xl p-3.5 bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.15)]">
            <p className="text-xs font-semibold text-slate-300 mb-1.5">💸 Monthly Economic Damage</p>
            <p className="text-xl font-black text-red-400 damage-number">
              ${(result.damage?.headline_damage_usd || result.damage?.carbon_prices?.voluntary_market_usd || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{result.damage?.equivalent_to || 'Voluntary Carbon Market pricing'}</p>
          </div>
        </div>
      )}
      {/* ── Improvement Suggestions ────────────────────────────── */}
      {result && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-white text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>🤖 AI Carbon Improvement Plan</h3>
              <p className="text-[10px] text-slate-400">Powered by Gemini 2.0 Flash · Credit-saving mode</p>
            </div>
            {!improvements && (
              <button onClick={handleImprove} disabled={improving}
                className="px-3 py-1.5 text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, #00d4ff22, #00ff8822)', border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff' }}>
                {improving ? <><Loader2 size={11} className="animate-spin" /> Analyzing...</> : '✨ Get Improvement Plan'}
              </button>
            )}
          </div>

          {improvements && !improvements.error && (
            <div className="space-y-3">
              {/* Suggestions */}
              {improvements.suggestions?.map((s: any, i: number) => (
                <div key={i} className="rounded-lg p-3" style={{
                  background: s.priority === 'HIGH' ? 'rgba(239,68,68,0.07)' : s.priority === 'MEDIUM' ? 'rgba(245,158,11,0.07)' : 'rgba(34,197,94,0.07)',
                  border: `1px solid ${s.priority === 'HIGH' ? 'rgba(239,68,68,0.2)' : s.priority === 'MEDIUM' ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)'}`
                }}>
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <p className="text-xs font-bold text-white">{s.title}</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{
                      background: s.priority === 'HIGH' ? 'rgba(239,68,68,0.2)' : s.priority === 'MEDIUM' ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)',
                      color: s.priority === 'HIGH' ? '#ef4444' : s.priority === 'MEDIUM' ? '#f59e0b' : '#22c55e'
                    }}>{s.priority}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-1.5">{s.action}</p>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-emerald-400">+{s.carbon_credit_gain_tonnes_year?.toLocaleString()} t CO₂/yr</span>
                    <span className="text-slate-500">{s.timeline}</span>
                  </div>
                </div>
              ))}

              {/* Summary */}
              {(improvements.projected_recovery_pct || improvements.estimated_annual_credit_value_usd) && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(0,255,136,0.07)', border: '1px solid rgba(0,255,136,0.15)' }}>
                    <p className="text-lg font-black text-emerald-400">{improvements.projected_recovery_pct}%</p>
                    <p className="text-[9px] text-slate-400">Projected Recovery</p>
                  </div>
                  <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.15)' }}>
                    <p className="text-lg font-black text-[#00d4ff]">${improvements.estimated_annual_credit_value_usd?.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-400">Annual Credit Value</p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center text-[9px] text-slate-600 pt-1">
                <span>Source: {improvements.source === 'gemini-2.0-flash' ? '🤖 Gemini AI' : '📊 Rule-based analysis'}</span>
                <button onClick={() => setImprovements(null)} className="text-slate-500 hover:text-slate-300">✕ Clear</button>
              </div>
            </div>
          )}

          {improvements?.error && (
            <p className="text-xs text-red-400">{improvements.error}</p>
          )}

          {!improvements && !improving && (
            <p className="text-[10px] text-slate-500">
              Click the button above to get AI-powered suggestions to improve carbon absorption and earn more carbon credits.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
