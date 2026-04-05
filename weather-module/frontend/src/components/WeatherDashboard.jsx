import React, { useState, useEffect, useRef } from 'react';
import { useWeatherData } from '../hooks/useWeatherData';
import { CITIES, getWeatherLabel, geocodeCity } from '../services/openmeteo';
import WeatherMap from './WeatherMap';
import WeatherCharts from './WeatherCharts';
import AIForecastPanel from './AIForecastPanel';
import AQIPanel from './AQIPanel';
import NotificationBell from './NotificationBell';

const WEATHER_ICONS = {
  0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️',
  45: '🌫', 48: '🌫', 51: '🌦', 53: '🌦', 55: '🌧',
  61: '🌧', 63: '🌧', 65: '🌊', 71: '🌨', 73: '❄️', 75: '❄️',
  80: '🌦', 81: '🌧', 82: '⛈', 95: '⛈', 96: '⛈', 99: '⛈',
};

export default function WeatherDashboard({ onBack }) {
  const {
    currentWeather, hourlyData, weatherMap,
    selectedCity, setSelectedCity,
    loading, error, lastUpdated, refresh,
    mapSource, refreshMap,
  } = useWeatherData();

  const [activeTab, setActiveTab]       = useState('overview');
  const [searchQuery, setSearchQuery]   = useState('');
  const [suggestions, setSuggestions]   = useState([]);
  const [searching, setSearching]       = useState(false);
  const [showDrop, setShowDrop]         = useState(false);
  const searchRef                       = useRef(null);
  const debounceRef                     = useRef(null);

  // Debounce geocoding — fires 400ms after user stops typing
  useEffect(() => {
    if (!searchQuery.trim()) { setSuggestions([]); setShowDrop(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await geocodeCity(searchQuery);
        setSuggestions(results);
        setShowDrop(results.length > 0);
      } catch (_) {}
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDrop(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleSelect(city) {
    setSelectedCity({ name: city.name, lat: city.lat, lon: city.lon });
    setSearchQuery('');
    setSuggestions([]);
    setShowDrop(false);
  }

  const icon = WEATHER_ICONS[currentWeather?.weathercode] ?? '🌡';

  return (
    <div className="dashboard">
      <NotificationBell currentWeather={currentWeather} cityName={selectedCity.name} />

      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          {onBack && (
            <button onClick={onBack} style={{
              background: 'none', border: 'none', color: '#64748b',
              cursor: 'pointer', fontSize: '0.8rem', marginRight: 8, padding: '4px 8px',
              borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4,
            }}>← Home</button>
          )}
          <div className="logo">🌦 WeatherAI</div>
          <div className="header-meta">
            <span>AI-Driven Climate Intelligence</span>
            <span className="last-updated" style={{ display:'flex', alignItems:'center', gap:6 }}>
              {lastUpdated && `Updated: ${lastUpdated.toLocaleTimeString('en-IN')}`}
              <button
                onClick={refresh}
                disabled={loading}
                title="Refresh now"
                style={{
                  background:'rgba(99,102,241,0.2)', border:'1px solid rgba(99,102,241,0.4)',
                  borderRadius:6, color:'#a5b4fc', cursor:loading?'not-allowed':'pointer',
                  fontSize:'0.85rem', padding:'2px 8px', lineHeight:'1.4',
                  opacity: loading ? 0.5 : 1, transition:'all 0.2s',
                }}
              >
                {loading ? '⟳ ...' : '🔄 Refresh'}
              </button>
            </span>
          </div>
        </div>

        <div className="header-right">
          {/* 🔍 Location search box */}
          <div className="city-search-wrap" ref={searchRef}>
            <div className="city-search-input-wrap">
              <span className="search-icon">🔍</span>
              <input
                id="city-search"
                className="city-search-input"
                type="text"
                placeholder="Search any city..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowDrop(true)}
                autoComplete="off"
              />
              {searching && <span className="search-spinner" />}
            </div>

            {showDrop && (
              <ul className="city-dropdown">
                {suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="city-dropdown-item"
                    onMouseDown={() => handleSelect(s)}
                  >
                    <span className="dropdown-city">📍 {s.name}</span>
                    <span className="dropdown-meta">{s.state ? `${s.state}, ` : ''}{s.country}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Preset cities dropdown */}
          <select
            className="city-select"
            value={CITIES.find(c => c.name === selectedCity.name) ? selectedCity.name : ''}
            onChange={e => setSelectedCity(CITIES.find(c => c.name === e.target.value))}
          >
            <option value="" disabled>Quick picks</option>
            {CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>

          <button className="refresh-btn" onClick={refresh} disabled={loading}>
            {loading ? '⟳' : '↻'} Refresh
          </button>
        </div>
      </header>

      {/* Current Weather Hero */}
      {currentWeather && (
        <div className="weather-hero">
          <div className="hero-main">
            <span className="hero-icon">{icon}</span>
            <div>
              <div className="hero-temp">{currentWeather.temperature?.toFixed(1)}°C</div>
              <div className="hero-location">{selectedCity.name}</div>
              <div className="hero-condition">
                {currentWeather.description || getWeatherLabel(currentWeather.weathercode)}
              </div>
            </div>
          </div>
          <div className="hero-stats">
            <div className="stat-card">
              <span className="stat-icon">🌡</span>
              <span className="stat-label">Feels Like</span>
              <span className="stat-value">{currentWeather.feelsLike?.toFixed(1)}°C</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">💧</span>
              <span className="stat-label">Humidity</span>
              <span className="stat-value">{currentWeather.humidity}%</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">💨</span>
              <span className="stat-label">Wind</span>
              <span className="stat-value">{currentWeather.windspeed?.toFixed(1)} km/h</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🌧</span>
              <span className="stat-label">Precipitation</span>
              <span className="stat-value">{currentWeather.precipitation} mm</span>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error-banner">⚠️ {error} — Using cached data</div>}

      {/* Tab navigation — 3 tabs */}
      <div className="tab-nav">
        {[
          { id: 'overview',  label: '📊 Overview & Map'  },
          { id: 'forecast',  label: '🔮 AI Forecast'      },
          { id: 'aqi',       label: '💨 Air Quality'      },
        ].map(t => (
          <button
            key={t.id}
            className={`tab-btn ${activeTab === t.id ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="dashboard-content">
        {activeTab === 'overview' && (
          <>
            <section className="section">
              <h2 className="section-title">
                🗺 Live Weather Map
                <span style={{
                  marginLeft: 10, fontSize: '0.7rem', fontWeight: 600,
                  padding: '2px 10px', borderRadius: 12,
                  background: mapSource === 'live' ? 'rgba(34,197,94,0.15)' :
                              mapSource === 'db'   ? 'rgba(56,189,248,0.15)' :
                              'rgba(255,255,255,0.07)',
                  color: mapSource === 'live' ? '#22c55e' :
                         mapSource === 'db'   ? '#38bdf8' : '#94a3b8',
                  border: `1px solid ${mapSource === 'live' ? 'rgba(34,197,94,0.3)' :
                           mapSource === 'db' ? 'rgba(56,189,248,0.3)' :
                           'rgba(255,255,255,0.1)'}`,
                }}>
                  {mapSource === 'live' ? '🟢 Live · Open-Meteo' :
                   mapSource === 'db'   ? '🔵 Cached · Supabase DB' :
                   '⏳ Loading...'}
                </span>
                <button
                  onClick={refreshMap}
                  style={{ marginLeft:8, background:'none', border:'none',
                    color:'#94a3b8', cursor:'pointer', fontSize:'0.8rem' }}
                  title="Force refresh map data"
                >↺</button>
              </h2>
              <WeatherMap weatherMap={weatherMap} selectedCity={selectedCity} onCitySelect={setSelectedCity} />
            </section>
            <section className="section">
              <h2 className="section-title">📈 Weather Graphs</h2>
              <WeatherCharts hourlyData={hourlyData} />
            </section>
          </>
        )}
        {activeTab === 'forecast' && (
          <section className="section">
            <AIForecastPanel selectedCity={selectedCity} />
          </section>
        )}
        {activeTab === 'aqi' && (
          <section className="section">
            <AQIPanel selectedCity={selectedCity} />
          </section>
        )}
      </main>

      <footer className="dashboard-footer">
        Data sourced from <a href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a> · TechVortex IIITG 2026
      </footer>
    </div>
  );
}
