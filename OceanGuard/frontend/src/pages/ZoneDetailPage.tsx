import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ZONE_MAP, formatCurrency } from '@/lib/zones'
import { fetchCarbon, fetchSource, fetchDamage, CarbonResult, SourceResult, DamageResult } from '@/lib/api'
import CarbonPriceDisplay from '@/components/CarbonPriceDisplay'
import SourceBreakdown from '@/components/SourceBreakdown'
import RecoverySimulator from '@/components/RecoverySimulator'
import { ArrowLeft, Droplets, Thermometer, Leaf, AlertTriangle, Waves, Loader2, RefreshCw } from 'lucide-react'

export default function ZoneDetailPage() {
  const { zoneId } = useParams<{ zoneId: string }>()
  const navigate = useNavigate()
  const zone = ZONE_MAP[zoneId!]

  const [carbon, setCarbon]   = useState<CarbonResult | null>(null)
  const [source, setSource]   = useState<SourceResult | null>(null)
  const [damage, setDamage]   = useState<DamageResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'source' | 'simulator'>('overview')

  const load = () => {
    if (!zoneId) return
    setLoading(true)
    setError('')
    Promise.all([
      fetchCarbon(zoneId),
      fetchSource(zoneId),
      fetchDamage(zoneId, 'monthly'),
    ]).then(([c, s, d]) => {
      setCarbon(c)
      setSource(s)
      setDamage(d)
    }).catch(e => {
      console.error(e)
      setError(e?.response?.data?.detail || e?.message || 'Failed to load zone data. Is the backend running on port 8000?')
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [zoneId])

  if (!zone) return (
    <div className="relative min-h-screen flex items-center justify-center">
      <div className="ocean-bg" />
      <div className="relative z-10 glass-card p-8 text-center">
        <p className="text-slate-400 mb-4">Zone <code className="text-ocean-300">{zoneId}</code> not found.</p>
        <button onClick={() => navigate(-1)} className="btn-ocean px-4 py-2 text-sm">← Go Back</button>
      </div>
    </div>
  )

  const riskColor = zone.risk >= 0.6 ? '#ef4444' : zone.risk >= 0.3 ? '#f59e0b' : '#22c55e'

  return (
    <div className="relative min-h-screen">
      <div className="ocean-bg" />
      <div className="relative z-10">
        {/* Nav */}
        <header className="border-b border-ocean-800/40 bg-ocean-950/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
            <button onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-ocean-400 hover:text-ocean-300 transition-colors">
              <ArrowLeft size={14} /> Back
            </button>
            <div className="w-px h-4 bg-ocean-800" />
            <div className="flex items-center gap-2">
              <Waves size={16} className="text-ocean-400" />
              <span className="font-bold text-white text-sm">OceanGuard</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-slate-400">{zone.region}</span>
              <button onClick={load} className="text-slate-500 hover:text-ocean-300 transition-colors" title="Reload data">
                <RefreshCw size={13} />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          {/* Hero */}
          <div className="glass-card p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-extrabold text-white">{zone.name}</h1>
                  <span className="px-3 py-1 rounded-full text-sm font-bold"
                    style={{ background: `${riskColor}20`, color: riskColor, border: `1px solid ${riskColor}40` }}>
                    {zone.risk_label} RISK
                  </span>
                </div>
                <p className="text-slate-400 text-sm max-w-lg">{zone.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 min-w-[240px]">
                {[
                  { label: 'Plastic Risk',  value: `${(zone.risk*100).toFixed(0)}%`,    color: riskColor },
                  { label: 'Carbon Health', value: `${(zone.carbon_pct*100).toFixed(0)}%`, color: '#22c55e' },
                  { label: 'Monthly Loss',  value: formatCurrency(zone.damage_usd),     color: '#f59e0b' },
                  { label: 'Zone ID',       value: zone.id,                             color: '#94a3b8' },
                ].map(m => (
                  <div key={m.label} className="stat-card !py-2.5 !px-3">
                    <p className="text-[10px] text-slate-500 uppercase">{m.label}</p>
                    <p className="text-base font-bold" style={{ color: m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-ocean-900/50 rounded-xl w-fit">
            {(['overview', 'source', 'simulator'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-ocean-600 text-white shadow-lg shadow-ocean-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}>
                {tab === 'overview' ? '📊 Overview' : tab === 'source' ? '🔍 Sources' : '🔮 Simulator'}
              </button>
            ))}
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-red-300 font-medium">Failed to load live data</p>
                <p className="text-xs text-slate-400 mt-0.5">{error}</p>
                <button onClick={load} className="text-xs text-ocean-300 hover:underline mt-1">Retry →</button>
              </div>
            </div>
          )}

          {/* Loading spinner */}
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 size={20} className="text-ocean-400 animate-spin" />
              <span className="text-slate-400 text-sm">Fetching live ocean data…</span>
            </div>
          )}

          {/* ── OVERVIEW ─────────────────────────────────────────────── */}
          {!loading && activeTab === 'overview' && (
            <div className="space-y-6">
              {carbon ? (
                <>
                  {/* Vegetation health */}
                  <div className="glass-card p-5">
                    <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                      <Leaf size={16} className="text-green-400" /> Vegetation &amp; Water Health
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      {[
                        { icon: <Leaf size={14} />,        label: 'Live NDVI',     value: carbon.vegetation_health?.seagrass_ndvi?.toFixed(3) ?? '—', sub: 'Seagrass vitality',    color: '#22c55e' },
                        { icon: <Leaf size={14} />,        label: 'Baseline NDVI', value: carbon.vegetation_health?.baseline_ndvi?.toFixed(3) ?? '—', sub: '5-year healthy mean',  color: '#94a3b8' },
                        { icon: <Droplets size={14} />,    label: 'Turbidity',     value: `${carbon.vegetation_health?.turbidity_ntu?.toFixed(1) ?? '—'} NTU`, sub: 'Water clarity', color: '#3b82f6' },
                        { icon: <Thermometer size={14} />, label: 'Sea Temp',      value: `${carbon.vegetation_health?.water_temp_c?.toFixed(1) ?? '—'} °C`, sub: 'Surface temp', color: '#f59e0b' },
                      ].map(m => (
                        <div key={m.label} className="stat-card">
                          <div className="flex items-center gap-1.5 mb-1" style={{ color: m.color }}>{m.icon}
                            <span className="text-[10px] uppercase tracking-wider text-slate-400">{m.label}</span>
                          </div>
                          <p className="text-xl font-bold" style={{ color: m.color }}>{m.value}</p>
                          <p className="text-[10px] text-slate-600">{m.sub}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid md:grid-cols-3 gap-3">
                      {[
                        { label: 'Baseline Absorption', value: `${((carbon.baseline_absorption_tonnes_year || 0)/1000).toFixed(1)}K`, unit: 'tCO₂/year', color: '#94a3b8' },
                        { label: 'Actual Absorption',   value: `${((carbon.actual_absorption_tonnes_year   || 0)/1000).toFixed(1)}K`, unit: 'tCO₂/year', color: '#22c55e' },
                        { label: 'Lost Absorption',     value: `${((carbon.lost_absorption_tonnes_year     || 0)/1000).toFixed(1)}K`, unit: 'tCO₂/year', color: '#ef4444' },
                      ].map(m => (
                        <div key={m.label} className="rounded-xl p-3 text-center"
                          style={{ background: `${m.color}10`, border: `1px solid ${m.color}25` }}>
                          <p className="text-[10px] text-slate-400 uppercase mb-1">{m.label}</p>
                          <p className="text-2xl font-extrabold" style={{ color: m.color }}>{m.value}</p>
                          <p className="text-[10px] text-slate-500">{m.unit}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Economic damage */}
                  {damage && (
                    <div className="glass-card p-5">
                      <h2 className="font-bold text-white mb-4">💰 Economic Damage</h2>
                      <CarbonPriceDisplay prices={damage.carbon_prices} period="monthly" />
                      <p className="text-xs text-slate-500 mt-3 text-center">≡ {damage.equivalent_to}</p>
                    </div>
                  )}
                </>
              ) : !error ? (
                <div className="glass-card p-8 text-center">
                  <p className="text-slate-400 text-sm">No live data available for this zone yet.</p>
                  <p className="text-slate-500 text-xs mt-1">The scheduler will populate data every 3 hours. <button onClick={load} className="text-ocean-300 hover:underline">Retry now →</button></p>
                </div>
              ) : null}
            </div>
          )}

          {/* ── SOURCE ─────────────────────────────────────────────── */}
          {!loading && activeTab === 'source' && (
            source ? (
              <div className="glass-card p-5">
                <h2 className="font-bold text-white mb-4">🔍 Plastic Source Attribution</h2>
                <SourceBreakdown
                  attribution={source.attribution}
                  interventions={source.interventions}
                  topRivers={source.top_rivers}
                  topShippingLanes={source.top_shipping_lanes}
                />
              </div>
            ) : !error ? (
              <div className="glass-card p-8 text-center">
                <p className="text-slate-400 text-sm">Source data unavailable.</p>
                <button onClick={load} className="text-ocean-300 hover:underline text-xs mt-2">Retry →</button>
              </div>
            ) : null
          )}

          {/* ── SIMULATOR ─────────────────────────────────────────── */}
          {!loading && activeTab === 'simulator' && (
            <div className="glass-card p-5" id="simulator">
              <h2 className="font-bold text-white mb-1 flex items-center gap-2">🔮 Recovery Simulator</h2>
              <p className="text-xs text-slate-500 mb-5">
                Adjust sliders to model the impact of plastic reduction on ecosystem recovery and economic savings.
              </p>
              <RecoverySimulator zoneId={zoneId!} currentCarbonPct={zone.carbon_pct} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
