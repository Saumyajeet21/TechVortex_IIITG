import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CITIES, getWeatherLabel } from '../services/openmeteo';

function getTempColor(temp) {
  if (temp >= 40) return '#ff2d2d';
  if (temp >= 35) return '#ff7b00';
  if (temp >= 28) return '#f59e0b';
  if (temp >= 20) return '#22c55e';
  if (temp >= 10) return '#38bdf8';
  return '#a78bfa';
}

function FlyToCity({ city }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([city.lat, city.lon], 7, { duration: 1.5 });
  }, [city, map]);
  return null;
}

export default function WeatherMap({ weatherMap, selectedCity, onCitySelect }) {
  return (
    <div className="map-wrapper">
      <MapContainer
        center={[22.5, 82]}
        zoom={5}
        className="leaflet-map"
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        />
        <FlyToCity city={selectedCity} />

        {CITIES.map((city) => {
          const data = weatherMap[city.name];
          const temp = data?.temperature ?? 25;
          const color = getTempColor(temp);
          const isSelected = city.name === selectedCity.name;

          return (
            <CircleMarker
              key={city.name}
              center={[city.lat, city.lon]}
              radius={isSelected ? 18 : 12}
              pathOptions={{
                color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)',
                weight: isSelected ? 3 : 1.5,
                fillColor: color,
                fillOpacity: 0.9,
              }}
              eventHandlers={{ click: () => onCitySelect(city) }}
            >
              <Popup>
                <div className="map-popup">
                  <h3>{city.name}</h3>
                  {data ? (
                    <>
                      <p>🌡 {data.temperature}°C</p>
                      <p>💨 {data.windspeed} km/h</p>
                      <p>🌧 {data.precipitation} mm</p>
                      <p>⛅ {getWeatherLabel(data.weathercode)}</p>
                    </>
                  ) : (
                    <p>Loading...</p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Temperature legend */}
      <div className="map-legend">
        <span style={{ color: '#a78bfa' }}>● &lt;10°C</span>
        <span style={{ color: '#38bdf8' }}>● 10–20°C</span>
        <span style={{ color: '#22c55e' }}>● 20–28°C</span>
        <span style={{ color: '#f59e0b' }}>● 28–35°C</span>
        <span style={{ color: '#ff7b00' }}>● 35–40°C</span>
        <span style={{ color: '#ff2d2d' }}>● &gt;40°C</span>
      </div>
    </div>
  );
}
