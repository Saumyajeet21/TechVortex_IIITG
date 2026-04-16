import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { useState } from 'react'
import { Info } from 'lucide-react'

interface Attribution {
  shipping_pct: number
  river_runoff_pct: number
  fishing_nets_pct: number
  open_ocean_drift_pct: number
}

interface Intervention {
  action: string
  estimated_reduction_pct: number
  cost_usd: number
  feasibility: string
  source_type?: string
  description?: string
}

interface Props {
  attribution: Attribution
  interventions: Intervention[]
  topRivers?: string[]
  topShippingLanes?: string[]
}

const SOURCES = [
  { key: 'shipping_pct',         label: 'Shipping',     color: '#3b82f6', icon: '🚢' },
  { key: 'river_runoff_pct',     label: 'River Runoff', color: '#06b6d4', icon: '🌊' },
  { key: 'fishing_nets_pct',     label: 'Fishing Nets', color: '#8b5cf6', icon: '🎣' },
  { key: 'open_ocean_drift_pct', label: 'Ocean Drift',  color: '#64748b', icon: '🌐' },
] as const

const FEASIBILITY_COLOR: Record<string, string> = {
  high: '#22c55e', medium: '#f59e0b', low: '#ef4444',
}

interface DataItem {
  name: string
  label: string
  value: number
  color: string
  icon: string
  key: string
}

export default function SourceBreakdown({ attribution, interventions, topRivers, topShippingLanes }: Props) {
  const [hoveredSource, setHoveredSource] = useState<string | null>(null)

  const data: DataItem[] = SOURCES.map(s => ({
    name: s.label,
    label: s.label,
    value: attribution[s.key as keyof Attribution] ?? 0,
    color: s.color,
    icon: s.icon,
    key: s.key,
  }))

  return (
    <div className="space-y-5">
      {/* Stacked visualization */}
      <div className="flex rounded-xl overflow-hidden h-10 w-full">
        {data.map(d => (
          <div
            key={d.key}
            className="flex items-center justify-center transition-all duration-300 cursor-pointer relative"
            style={{
              width: `${d.value}%`,
              background: d.color,
              opacity: hoveredSource && hoveredSource !== d.key ? 0.4 : 1,
            }}
            onMouseEnter={() => setHoveredSource(d.key)}
            onMouseLeave={() => setHoveredSource(null)}
          >
            {d.value > 12 && (
              <span className="text-white text-xs font-bold select-none">
                {d.value.toFixed(0)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {data.map(d => (
          <div
            key={d.key}
            className="flex items-center gap-2 cursor-pointer p-2 rounded-lg transition-all"
            style={{ background: hoveredSource === d.key ? `${d.color}15` : 'transparent' }}
            onMouseEnter={() => setHoveredSource(d.key)}
            onMouseLeave={() => setHoveredSource(null)}
          >
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-xs text-slate-300">{d.icon} {d.label}</span>
            <span className="ml-auto text-xs font-semibold text-white">{d.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 30 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: 'rgba(8,47,73,0.95)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 8, color: '#fff', fontSize: 12 }}
              formatter={(v: number) => [`${v.toFixed(1)}%`, 'Share']}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map(d => <Cell key={d.key} fill={d.color} />)}
              <LabelList dataKey="value" position="right" formatter={(v: number) => `${v.toFixed(0)}%`}
                style={{ fill: '#94a3b8', fontSize: 11 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Interventions */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-ocean-300 uppercase tracking-wider">Recommended Interventions</h4>
        {interventions.slice(0, 3).map((iv, i) => (
          <div key={i} className="glass-card p-3 !rounded-lg">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-xs text-white font-medium leading-snug">{iv.action}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: `${FEASIBILITY_COLOR[iv.feasibility]}20`, color: FEASIBILITY_COLOR[iv.feasibility] }}>
                {iv.feasibility}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs text-green-400">↓ {iv.estimated_reduction_pct}% reduction</span>
              <span className="text-xs text-slate-400">
                {iv.cost_usd === 0 ? 'Zero cost' : `$${(iv.cost_usd/1000).toFixed(0)}K investment`}
              </span>
            </div>
            {iv.description && (
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{iv.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
