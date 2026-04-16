import { Info } from 'lucide-react'
import CountUp from 'react-countup'

interface CarbonPrices {
  voluntary_market_usd: number
  eu_ets_usd: number
  social_cost_carbon_usd: number
}

interface Props {
  prices: CarbonPrices
  period?: string
}

const TIERS = [
  {
    key: 'voluntary_market_usd' as keyof CarbonPrices,
    label: 'Voluntary Market',
    sublabel: 'What corporations pay today',
    detail: '$15.50/tonne — VCM spot price (use_cache)',
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,0.08)',
    border: 'rgba(14,165,233,0.25)',
    badge: 'MARKET RATE',
  },
  {
    key: 'eu_ets_usd' as keyof CarbonPrices,
    label: 'EU Regulatory',
    sublabel: 'EU Emissions Trading Scheme',
    detail: '$75/tonne — what Europe charges industry',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.25)',
    badge: 'EU ETS',
  },
  {
    key: 'social_cost_carbon_usd' as keyof CarbonPrices,
    label: 'True Cost',
    sublabel: 'US EPA Social Cost of Carbon',
    detail: '$51/tonne — actual economic harm to society',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
    badge: 'EPA ESTIMATE',
  },
]

export default function CarbonPriceDisplay({ prices, period = 'monthly' }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {TIERS.map((tier, i) => {
        const value = prices[tier.key]
        const inK = value >= 1000
        return (
          <div
            key={tier.key}
            className="relative rounded-xl p-4 transition-all duration-300 hover:scale-[1.02]"
            style={{ background: tier.bg, border: `1px solid ${tier.border}` }}>

            {/* Badge */}
            <div className="absolute top-3 right-3">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: `${tier.color}20`, color: tier.color }}>
                {tier.badge}
              </span>
            </div>

            <p className="text-xs font-semibold mb-0.5" style={{ color: tier.color }}>{tier.label}</p>
            <p className="text-[10px] text-slate-500 mb-3">{tier.sublabel}</p>

            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold damage-number" style={{ color: tier.color }}>
                <CountUp
                  key={`${tier.key}-${value}`}
                  start={0}
                  end={inK ? value / 1000 : value}
                  decimals={inK ? 1 : 0}
                  duration={1.8}
                  delay={i * 0.2}
                  prefix="$"
                  suffix={inK ? 'K' : ''}
                />
              </span>
              <span className="text-xs text-slate-500">/{period}</span>
            </div>

            {/* Tooltip-style note */}
            <div className="mt-3 flex items-start gap-1.5">
              <Info size={10} className="flex-shrink-0 mt-0.5" style={{ color: tier.color, opacity: 0.6 }} />
              <p className="text-[10px] text-slate-600 leading-relaxed">{tier.detail}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
