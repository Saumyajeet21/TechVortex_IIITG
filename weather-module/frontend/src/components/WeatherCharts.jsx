import React from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export default function WeatherCharts({ hourlyData }) {
  if (!hourlyData || hourlyData.length === 0) {
    return <div className="chart-placeholder">No data available</div>;
  }

  return (
    <div className="charts-grid">
      {/* Temperature Chart */}
      <div className="chart-card">
        <h3 className="chart-title">🌡 Temperature (°C) — Next 24 Hours</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={hourlyData}>
            <defs>
              <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff7b00" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ff7b00" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} interval={3} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="°" />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
              itemStyle={{ color: '#ff7b00' }}
            />
            <Area type="monotone" dataKey="temperature" stroke="#ff7b00" strokeWidth={2} fill="url(#tempGrad)" name="Temp °C" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Precipitation Chart */}
      <div className="chart-card">
        <h3 className="chart-title">🌧 Precipitation (mm) — Next 24 Hours</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} interval={3} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="mm" />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
              itemStyle={{ color: '#38bdf8' }}
            />
            <Bar dataKey="precipitation" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Precipitation mm" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Wind & Humidity */}
      <div className="chart-card chart-card--wide">
        <h3 className="chart-title">💨 Wind Speed & 💧 Humidity — Next 24 Hours</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} interval={3} />
            <YAxis yAxisId="wind" tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" km/h" />
            <YAxis yAxisId="hum" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Legend wrapperStyle={{ color: '#94a3b8' }} />
            <Line yAxisId="wind" type="monotone" dataKey="windspeed" stroke="#a78bfa" strokeWidth={2} dot={false} name="Wind km/h" />
            <Line yAxisId="hum" type="monotone" dataKey="humidity" stroke="#34d399" strokeWidth={2} dot={false} name="Humidity %" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
