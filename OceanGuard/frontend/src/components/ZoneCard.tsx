import { Zone, getRiskBg, formatCurrency } from '@/lib/zones'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Leaf, DollarSign, ArrowRight, Zap } from 'lucide-react'

interface Props {
  zone: Zone
  onSimulate?: (zoneId: string) => void
}

export default function ZoneCard({ zone, onSimulate }: Props) {
  const navigate = useNavigate()
  const riskPct = Math.round(zone.risk * 100)
  const carbonPct = Math.round(zone.carbon_pct * 100)

  const riskColor =
    zone.risk_label === 'HIGH' ? '#ef4444'
    : zone.risk_label === 'MEDIUM' ? '#f59e0b'
    : '#22c55e'

  const glowClass =
    zone.risk_label === 'HIGH' ? 'glow-high'
    : zone.risk_label === 'MEDIUM' ? 'glow-medium'
    : 'glow-low'

  return (
    <div className={`glass-card p-5 flex flex-col gap-4 cursor-pointer ${glowClass}`}
      onClick={() => navigate(`/zones/${zone.id}`)}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-white text-base leading-tight">{zone.name}</h3>
          <p className="text-ocean-400 text-xs mt-0.5">{zone.region}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getRiskBg(zone.risk_label)}`}>
          ● {zone.risk_label} RISK
        </span>
      </div>

      {/* Progress Bars */}
      <div className="space-y-3">
        {/* Plastic Risk */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <AlertTriangle size={11} className="text-slate-400" /> Plastic Risk
            </span>
            <span className="text-xs font-semibold" style={{ color: riskColor }}>{riskPct}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${riskPct}%`, background: `linear-gradient(90deg, ${riskColor}99, ${riskColor})` }}
            />
          </div>
        </div>

        {/* Carbon Health */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Leaf size={11} className="text-green-400" /> Carbon Health
            </span>
            <span className="text-xs font-semibold text-green-400">{carbonPct}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${carbonPct}%`, background: 'linear-gradient(90deg, #16a34a99, #22c55e)' }}
            />
          </div>
        </div>
      </div>

      {/* Damage Figure */}
      <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
        <div className="flex items-center gap-1.5">
          <DollarSign size={13} className="text-amber-400" />
          <span className="text-xs text-slate-400">Monthly damage</span>
        </div>
        <span className="text-amber-400 font-bold text-sm damage-number">
          {formatCurrency(zone.damage_usd)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={e => { e.stopPropagation(); navigate(`/zones/${zone.id}`) }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium
            bg-ocean-600/20 hover:bg-ocean-600/40 border border-ocean-600/30 text-ocean-300
            transition-all duration-200">
          View Details <ArrowRight size={11} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onSimulate?.(zone.id); navigate(`/zones/${zone.id}#simulator`) }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium
            bg-purple-600/20 hover:bg-purple-600/40 border border-purple-600/30 text-purple-300
            transition-all duration-200">
          <Zap size={11} /> Simulate
        </button>
      </div>
    </div>
  )
}
