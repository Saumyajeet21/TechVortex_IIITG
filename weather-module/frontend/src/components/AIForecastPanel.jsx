import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { fetch72HourForecast, getWeatherLabel } from '../services/openmeteo';
import { saveForecast } from '../services/supabase';
import { getGeminiWeatherAnalysis } from '../services/gemini';

const FORECAST_API = import.meta.env.VITE_FORECAST_API_URL || 'http://localhost:8000';

const WEATHER_ICONS = {
  0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',48:'🌫',
  51:'🌦',53:'🌦',55:'🌧',61:'🌧',63:'🌧',65:'🌊',
  71:'🌨',73:'❄️',75:'❄️',80:'🌦',81:'🌧',82:'⛈',
  95:'⛈',96:'⛈',99:'⛈',
};

function getAdvice(temp, weathercode) {
  const isRain = [51,53,55,61,63,65,80,81,82,95,96,99].includes(weathercode);
  const isSnow = [71,73,75].includes(weathercode);
  const warnings = [];
  const activities = [];

  if (temp >= 35)   warnings.push('🥵 Extreme heat — stay hydrated');
  if (isRain)       warnings.push('🌧 Rain expected — carry an umbrella');
  if (isSnow)       warnings.push('❄️ Snow conditions — drive carefully');
  if (temp < 5)     warnings.push('🥶 Near freezing — heavy clothing needed');

  if (!isRain && temp >= 25 && temp < 35) activities.push('🚴 Cycling','🏃 Jogging','🧺 Picnic');
  if (!isRain && temp >= 35)              activities.push('🏊 Swimming','🌊 Water sports');
  if (!isRain && temp < 15)              activities.push('🥾 Hiking','🍂 Nature walk');
  if (isRain)                             activities.push('🏠 Stay indoors','📚 Reading','🎮 Gaming');
  if (isSnow)                             activities.push('⛷ Skiing','🛷 Sledging');

  return { warnings, activities };
}

// Confidence badge color
function confidenceColor(score) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#fbbf24';
  return '#f87171';
}

export default function AIForecastPanel({ selectedCity }) {
  const [forecast, setForecast]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeDay, setActiveDay]     = useState(0);
  const [hourIdx, setHourIdx]         = useState(0);
  const [source, setSource]           = useState('lstm');
  const [gemini, setGemini]           = useState(null);
  const [geminiLoading, setGLoading]  = useState(false);
  const [geminiError, setGeminiError] = useState('');
  const [currentWeather, setCurrent]  = useState({});
  const [accuracy, setAccuracy]       = useState(null);

  // ── Fetch live per-location accuracy whenever city changes ───────────────
  useEffect(() => {
    setAccuracy(null);  // reset while loading
    fetch(`${FORECAST_API}/live-accuracy?lat=${selectedCity.lat}&lon=${selectedCity.lon}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setAccuracy(d))
      .catch(() => {
        // Fallback to static training accuracy
        fetch(`${FORECAST_API}/accuracy`)
          .then(r => r.json())
          .then(d => setAccuracy({ ...d, live: false, quality_tier: 'unknown',
            suggestion: '⚠️ Live accuracy unavailable. Showing training-time metrics.' }))
          .catch(() => {});
      });
  }, [selectedCity]);

  // ── Fetch LSTM forecast ────────────────────────────────────────────────────
  useEffect(() => {
    setActiveDay(0); setHourIdx(0); setGemini(null); setGeminiError('');
    setLoading(true);
    async function load() {
      try {
        const res = await fetch(
          `${FORECAST_API}/predict?lat=${selectedCity.lat}&lon=${selectedCity.lon}`
        );
        if (!res.ok) throw new Error('API error');
        const json = await res.json();
        setForecast(json.forecast.map(h => ({ ...h, weathercode: 0 })));
        setSource('lstm');
        await saveForecast(selectedCity.name, json.forecast);
      } catch {
        try {
          const data = await fetch72HourForecast(selectedCity.lat, selectedCity.lon);
          setForecast(data);
          setSource('openmeteo');
          await saveForecast(selectedCity.name, data);
        } catch (e) { console.error(e); }
      } finally { setLoading(false); }
    }
    load();
  }, [selectedCity]);

  // ── Fetch current weather for Gemini context ───────────────────────────────
  useEffect(() => {
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${selectedCity.lat}&longitude=${selectedCity.lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,windspeed_10m&timezone=auto`
    )
      .then(r => r.json())
      .then(d => {
        const c = d.current ?? {};
        setCurrent({
          temperature: c.temperature_2m,
          feelsLike:   c.apparent_temperature,
          humidity:    c.relative_humidity_2m,
          windspeed:   c.windspeed_10m,
          description: 'Current conditions',
        });
      })
      .catch(() => {});
  }, [selectedCity]);

  // ── Ask Gemini once forecast is ready ──────────────────────────────────────
  const handleAskGemini = async () => {
    if (!forecast.length) return;
    setGLoading(true);
    setGeminiError('');
    setGemini(null);
    try {
      const result = await getGeminiWeatherAnalysis({
        city: selectedCity.name,
        lat:  selectedCity.lat,
        lon:  selectedCity.lon,
        lstmForecast:   forecast,
        currentWeather: currentWeather,
      });
      setGemini(result);
    } catch (e) {
      setGeminiError(e.message);
    } finally {
      setGLoading(false);
    }
  };

  if (loading) return (
    <div className="forecast-loading"><div className="spinner" /> Generating AI Forecast...</div>
  );
  if (!forecast.length) return (
    <div className="forecast-loading">⚠️ Forecast unavailable</div>
  );

  // Split into 3 days
  const days = [0, 1, 2].map(d => {
    const slice = forecast.slice(d * 24, d * 24 + 24);
    const date  = new Date(slice[0]?.time ?? Date.now());
    return {
      label:   d === 0 ? 'Today' : d === 1 ? 'Tomorrow'
               : date.toLocaleDateString('en-IN',{ weekday:'short',month:'short',day:'numeric'}),
      data:    slice.map(h => ({ ...h, timeShort: h.time?.slice(11,16) ?? '' })),
      maxTemp: Math.max(...slice.map(h => h.temperature)),
      minTemp: Math.min(...slice.map(h => h.temperature)),
    };
  });

  const currentDay   = days[activeDay];
  const safeIdx      = Math.min(hourIdx, currentDay.data.length - 1);
  const selectedHour = currentDay.data[safeIdx] ?? {};
  const temp         = selectedHour.temperature ?? 25;
  const wcode        = selectedHour.weathercode ?? 0;
  const { warnings, activities } = getAdvice(temp, wcode);

  // Pass only city + forecast to Gemini (no lat/lon needed in new lean API)
  return (
    <div className="forecast-panel">

      {/* Header */}
      <div className="forecast-header">
        <h2 className="section-title">🔮 72-Hour AI Forecast — {selectedCity.name}</h2>
        <span className={`source-badge ${source === 'lstm' ? 'source-badge--ai' : 'source-badge--raw'}`}>
          {source === 'lstm' ? '🤖 LSTM Model' : '📡 OpenMeteo Fallback'}
        </span>
      </div>


      {/* Day tabs */}
      {/* Day tabs */}
      <div className="day-tabs">
        {days.map((d, i) => (
          <button
            key={i}
            className={`day-tab ${activeDay === i ? 'day-tab--active' : ''}`}
            onClick={() => { setActiveDay(i); setHourIdx(0); }}
          >
            <span className="day-tab__label">{d.label}</span>
            <span className="day-tab__range">{d.minTemp.toFixed(0)}° – {d.maxTemp.toFixed(0)}°C</span>
          </button>
        ))}
      </div>

      {/* 24hr area chart */}
      <div className="chart-card">
        <h3 className="chart-title">
          Hourly Temperature — {currentDay.label}
          {source === 'lstm' && (
            <span style={{ color:'#818cf8', marginLeft:8, fontSize:'0.75rem' }}>AI Predicted</span>
          )}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={currentDay.data}>
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#818cf8" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0}  />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="timeShort" tick={{ fill:'#94a3b8', fontSize:11 }} interval={2} />
            <YAxis tick={{ fill:'#94a3b8', fontSize:11 }} unit="°C" domain={['auto','auto']} />
            <Tooltip
              contentStyle={{ background:'#1e293b', border:'1px solid #334155', borderRadius:8 }}
              labelStyle={{ color:'#94a3b8' }}
              itemStyle={{ color:'#818cf8' }}
            />
            <Area type="monotone" dataKey="temperature" stroke="#818cf8"
              strokeWidth={2.5} fill="url(#forecastGrad)" name="Temp °C" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Premium Hour Timeline */}
      <div className="timeline-wrap">
        <div className="timeline-label">
          🕐 Explore Hour:&nbsp;
          <strong style={{ color: '#38bdf8' }}>{selectedHour.timeShort || '--:--'}</strong>
          <span style={{ color: '#94a3b8', marginLeft: 8, fontSize: '0.78rem' }}>
            → {temp.toFixed(1)}°C &nbsp;
            {WEATHER_ICONS[wcode] ?? '🌡'} {getWeatherLabel(wcode)}
          </span>
        </div>

        <div className="timeline-scroll">
          {currentDay.data.map((h, i) => {
            const t      = h.temperature;
            const dayMin = currentDay.minTemp;
            const dayMax = currentDay.maxTemp;
            const barPct = dayMax === dayMin
              ? 50
              : Math.round(((t - dayMin) / (dayMax - dayMin)) * 100);
            const isSelected = i === safeIdx;

            return (
              <button
                key={i}
                className={`timeline-card ${isSelected ? 'timeline-card--active' : ''}`}
                onClick={() => setHourIdx(i)}
              >
                <span className="tl-time">{h.timeShort}</span>
                <span className="tl-icon">{WEATHER_ICONS[h.weathercode ?? 0] ?? '🌡'}</span>
                <div className="tl-bar-track">
                  <div className="tl-bar-fill" style={{ height: `${barPct}%` }} />
                </div>
                <span className="tl-temp">{t.toFixed(0)}°</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Key stats */}
      <div className="predictor-facts">
        {[
          { label:'🌡 At this hour', value:`${temp.toFixed(1)}°C` },
          { label:'📈 Day peak',     value:`${currentDay.maxTemp.toFixed(1)}°C` },
          { label:'📉 Day low',      value:`${currentDay.minTemp.toFixed(1)}°C` },
          {
            label:'📊 Next 3hrs',
            value: (() => {
              const next = currentDay.data.slice(safeIdx, safeIdx + 3);
              return next.length
                ? `${Math.min(...next.map(h=>h.temperature)).toFixed(0)}–${Math.max(...next.map(h=>h.temperature)).toFixed(0)}°C`
                : '—';
            })(),
          },
        ].map(f => (
          <div key={f.label} className="pred-fact">
            <span>{f.label}</span>
            <strong>{f.value}</strong>
          </div>
        ))}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="predictor-warnings">
          {warnings.map((w,i) => <div key={i} className="predictor-warning-chip">{w}</div>)}
        </div>
      )}

      {/* Activities */}
      {activities.length > 0 && (
        <div className="predictor-activities">
          <p className="predictor-activities-label">Suggested activities at this time:</p>
          <div className="activity-chips">
            {activities.map((a,i) => <span key={i} className="activity-chip">{a}</span>)}
          </div>
        </div>
      )}

      {/* Hourly cards */}
      <div className="forecast-slots">
        {currentDay.data.filter((_,i) => i % 3 === 0).map((h,i) => (
          <div key={i} className="forecast-slot">
            <span className="slot-time">{h.timeShort}</span>
            <span className="slot-temp">{h.temperature.toFixed(1)}°C</span>
            <span>{WEATHER_ICONS[h.weathercode ?? 0] ?? '🌡'}</span>
          </div>
        ))}
      </div>

      {/* ── Gemini AI Analysis ───────────────────────────────────────────────── */}
      <div className="gemini-section">
        <div className="gemini-header">
          <div className="gemini-title-row">
            <span className="gemini-logo">✦</span>
            <h3 className="gemini-title">Gemini AI Analysis</h3>
            <span className="gemini-sub">Validates &amp; compares LSTM predictions</span>
          </div>
          {!gemini && !geminiLoading && (
            <button className="gemini-btn" onClick={handleAskGemini}>
              ✦ Ask Gemini
            </button>
          )}
          {geminiLoading && (
            <div className="gemini-btn gemini-btn--loading">
              <span className="spinner-sm" /> Analysing...
            </div>
          )}
        </div>

        {geminiError && (
          <div className="gemini-error">
            <div>{geminiError}</div>
            <button
              onClick={handleAskGemini}
              style={{ marginTop: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#f1f5f9', borderRadius: 8, padding: '4px 14px', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              ↺ Retry
            </button>
          </div>
        )}

        {gemini && (
          <div className="gemini-body">

            {/* Confidence + Validation row */}
            <div className="gemini-meta-row">
              {gemini.confidence != null && (
                <div className="gemini-confidence">
                  <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6"/>
                    <circle cx="32" cy="32" r="26" fill="none"
                      stroke={confidenceColor(gemini.confidence)} strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 26 * gemini.confidence / 100} ${2 * Math.PI * 26}`}
                      strokeLinecap="round"
                      transform="rotate(-90 32 32)"
                      style={{ transition: 'stroke-dasharray 1s ease' }}
                    />
                    <text x="32" y="37" textAnchor="middle" fill="#f1f5f9" fontSize="14" fontWeight="800">
                      {gemini.confidence}%
                    </text>
                  </svg>
                  <span style={{ fontSize:'0.7rem', color:'#94a3b8', marginTop:4 }}>LSTM Score</span>
                </div>
              )}
              <p className="gemini-validation">{gemini.validation}</p>
            </div>

            {/* Narrative */}
            <div className="gemini-narrative">
              <span className="gemini-narrative-icon">📢</span>
              <p>{gemini.narrative}</p>
            </div>

            {/* Events / Alerts */}
            {gemini.events?.length > 0 && (
              <div className="gemini-events">
                {gemini.events.map((ev, i) => (
                  <div key={i} className="gemini-event-chip">⚡ {ev}</div>
                ))}
              </div>
            )}

            {/* LSTM vs Gemini comparison bar chart */}
            {gemini.gemini24h?.length > 0 && (() => {
              // Build comparison: pair LSTM every-3h samples with Gemini's 8 points
              const lstm3h = forecast.filter((_, i) => i % 3 === 2).slice(0, 8);
              const chartData = gemini.gemini24h.map((g, i) => ({
                label:   g.label,
                'LSTM':  parseFloat((lstm3h[i]?.temperature ?? 0).toFixed(1)),
                'Gemini': g.temp,
              }));
              return (
                <div className="chart-card" style={{ marginTop: 4 }}>
                  <h3 className="chart-title">🔁 LSTM vs Gemini — 24h Temperature Comparison</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="label" tick={{ fill:'#94a3b8', fontSize:11 }} />
                      <YAxis tick={{ fill:'#94a3b8', fontSize:11 }} unit="°C" domain={['auto','auto']} />
                      <Tooltip
                        contentStyle={{ background:'#1e293b', border:'1px solid #334155', borderRadius:8 }}
                        labelStyle={{ color:'#94a3b8' }}
                      />
                      <Legend wrapperStyle={{ fontSize:'0.75rem', color:'#94a3b8' }} />
                      <Bar dataKey="LSTM"   fill="#818cf8" radius={[4,4,0,0]} />
                      <Bar dataKey="Gemini" fill="#34d399" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}

            {/* What To Do — action cards */}
            {gemini.actions && (
              <div className="gemini-actions">
                <h4 className="gemini-actions-title">📋 What To Do Today</h4>
                <div className="gemini-action-cards">
                  {[
                    { period: '🌅 Morning',   key: 'morning',   color: '#fbbf24' },
                    { period: '☀️ Afternoon', key: 'afternoon', color: '#f87171' },
                    { period: '🌆 Evening',   key: 'evening',   color: '#818cf8' },
                  ].map(({ period, key, color }) => gemini.actions[key] && (
                    <div key={key} className="gemini-action-card" style={{ borderTopColor: color }}>
                      <span className="gemini-action-period" style={{ color }}>{period}</span>
                      <p className="gemini-action-text">{gemini.actions[key]}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
}
