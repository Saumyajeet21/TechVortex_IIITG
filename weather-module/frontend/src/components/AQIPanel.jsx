import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { fetchAQI, getAQIInfo, calculateIndianAQI } from '../services/openmeteo';

const POLLUTANT_COLORS = ['#f87171','#fb923c','#fbbf24','#34d399','#38bdf8','#a78bfa'];

function AQIGauge({ value, max = 150 }) {
  const pct = Math.min(value / max, 1);
  const info = getAQIInfo(value);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference * (1 - pct);
  return (
    <div className="aqi-gauge-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
        <circle
          cx="70" cy="70" r="54" fill="none"
          stroke={info.color} strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="70" y="64" textAnchor="middle" fill="#f1f5f9" fontSize="26" fontWeight="800">{value}</text>
        <text x="70" y="82" textAnchor="middle" fill={info.color} fontSize="11" fontWeight="600">{info.label}</text>
      </svg>
    </div>
  );
}

// Custom pie chart label
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r  = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x  = cx + r * Math.cos(-midAngle * RADIAN);
  const y  = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function AQIPanel({ selectedCity }) {
  const [aqi, setAqi]         = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchAQI(selectedCity.lat, selectedCity.lon)
      .then(setAqi)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedCity]);

  if (loading) return <div className="forecast-loading"><div className="spinner" /> Loading AQI data...</div>;
  if (!aqi)    return <div className="forecast-loading">⚠️ AQI data unavailable</div>;

  const info = getAQIInfo(aqi.europeanAqi);

  // Calculate Indian AQI using CPCB breakpoints
  const indianAQIResult = calculateIndianAQI({
    pm25: aqi.pm25,
    pm10: aqi.pm10,
    no2:  aqi.nitrogenDioxide,
    so2:  aqi.sulphurDioxide,
    o3:   aqi.ozone,
    co:   aqi.carbonMonoxide,
  });
  const indianAQI  = indianAQIResult.aqi;
  const dominant   = indianAQIResult.dominant;
  const indianInfo = getAQIInfo(indianAQI);

  const pollutants = [
    { label: 'PM2.5', value: aqi.pm25,                      unit: 'μg/m³', icon: '🌫' },
    { label: 'PM10',  value: aqi.pm10,                      unit: 'μg/m³', icon: '💨' },
    { label: 'NO₂',   value: aqi.nitrogenDioxide,           unit: 'μg/m³', icon: '🏭' },
    { label: 'O₃',    value: aqi.ozone,                     unit: 'μg/m³', icon: '☀️' },
    { label: 'SO₂',   value: aqi.sulphurDioxide,            unit: 'μg/m³', icon: '⚗️' },
    { label: 'CO',    value: aqi.carbonMonoxide / 1000,     unit: 'mg/m³', icon: '🔥' },
  ];

  // Pie data — normalise CO (mg→μg scaled for visual) for fair comparison
  const pieData = pollutants
    .map((p, i) => ({
      name:  p.label,
      value: Math.max(parseFloat(p.value.toFixed(2)), 0.01),
      color: POLLUTANT_COLORS[i],
    }))
    .filter(p => p.value > 0);

  return (
    <div className="aqi-panel">
      <h2 className="section-title">💨 Air Quality Index — {selectedCity.name}</h2>

      {/* Main AQI display — Indian AQI */}
      <div className="aqi-main">
        <AQIGauge value={indianAQI} max={500} />
        <div className="aqi-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className="aqi-badge" style={{ background: indianInfo.bg, borderColor: indianInfo.color, color: indianInfo.color }}>
              {indianInfo.label}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>🇮🇳 India NAQI (CPCB)</span>
          </div>
          <div className="aqi-scores">
            <div className="aqi-score-item">
              <span>🇮🇳 Indian AQI</span>
              <strong style={{ color: indianInfo.color }}>{indianAQI}</strong>
            </div>
            <div className="aqi-score-item">
              <span>⚠️ Dominant</span>
              <strong style={{ color: indianInfo.color }}>{dominant}</strong>
            </div>
            <div className="aqi-score-item">
              <span>🇺🇸 US AQI</span>
              <strong>{aqi.usAqi}</strong>
            </div>
          </div>
          <p className="aqi-advice" style={{ borderLeftColor: indianInfo.color }}>{indianInfo.advice}</p>
        </div>
      </div>

      {/* Pollutant grid + Pie chart side by side */}
      <div className="aqi-charts-row">

        {/* Pollutant cards */}
        <div className="pollutant-grid">
          {pollutants.map((p, i) => (
            <div key={p.label} className="pollutant-card" style={{ borderColor: POLLUTANT_COLORS[i] + '44' }}>
              <span className="pollutant-dot" style={{ background: POLLUTANT_COLORS[i] }} />
              <span className="pollutant-icon">{p.icon}</span>
              <span className="pollutant-label">{p.label}</span>
              <span className="pollutant-value">{p.value.toFixed(p.label === 'CO' ? 2 : 1)}</span>
              <span className="pollutant-unit">{p.unit}</span>
            </div>
          ))}
        </div>

        {/* Pie chart */}
        <div className="chart-card aqi-pie-card">
          <h3 className="chart-title">Pollutant Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="45%"
                outerRadius={90}
                innerRadius={48}
                dataKey="value"
                labelLine={false}
                label={PieLabel}
                animationBegin={0}
                animationDuration={900}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                itemStyle={{ color: '#f1f5f9' }}
                formatter={(val, name) => [`${val.toFixed(2)}`, name]}
              />
              <Legend
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ fontSize: '0.75rem', color: '#94a3b8', paddingTop: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly AQI trend */}
      <div className="chart-card">
        <h3 className="chart-title">Hourly AQI Trend — Today</h3>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={aqi.hourly}>
            <defs>
              <linearGradient id="aqiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={info.color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={info.color} stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} interval={3} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
              itemStyle={{ color: info.color }}
            />
            <Area type="monotone" dataKey="aqi" stroke={info.color}
              strokeWidth={2} fill="url(#aqiGrad)" name="AQI" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
