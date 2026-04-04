'use client'
import { useState } from 'react'
import { ZONES, formatCurrency } from '@/lib/zones'
import ZoneCard from '@/components/ZoneCard'
import LocationAnalyzer from '@/components/LocationAnalyzer'
import { Activity, Globe, TrendingDown, AlertTriangle, Waves, Leaf } from 'lucide-react'

const TOTAL_DAMAGE = ZONES.reduce((s, z) => s + z.damage_usd, 0)
const WORST_ZONE   = ZONES.reduce((a, b) => a.risk > b.risk ? a : b)
const AVG_CARBON   = Math.round(ZONES.reduce((s, z) => s + z.carbon_pct, 0) / ZONES.length * 100)

export default function DashboardPage() {
  const [highlightedZone, setHighlightedZone] = useState<string | null>(null)

  return (
    <div className="relative min-h-screen">
      <div className="ocean-bg" />

      <div className="relative z-10">
        {/* ── Nav ─────────────────────────────────────────── */}
        <header className="border-b border-ocean-800/40 bg-ocean-950/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ocean-400 to-ocean-700 flex items-center justify-center animate-pulse-slow">
                <Waves size={16} className="text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-white text-base tracking-tight">OceanGuard</h1>
                <p className="text-[10px] text-ocean-400 -mt-0.5">Ocean Plastic Climate Monitor</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-slate-400">Live data</span>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

          {/* ── Hero Stat Bar ──────────────────────────────── */}
          <section>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: <TrendingDown size={14} className="text-red-400" />,    label: 'Monthly Loss',     value: formatCurrency(TOTAL_DAMAGE), sub: 'across all zones (VCM)',    color: 'text-red-400' },
                { icon: <Globe size={14} className="text-ocean-400" />,          label: 'Zones Monitored', value: `${ZONES.length}`,              sub: 'Indian coastal sites',     color: 'text-ocean-400' },
                { icon: <AlertTriangle size={14} className="text-amber-400" />, label: 'Critical Zones',  value: `${ZONES.filter(z => z.risk_label === 'HIGH').length}`, sub: 'require urgent action', color: 'text-amber-400' },
                { icon: <Leaf size={14} className="text-green-400" />,           label: 'Avg Carbon Health', value: `${AVG_CARBON}%`,             sub: 'ecosystem absorption',     color: 'text-green-400' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="flex items-center gap-2 mb-1">{s.icon}
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</span>
                  </div>
                  <p className={`text-2xl font-extrabold ${s.color} damage-number`}>{s.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Main content: Analyzer left, zone cards right ── */}
          <section className="grid lg:grid-cols-3 gap-6">

            {/* Left column — Analyzer */}
            <div className="lg:col-span-1">
              <LocationAnalyzer />

              {/* System summary below the analyzer */}
              <div className="glass-card p-4 mt-4">
                <h3 className="font-bold text-white text-sm mb-3">📊 System Overview</h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Avg Plastic Risk',   value: `${Math.round(ZONES.reduce((s,z)=>s+z.risk,0)/ZONES.length*100)}%`, color:'#f59e0b' },
                    { label: 'Annual Economic Loss', value: formatCurrency(TOTAL_DAMAGE * 12), color:'#ef4444' },
                    { label: 'Worst Zone',           value: WORST_ZONE.name,                    color:'#a78bfa' },
                  ].map(m => (
                    <div key={m.label} className="flex justify-between items-center py-1 border-b border-ocean-800/30 last:border-0">
                      <span className="text-xs text-slate-400">{m.label}</span>
                      <span className="text-xs font-bold" style={{ color: m.color }}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column — Zone cards */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-white text-lg">🌊 Monitored Zones</h2>
                <span className="text-xs text-slate-500">{ZONES.length} zones · sorted by risk</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {ZONES.sort((a, b) => b.risk - a.risk).map(zone => (
                  <ZoneCard key={zone.id} zone={zone} />
                ))}
              </div>
            </div>

          </section>

          {/* ── Footer ─────────────────────────────────────── */}
          <footer className="pb-6 text-center text-[11px] text-slate-700 space-y-1">
            <p>OceanGuard · Data: Open-Meteo Marine API · Global Fishing Watch · OSM Overpass · MODIS NDVI · CMEMS</p>
            <p>Models: XGBoost plastic risk · Random Forest carbon absorption · Lebreton et al. 2017 source attribution</p>
          </footer>
        </div>
      </div>
    </div>
  )
}
