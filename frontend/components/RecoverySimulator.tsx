'use client'
import { useState, useCallback } from 'react'
import * as Slider from '@radix-ui/react-slider'
import CountUp from 'react-countup'
import { fetchSimulation, SimulateResult } from '@/lib/api'
import { formatCurrency } from '@/lib/zones'
import { TrendingUp, TrendingDown, Clock, DollarSign, Leaf } from 'lucide-react'

interface Props {
  zoneId: string
  currentCarbonPct: number
}

export default function RecoverySimulator({ zoneId, currentCarbonPct }: Props) {
  const [reductionPct, setReductionPct] = useState(30)
  const [monthsAhead, setMonthsAhead] = useState(6)
  const [result, setResult] = useState<SimulateResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [prevKey, setPrevKey] = useState(0)

  const runSim = useCallback(async (reduction: number, months: number) => {
    setLoading(true)
    try {
      const data = await fetchSimulation(zoneId, reduction, months)
      setResult(data)
      setPrevKey(k => k + 1) // retrigger CountUp
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [zoneId])

  const handleReduction = (val: number[]) => {
    setReductionPct(val[0])
    runSim(val[0], monthsAhead)
  }

  const handleMonths = (val: number[]) => {
    setMonthsAhead(val[0])
    runSim(reductionPct, val[0])
  }

  const proj = result?.projected_state
  const doNothing = result?.do_nothing_projection

  return (
    <div className="space-y-6">
      {/* Sliders */}
      <div className="space-y-5">
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-medium text-slate-300">Plastic Reduction Target</label>
            <span className="text-ocean-400 font-bold text-lg">{reductionPct}%</span>
          </div>
          <Slider.Root
            className="relative flex items-center select-none touch-none w-full h-5"
            value={[reductionPct]}
            onValueChange={handleReduction}
            min={0} max={100} step={5}>
            <Slider.Track className="relative grow rounded-full h-1.5 bg-white/10">
              <Slider.Range className="absolute rounded-full h-full" style={{ background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)' }} />
            </Slider.Track>
            <Slider.Thumb className="block w-5 h-5 rounded-full bg-ocean-400 border-2 border-ocean-900 shadow-lg shadow-ocean-500/50 hover:bg-ocean-300 focus:outline-none transition-colors" />
          </Slider.Root>
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>0% (no action)</span><span>50%</span><span>100% (full cleanup)</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-medium text-slate-300">Projection Period</label>
            <span className="text-ocean-400 font-bold text-lg">{monthsAhead} months</span>
          </div>
          <Slider.Root
            className="relative flex items-center select-none touch-none w-full h-5"
            value={[monthsAhead]}
            onValueChange={handleMonths}
            min={1} max={24} step={1}>
            <Slider.Track className="relative grow rounded-full h-1.5 bg-white/10">
              <Slider.Range className="absolute rounded-full h-full" style={{ background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)' }} />
            </Slider.Track>
            <Slider.Thumb className="block w-5 h-5 rounded-full bg-purple-400 border-2 border-purple-900 shadow-lg shadow-purple-500/50 hover:bg-purple-300 focus:outline-none transition-colors" />
          </Slider.Root>
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>1 month</span><span>12 months</span><span>24 months</span>
          </div>
        </div>
      </div>

      {/* Run simulation button if no result yet */}
      {!result && (
        <button onClick={() => runSim(reductionPct, monthsAhead)}
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-ocean-600 hover:bg-ocean-500 disabled:opacity-50 transition-all">
          {loading ? 'Calculating...' : '▶ Run Simulation'}
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="w-6 h-6 border-2 border-ocean-400 border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-sm text-slate-400">Projecting...</span>
        </div>
      )}

      {/* Results side by side */}
      {result && !loading && (
        <div className="grid grid-cols-2 gap-3">
          {/* If we act */}
          <div className="glass-card p-4 border-green-500/20 bg-green-500/5">
            <div className="flex items-center gap-1.5 mb-3">
              <TrendingUp size={14} className="text-green-400" />
              <span className="text-xs font-bold text-green-400 uppercase tracking-wider">If We Act</span>
            </div>
            <div className="space-y-2.5">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Carbon recovers to</p>
                <p className="text-xl font-bold text-green-400 damage-number">
                  <CountUp key={`c-${prevKey}`} end={(proj?.carbon_absorption_pct || 0) * 100} decimals={1} duration={1.5} suffix="%" />
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Cost saved</p>
                <p className="text-lg font-bold text-amber-400 damage-number">
                  <CountUp key={`d-${prevKey}`} end={proj?.damage_saved_usd_total || 0} decimals={0} duration={1.5} prefix="$" separator="," />
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Recovery time</p>
                <p className="text-base font-semibold text-ocean-300 flex items-center gap-1">
                  <Clock size={12} />
                  {(proj?.months_to_recovery || 0) >= 999
                    ? '∞ months'
                    : `${proj?.months_to_recovery} months`}
                </p>
              </div>
              <div className="bg-green-500/10 rounded-lg px-2 py-1.5">
                <p className="text-[10px] text-green-400">↑ {proj?.absorption_recovery_pct}% restoration vs current</p>
              </div>
            </div>
          </div>

          {/* Do nothing */}
          <div className="glass-card p-4 border-red-500/20 bg-red-500/5">
            <div className="flex items-center gap-1.5 mb-3">
              <TrendingDown size={14} className="text-red-400" />
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Do Nothing</span>
            </div>
            <div className="space-y-2.5">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Carbon drops to</p>
                <p className="text-xl font-bold text-red-400 damage-number">
                  <CountUp key={`dc-${prevKey}`} end={(doNothing?.carbon_absorption_pct_end || 0) * 100} decimals={1} duration={1.5} suffix="%" />
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Annual loss</p>
                <p className="text-lg font-bold text-red-300 damage-number">
                  <CountUp key={`dl-${prevKey}`} end={doNothing?.economic_loss_usd_year || 0} decimals={0} duration={1.5} prefix="$" separator="," />
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Ecosystem collapse</p>
                <p className="text-base font-semibold text-red-300 flex items-center gap-1">
                  <Clock size={12} />
                  {doNothing?.ecosystem_collapse_months
                    ? `~${doNothing.ecosystem_collapse_months} months`
                    : 'Unknown'}
                </p>
              </div>
              <div className="bg-red-500/10 rounded-lg px-2 py-1.5">
                <p className="text-[10px] text-red-400">⚠ Continued degradation at 0.6%/month</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
