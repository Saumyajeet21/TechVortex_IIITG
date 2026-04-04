import React, { useState, useCallback } from 'react';
import {
  MapContainer, TileLayer, CircleMarker, Popup,
  useMap, useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CITIES, getWeatherLabel } from '../services/openmeteo';

// ── Weather Icons ──────────────────────────────────────────────────────────
const WX_ICON = {
  0:'☀️',1:'🌤',2:'⛅',3:'☁️',
  45:'🌫',48:'🌫',
  51:'🌦',53:'🌦',55:'🌧',
  61:'🌧',63:'🌧',65:'🌊',
  71:'🌨',73:'❄️',75:'❄️',
  80:'🌦',81:'🌧',82:'⛈',
  95:'⛈',96:'⛈',99:'⛈',
};
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getTempColor(temp) {
  if (temp >= 40) return '#ff2d2d';
  if (temp >= 35) return '#ff7b00';
  if (temp >= 28) return '#f59e0b';
  if (temp >= 20) return '#22c55e';
  if (temp >= 10) return '#38bdf8';
  return '#a78bfa';
}

// ── Fly to selected city ───────────────────────────────────────────────────
function FlyToCity({ city }) {
  const map = useMap();
  React.useEffect(() => {
    map.flyTo([city.lat, city.lon], 7, { duration: 1.5 });
  }, [city, map]);
  return null;
}

// ── Map click handler ──────────────────────────────────────────────────────
function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ── Reverse geocode with Nominatim ─────────────────────────────────────────
async function reverseGeocode(lat, lon) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
    { headers: { 'Accept-Language': 'en' } }
  );
  const d = await res.json();
  return (
    d.address?.city       ||
    d.address?.town       ||
    d.address?.village    ||
    d.address?.county     ||
    d.address?.state      ||
    d.display_name?.split(',')[0] ||
    'Unknown location'
  );
}

// ── Fetch 5-day daily forecast from Open-Meteo ─────────────────────────────
async function fetchDailyForecast(lat, lon) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
    `&current=temperature_2m,relative_humidity_2m,windspeed_10m,weathercode` +
    `&timezone=auto&forecast_days=5`
  );
  return res.json();
}

// ── Weather card component ─────────────────────────────────────────────────
function WeatherCard({ data, onClose }) {
  if (!data) return null;
  const { city, daily, current, utcOffset } = data;

  // Temp range for bar scaling within this forecast
  const allMin = Math.min(...daily.min);
  const allMax = Math.max(...daily.max);
  const range  = allMax - allMin || 1;

  const offsetH = Math.round(utcOffset / 3600);
  const tzStr   = `UTC${offsetH >= 0 ? '+' : ''}${offsetH}`;

  return (
    <div className="wx-card">
      {/* Header */}
      <div className="wx-card-header">
        <div className="wx-card-title">
          <span className="wx-star">☆</span>
          <span className="wx-city-name">{city}</span>
        </div>
        <button className="wx-close" onClick={onClose}>✕</button>
      </div>

      {/* Sub-header */}
      <div className="wx-card-meta">
        <span className="wx-label">DAILY FORECAST</span>
        <span className="wx-tz">{tzStr}</span>
        <span className="wx-unit-label">TEMP. °C</span>
      </div>

      {/* Current now row */}
      <div className="wx-now-row">
        <span style={{ fontSize: '1.3rem' }}>{WX_ICON[current.weathercode ?? 0] ?? '🌡'}</span>
        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{current.temperature_2m}°C</span>
        <span style={{ color: '#94a3b8', fontSize: '0.78rem', marginLeft: 4 }}>
          💧 {current.relative_humidity_2m}%  💨 {current.windspeed_10m} km/h
        </span>
      </div>

      {/* Divider */}
      <div className="wx-divider" />

      {/* Daily rows */}
      {daily.time.map((t, i) => {
        const d    = new Date(t);
        const name = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAY_NAMES[d.getDay()];
        const lo   = daily.min[i];
        const hi   = daily.max[i];
        const barL = ((lo - allMin) / range) * 100;
        const barW = ((hi - lo)    / range) * 100;

        return (
          <div key={t} className="wx-day-row">
            <span className="wx-day-name">{name}</span>
            <span className="wx-day-icon">{WX_ICON[daily.codes[i]] ?? '🌡'}</span>
            <span className="wx-day-lo">{Math.round(lo)}°</span>
            <div className="wx-bar-track">
              <div
                className="wx-bar-fill"
                style={{
                  left:  `${barL}%`,
                  width: `${Math.max(barW, 4)}%`,
                  background: `linear-gradient(90deg, ${getTempColor(lo)}, ${getTempColor(hi)})`,
                }}
              />
            </div>
            <span className="wx-day-hi">{Math.round(hi)}°</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function WeatherMap({ weatherMap, selectedCity, onCitySelect }) {
  const [layer, setLayer]       = useState('satellite');  // 'satellite' | 'street'
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [clickMarker, setClickMarker] = useState(null);

  const handleMapClick = useCallback(async (lat, lon) => {
    setLoading(true);
    setCardData(null);
    setClickMarker({ lat, lon });
    try {
      const [city, wx] = await Promise.all([
        reverseGeocode(lat, lon),
        fetchDailyForecast(lat, lon),
      ]);
      setCardData({
        city,
        current: wx.current ?? {},
        utcOffset: wx.utc_offset_seconds ?? 0,
        daily: {
          time:  wx.daily?.time  ?? [],
          max:   wx.daily?.temperature_2m_max  ?? [],
          min:   wx.daily?.temperature_2m_min  ?? [],
          codes: wx.daily?.weathercode ?? [],
        },
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const streetUrl    = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div className="map-wrapper" style={{ position: 'relative' }}>

      {/* ── Layer toggle ─────────────────────────────────────────── */}
      <div className="map-layer-toggle">
        <button
          className={`layer-btn ${layer === 'satellite' ? 'layer-btn--active' : ''}`}
          onClick={() => setLayer('satellite')}
        >🛰 Satellite</button>
        <button
          className={`layer-btn ${layer === 'street' ? 'layer-btn--active' : ''}`}
          onClick={() => setLayer('street')}
        >🗺 Street</button>
      </div>

      {/* ── Click hint ───────────────────────────────────────────── */}
      <div className="map-click-hint">Click anywhere to get weather</div>

      {/* ── Loading spinner ──────────────────────────────────────── */}
      {loading && (
        <div className="map-loading-badge">
          <span className="spinner-sm" /> Fetching weather...
        </div>
      )}

      {/* ── Weather card ─────────────────────────────────────────── */}
      <WeatherCard data={cardData} onClose={() => { setCardData(null); setClickMarker(null); }} />

      <MapContainer
        center={[22.5, 82]}
        zoom={5}
        className="leaflet-map"
        zoomControl={true}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          key={layer}
          url={layer === 'satellite' ? satelliteUrl : streetUrl}
          attribution={
            layer === 'satellite'
              ? '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
              : '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
          }
          maxZoom={18}
          noWrap={true}
        />
        {/* Place name labels overlay on satellite */}
        {layer === 'satellite' && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution=""
            maxZoom={18}
            noWrap={true}
            opacity={1}
          />
        )}

        <FlyToCity city={selectedCity} />
        <ClickHandler onMapClick={handleMapClick} />

        {/* Existing city temperature dots */}
        {CITIES.map((city) => {
          const data  = weatherMap[city.name];
          const temp  = data?.temperature ?? 25;
          const color = getTempColor(temp);
          const isSel = city.name === selectedCity.name;

          return (
            <CircleMarker
              key={city.name}
              center={[city.lat, city.lon]}
              radius={isSel ? 16 : 10}
              pathOptions={{
                color:       isSel ? '#fff' : 'rgba(255,255,255,0.5)',
                weight:      isSel ? 3 : 1.5,
                fillColor:   color,
                fillOpacity: 0.9,
              }}
              eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); onCitySelect(city); } }}
            >
              <Popup>
                <div className="map-popup">
                  <h3>{city.name}</h3>
                  {data ? (
                    <>
                      <p>🌡 {data.temperature}°C</p>
                      <p>💨 {data.windspeed} km/h</p>
                      <p>⛅ {getWeatherLabel(data.weathercode)}</p>
                    </>
                  ) : <p>Loading...</p>}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Clicked location marker */}
        {clickMarker && (
          <CircleMarker
            center={[clickMarker.lat, clickMarker.lon]}
            radius={8}
            pathOptions={{ color: '#38bdf8', weight: 2, fillColor: '#38bdf8', fillOpacity: 0.4 }}
          />
        )}
      </MapContainer>

      {/* Temperature legend */}
      <div className="map-legend">
        <span style={{ color:'#a78bfa' }}>● &lt;10°C</span>
        <span style={{ color:'#38bdf8' }}>● 10–20°C</span>
        <span style={{ color:'#22c55e' }}>● 20–28°C</span>
        <span style={{ color:'#f59e0b' }}>● 28–35°C</span>
        <span style={{ color:'#ff7b00' }}>● 35–40°C</span>
        <span style={{ color:'#ff2d2d' }}>● &gt;40°C</span>
      </div>
    </div>
  );
}
