import React, { useState } from 'react';
import { GoogleMap, Circle, Marker, InfoWindow } from '@react-google-maps/api';

const center = { lat: 20, lng: 10 };

// Satellite hybrid view — no custom styles needed (styles only work on roadmap)
function deduplicateLogs(logs) {
    const seen = new Map();
    for (const log of logs) {
        const key = `${parseFloat(log.lat).toFixed(1)}_${parseFloat(log.lon).toFixed(1)}`;
        if (!seen.has(key)) seen.set(key, log);
    }
    return Array.from(seen.values());
}

function getRisk(score) {
    if (score >= 8) return { color: '#ff1744', fillColor: '#ff1744', label: '🔴 DANGER' };
    if (score >= 5) return { color: '#ffea00', fillColor: '#ffa000', label: '🟡 CAUTION' };
    return { color: '#00e676', fillColor: '#00e676', label: '🟢 SAFE' };
}

const mapOptions = {
    mapTypeId:         'hybrid',    // Satellite imagery + country/city labels
    disableDefaultUI:  false,
    zoomControl:       true,
    streetViewControl: false,
    mapTypeControl:    true,        // Allow toggling between satellite and roadmap
    fullscreenControl: true,
    gestureHandling:   'cooperative',
};

export default function MapView({ logs, mapsReady }) {
    const [selected, setSelected] = useState(null);

    if (!mapsReady) return (
        <div style={{ height: '520px', display:'flex', alignItems:'center', justifyContent:'center',
                      background:'#060d18', borderRadius:'14px', color:'#3a5570', fontSize:'14px' }}>
            Loading map...
        </div>
    );


    const unique = deduplicateLogs(logs || []);

    return (
        <GoogleMap
            mapContainerStyle={{ width: '100%', height: '520px',
                                 borderRadius: '14px 14px 4px 4px',
                                 border: '1px solid #1a2535',
                                 overflow: 'visible' }}
            center={center}
            zoom={2}
            options={mapOptions}
        >
            {unique.map((log, i) => {
                const risk = getRisk(log.score);
                const radius = 250000 + (log.score / 10) * 400000;

                return (
                    <React.Fragment key={i}>
                        {/* Outer glow ring — wider, subtle pulse on satellite */}
                        <Circle
                            center={{ lat: log.lat, lng: log.lon }}
                            radius={radius * 1.6}
                            options={{
                                strokeColor:   risk.color,
                                strokeOpacity: 0.30,
                                strokeWeight:  1,
                                fillColor:     risk.fillColor,
                                fillOpacity:   0.08,
                                clickable:     false,
                            }}
                        />
                        {/* Main risk zone — higher opacity for satellite contrast */}
                        <Circle
                            center={{ lat: log.lat, lng: log.lon }}
                            radius={radius}
                            options={{
                                strokeColor:   risk.color,
                                strokeOpacity: 1,
                                strokeWeight:  2.5,
                                fillColor:     risk.fillColor,
                                fillOpacity:   0.28,
                                clickable:     true,
                            }}
                            onClick={() => setSelected(log)}
                        />
                        {/* Centre marker — white ring for satellite contrast */}
                        <Marker
                            position={{ lat: log.lat, lng: log.lon }}
                            onClick={() => setSelected(log)}
                            icon={{
                                path: window.google.maps.SymbolPath.CIRCLE,
                                scale: 9,
                                fillColor: risk.fillColor,
                                fillOpacity: 1,
                                strokeColor: '#ffffff',
                                strokeWeight: 2.5,
                            }}
                        />
                    </React.Fragment>
                );
            })}

            {selected && (
                <InfoWindow
                    position={{ lat: selected.lat, lng: selected.lon }}
                    onCloseClick={() => setSelected(null)}
                >
                    <div style={{ color:'#000', minWidth:'200px', fontFamily:'Inter,sans-serif', fontSize:'13px' }}>
                        <strong style={{ fontSize:'14px' }}>{selected.ocean_name}</strong>
                        <p style={{ margin:'6px 0 2px' }}>Risk: <strong>{getRisk(selected.score).label}</strong></p>
                        <p style={{ margin:'2px 0' }}>
                            Score: <strong>{selected.verified_score ?? selected.score}/10</strong>
                            {selected.raw_score && selected.raw_score !== (selected.verified_score ?? selected.score) &&
                                <span style={{ color:'#888', fontSize:'11px' }}> (model: {selected.raw_score})</span>}
                        </p>
                        <p style={{ margin:'2px 0' }}>Wave Height: <strong>{selected.height}m</strong></p>
                        {selected.wind_speed > 0 && <p style={{ margin:'2px 0' }}>Wind: <strong>{selected.wind_speed} km/h</strong></p>}
                        {selected.water_temp && <p style={{ margin:'2px 0' }}>
                            Water Temp: <strong>{selected.water_temp}°C</strong>
                            {selected.nasa_sst && <span style={{ color:'#0066cc', fontSize:'10px' }}> 🛰️ NASA</span>}
                        </p>}
                        {selected.ocean_current_velocity > 0 && (
                            <p style={{ margin:'2px 0', color: selected.ocean_current_velocity > 0.5 ? '#cc0000' : '#333' }}>
                                Current: <strong>{selected.ocean_current_velocity} m/s</strong>
                                {selected.ocean_current_velocity > 0.5 && ' ⚠️'}
                            </p>
                        )}
                        {selected.explanation && (
                            <p style={{ margin:'6px 0 0', fontSize:'11px', color:'#333',
                                        background:'#f0f4ff', borderRadius:'4px', padding:'6px',
                                        borderLeft:'3px solid #1a73e8', lineHeight:'1.4' }}>
                                🤖 {selected.explanation}
                            </p>
                        )}
                    </div>
                </InfoWindow>
            )}
        </GoogleMap>
    );
}