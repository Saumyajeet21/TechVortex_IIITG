import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { fetch72HourForecast } from '../services/openmeteo';
import { saveForecast } from '../services/supabase';

const FORECAST_API = import.meta.env.VITE_FORECAST_API_URL || 'http://localhost:8000';

// Fetch from YOUR trained LSTM model via FastAPI
async function fetchLSTMForecast(lat, lon) {
  const res = await fetch(`${FORECAST_API}/predict?lat=${lat}&lon=${lon}`);
  if (!res.ok) throw new Error(`FastAPI error: ${res.status}`);
  const json = await res.json();
  // API returns { forecast: [{time, temperature}, ...] }
  // Add placeholder precipitation/windspeed so existing UI still works
  return json.forecast.map(h => ({
    time: h.time,
    temperature: h.temperature,
    precipitation: 0,   // LSTM only predicts temperature; rain shown as 0
    windspeed: 0,
  }));
}

export default function ForecastPanel({ selectedCity }) {
  const [forecast, setForecast]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeDay, setActiveDay]   = useState(0);
  const [source, setSource]         = useState('lstm'); // 'lstm' | 'openmeteo'

  useEffect(() => {
    setActiveDay(0);
    async function load() {
      setLoading(true);
      try {
        // Try LSTM model first
        const data = await fetchLSTMForecast(selectedCity.lat, selectedCity.lon);
        setForecast(data);
        setSource('lstm');
        await saveForecast(selectedCity.name, data);
      } catch (lstmErr) {
        console.warn('LSTM API unavailable, falling back to OpenMeteo:', lstmErr.message);
        try {
          // Fallback to raw OpenMeteo
          const data = await fetch72HourForecast(selectedCity.lat, selectedCity.lon);
          setForecast(data);
          setSource('openmeteo');
          await saveForecast(selectedCity.name, data);
        } catch (e) {
          console.error('Both forecast sources failed:', e);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedCity]);

  if (loading) return (
    <div className="forecast-loading">
      <div className="spinner" /> Generating AI forecast...
    </div>
  );

  if (forecast.length === 0) return (
    <div className="forecast-loading">⚠️ Forecast unavailable</div>
  );

  const days = [0, 1, 2].map((d) => {
    const dayData = forecast.slice(d * 24, d * 24 + 24);
    const date = new Date(dayData[0]?.time);
    return {
      label: d === 0 ? 'Today' : d === 1 ? 'Tomorrow'
        : date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
      data: dayData.map(h => ({ ...h, time: h.time.slice(11, 16) })),
      maxTemp: Math.max(...dayData.map(h => h.temperature)),
      minTemp: Math.min(...dayData.map(h => h.temperature)),
    };
  });

  const displayed = days[activeDay]?.data ?? [];

  return (
    <div className="forecast-panel">

      {/* Title + source badge */}
      <div className="forecast-header">
        <h2 className="section-title">🔮 72-Hour AI Forecast — {selectedCity.name}</h2>
        <span className={`source-badge ${source === 'lstm' ? 'source-badge--ai' : 'source-badge--raw'}`}>
          {source === 'lstm' ? '🤖 LSTM Model' : '📡 OpenMeteo Fallback'}
        </span>
      </div>

      {/* Day tabs */}
      <div className="day-tabs">
        {days.map((d, i) => (
          <button
            key={i}
            className={`day-tab ${activeDay === i ? 'day-tab--active' : ''}`}
            onClick={() => setActiveDay(i)}
          >
            <span className="day-tab__label">{d.label}</span>
            <span className="day-tab__range">{d.minTemp.toFixed(0)}° – {d.maxTemp.toFixed(0)}°C</span>
          </button>
        ))}
      </div>

      {/* Hourly area chart */}
      <div className="chart-card">
        <h3 className="chart-title">
          Hourly Temperature — {days[activeDay]?.label}
          {source === 'lstm' && <span style={{ color: '#818cf8', marginLeft: 8, fontSize: '0.75rem' }}>AI Predicted</span>}
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={displayed}>
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#818cf8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} interval={2} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="°C" domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
              itemStyle={{ color: '#818cf8' }}
            />
            <Area type="monotone" dataKey="temperature" stroke="#818cf8"
              strokeWidth={2.5} fill="url(#forecastGrad)" name="Temp °C" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Hourly cards */}
      <div className="forecast-slots">
        {displayed.filter((_, i) => i % 3 === 0).map((h, i) => (
          <div key={i} className="forecast-slot">
            <span className="slot-time">{h.time}</span>
            <span className="slot-temp">{h.temperature.toFixed(1)}°C</span>
          </div>
        ))}
      </div>
    </div>
  );
}
