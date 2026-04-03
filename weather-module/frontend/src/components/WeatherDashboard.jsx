import React, { useState } from 'react';
import { useWeatherData } from '../hooks/useWeatherData';
import { CITIES, getWeatherLabel } from '../services/openmeteo';
import WeatherMap from './WeatherMap';
import WeatherCharts from './WeatherCharts';
import ForecastPanel from './ForecastPanel';
import NotificationBell from './NotificationBell';

const WEATHER_ICONS = {
  0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️',
  45: '🌫', 48: '🌫', 51: '🌦', 53: '🌦', 55: '🌧',
  61: '🌧', 63: '🌧', 65: '🌊', 71: '🌨', 73: '❄️', 75: '❄️',
  80: '🌦', 81: '🌧', 82: '⛈', 95: '⛈', 96: '⛈', 99: '⛈',
};

export default function WeatherDashboard() {
  const {
    currentWeather, hourlyData, weatherMap,
    selectedCity, setSelectedCity,
    loading, error, lastUpdated, refresh,
  } = useWeatherData();

  const [activeTab, setActiveTab] = useState('overview'); // overview | forecast

  const icon = WEATHER_ICONS[currentWeather?.weathercode] ?? '🌡';

  return (
    <div className="dashboard">
      <NotificationBell currentWeather={currentWeather} cityName={selectedCity.name} />

      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo">🌦 WeatherAI</div>
          <div className="header-meta">
            <span>AI-Driven Climate Intelligence</span>
            {lastUpdated && (
              <span className="last-updated">
                Updated: {lastUpdated.toLocaleTimeString('en-IN')}
              </span>
            )}
          </div>
        </div>
        <div className="header-right">
          <select
            className="city-select"
            value={selectedCity.name}
            onChange={(e) => setSelectedCity(CITIES.find(c => c.name === e.target.value))}
          >
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
              <div className="hero-temp">{currentWeather.temperature}°C</div>
              <div className="hero-location">{selectedCity.name}</div>
              <div className="hero-condition">{getWeatherLabel(currentWeather.weathercode)}</div>
            </div>
          </div>
          <div className="hero-stats">
            <div className="stat-card">
              <span className="stat-icon">🌡</span>
              <span className="stat-label">Feels Like</span>
              <span className="stat-value">{currentWeather.feelsLike}°C</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">💧</span>
              <span className="stat-label">Humidity</span>
              <span className="stat-value">{currentWeather.humidity}%</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">💨</span>
              <span className="stat-label">Wind</span>
              <span className="stat-value">{currentWeather.windspeed} km/h</span>
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

      {/* Tab navigation */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview & Map
        </button>
        <button
          className={`tab-btn ${activeTab === 'forecast' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('forecast')}
        >
          🔮 72-Hour Forecast
        </button>
      </div>

      {/* Content */}
      <main className="dashboard-content">
        {activeTab === 'overview' && (
          <>
            <section className="section">
              <h2 className="section-title">🗺 Live Weather Map — Updates Every Hour</h2>
              <WeatherMap
                weatherMap={weatherMap}
                selectedCity={selectedCity}
                onCitySelect={setSelectedCity}
              />
            </section>
            <section className="section">
              <h2 className="section-title">📈 Weather Graphs</h2>
              <WeatherCharts hourlyData={hourlyData} />
            </section>
          </>
        )}
        {activeTab === 'forecast' && (
          <section className="section">
            <ForecastPanel selectedCity={selectedCity} />
          </section>
        )}
      </main>

      <footer className="dashboard-footer">
        Data sourced from <a href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a> · TechVortex IIITG 2026
      </footer>
    </div>
  );
}
