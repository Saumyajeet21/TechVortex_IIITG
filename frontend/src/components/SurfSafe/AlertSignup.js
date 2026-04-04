import React, { useState, useRef } from 'react';
import { Autocomplete } from '@react-google-maps/api';


export default function AlertSignup({ onSignup, mapsReady }) {
    const [fullName, setFullName]         = useState('');
    const [phoneNumber, setPhoneNumber]   = useState('');
    const [activityType, setActivityType] = useState('Surfing');
    const [beachInput, setBeachInput]     = useState('');
    const [coordinates, setCoordinates]   = useState({ lat: null, lon: null });
    const [beachName, setBeachName]       = useState('');
    const [status, setStatus]             = useState('');
    const [result, setResult]             = useState(null);
    const [loading, setLoading]           = useState(false);
    const autocompleteRef = useRef(null);

    const onPlaceChanged = () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place?.geometry?.location) return;
        const lat = place.geometry.location.lat();
        const lon = place.geometry.location.lng();
        setCoordinates({ lat, lon });
        setBeachName(place.formatted_address || place.name || beachInput);
        setBeachInput(place.formatted_address || place.name || beachInput);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!coordinates.lat || !coordinates.lon) {
            setStatus('❌ Please search and select a location from the dropdown.');
            return;
        }
        setLoading(true);
        setResult(null);
        setStatus('⏳ Analysing ocean conditions via satellite + Gemini AI...');

        try {
            const response = await fetch('http://localhost:8000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name:       fullName,
                    phone_number:    phoneNumber,
                    activity_type:   activityType,
                    monitored_beach: beachName,
                    lat: coordinates.lat,
                    lon: coordinates.lon,
                })
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            const data = await response.json();
            setResult(data);

            const score = data.verified_score ?? data.score;
            setStatus(score >= 8 ? 'danger' : score >= 5 ? 'caution' : 'safe');

            if (onSignup) onSignup();
            setFullName(''); setPhoneNumber('');
            setBeachInput(''); setBeachName('');
            setCoordinates({ lat: null, lon: null });

        } catch (err) {
            console.error(err);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const statusColor = () => {
        if (status === 'danger')  return '#ff1744';
        if (status === 'caution') return '#ffaa00';
        if (status === 'safe')    return '#00e676';
        if (status === 'error')   return '#ff1744';
        return '#00d4ff';
    };

    const statusText = () => {
        if (!result) return status;
        const s = result.verified_score ?? result.score;
        const h = result.wave_height;
        if (status === 'danger')  return `🔴 DANGER: NOT SAFE for ${activityType}! Waves ${h}m — Risk ${s}/10`;
        if (status === 'caution') return `🟡 CAUTION: Moderate risk. Waves ${h}m — Risk ${s}/10`;
        if (status === 'safe')    return `🟢 SAFE: Good conditions. Waves ${h}m — Risk ${s}/10`;
        if (status === 'error')   return '❌ Connection failed — is the backend running?';
        return status;
    };

    return (
        <div style={cardStyle}>
            <h2 style={{ color:'#00d4ff', marginTop:0, marginBottom:'20px' }}>🚨 Alert Registration</h2>

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                <input type="text" placeholder="Full Name" value={fullName} required
                    onChange={e => setFullName(e.target.value)} style={inputStyle} />

                <input type="tel" placeholder="Phone (e.g. +91 98765 43210)" value={phoneNumber} required
                    onChange={e => setPhoneNumber(e.target.value)} style={inputStyle} />

                <select value={activityType} onChange={e => setActivityType(e.target.value)} style={inputStyle}>
                    <option>Surfing</option>
                    <option>Travelling</option>
                    <option>Naval Ships</option>
                    <option>Merchant Ship</option>
                    <option>Water Sports</option>
                    <option>Deep Sea Travelling for Study</option>
                </select>

                {/* Google Places Autocomplete — loaded by App.js */}
                {mapsReady ? (
                    <Autocomplete
                        onLoad={ac => { autocompleteRef.current = ac; }}
                        onPlaceChanged={onPlaceChanged}
                    >
                        <input
                            type="text"
                            placeholder="🔍 Search beach or ocean location..."
                            value={beachInput}
                            onChange={e => { setBeachInput(e.target.value); setCoordinates({ lat:null, lon:null }); }}
                            required
                            style={{ ...inputStyle, borderColor: coordinates.lat ? '#00e676' : '#444' }}
                        />
                    </Autocomplete>
                ) : (
                    <input type="text" placeholder="Loading location search..." disabled style={inputStyle} />
                )}

                {coordinates.lat && (
                    <div style={{ fontSize:'11px', color:'#00e676', marginTop:'-6px', paddingLeft:'4px' }}>
                        ✅ {coordinates.lat.toFixed(4)}°, {coordinates.lon.toFixed(4)}°
                    </div>
                )}

                <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }}>
                    {loading ? '🛰️ Fetching Satellite + AI Data...' : 'Activate Coastal Guardian'}
                </button>

                {status && (
                    <p style={{ color: statusColor(), fontWeight:'bold', textAlign:'center', margin:0, fontSize:'13px' }}>
                        {statusText()}
                    </p>
                )}
            </form>

            {/* ── Result card ── */}
            {result && (
                <div style={resultCard}>
                    {/* Source badges */}
                    <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'14px' }}>
                        {(result.data_sources || []).map(src => (
                            <span key={src} style={badge(src)}>
                                {src === 'open-meteo'      && '🌊 Open-Meteo'}
                                {src === 'nasa-podaac-sst' && '🛰️ NASA Satellite'}
                                {src === 'gemini-2.5-flash'&& '🤖 Gemini 2.5 Flash'}
                            </span>
                        ))}
                    </div>

                    {/* Score boxes */}
                    <div style={{ display:'flex', gap:'12px', marginBottom:'14px' }}>
                        <div style={scoreBox('#00d4ff')}>
                            <div style={{ fontSize:'10px', opacity:0.7 }}>Model Score</div>
                            <div style={{ fontSize:'22px', fontWeight:'bold' }}>{result.raw_score}/10</div>
                        </div>
                        <div style={scoreBox(result.correction_made ? '#ffaa00' : '#00e676')}>
                            <div style={{ fontSize:'10px', opacity:0.7 }}>Gemini Verified</div>
                            <div style={{ fontSize:'22px', fontWeight:'bold' }}>{result.verified_score}/10</div>
                            <div style={{ fontSize:'10px', opacity:0.8 }}>{result.confidence} confidence</div>
                        </div>
                    </div>

                    {/* Gemini explanation */}
                    {result.explanation && (
                        <div style={explainBox}>
                            <span style={{ color:'#00d4ff', fontWeight:'bold' }}>🤖 AI: </span>
                            {result.explanation}
                            {result.correction_made &&
                                <span style={{ color:'#ffaa00', marginLeft:'6px' }}>⚡ Score corrected</span>}
                        </div>
                    )}

                    {/* 9-feature grid */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginTop:'14px' }}>
                        <Metric icon="🌊" label="Wave Height"  value={`${result.wave_height}m`} />
                        <Metric icon="⏱️" label="Wave Period"  value={`${result.wave_period}s`} />
                        <Metric icon="🧭" label="Direction"   value={`${result.wave_direction}°`} />
                        <Metric icon="🌀" label="Swell"        value={`${result.swell_height}m`} />
                        <Metric icon="📡" label="Swell Period" value={`${result.swell_period}s`} />
                        <Metric icon="💨" label="Wind"         value={`${result.wind_speed}km/h`} />
                        <Metric icon="🌊" label="Current"      value={`${result.ocean_current_velocity}m/s`} highlight={result.ocean_current_velocity > 0.5} />
                        <Metric icon="👁️" label="Visibility"   value={`${result.visibility}km`} />
                        <Metric icon={result.nasa_sst ? '🛰️' : '🌡️'} label="Water Temp" value={`${result.water_temp}°C`} sub={result.nasa_sst ? 'NASA' : 'est.'} />
                    </div>
                </div>
            )}
        </div>
    );
}

function Metric({ icon, label, value, sub, highlight }) {
    return (
        <div style={{
            background: highlight ? 'rgba(255,23,68,0.15)' : 'rgba(255,255,255,0.04)',
            borderRadius: '8px', padding: '10px', textAlign: 'center',
            border: `1px solid ${highlight ? 'rgba(255,23,68,0.4)' : 'rgba(255,255,255,0.07)'}`,
        }}>
            <div style={{ fontSize:'16px' }}>{icon}</div>
            <div style={{ fontSize:'13px', fontWeight:'bold', color: highlight ? '#ff1744' : '#fff', marginTop:'2px' }}>{value}</div>
            <div style={{ fontSize:'10px', color:'#4a6580', marginTop:'2px' }}>{label}</div>
            {sub && <div style={{ fontSize:'9px', color:'#00d4ff' }}>{sub}</div>}
        </div>
    );
}

function badge(src) {
    const bg = { 'open-meteo':'#0d2a45','nasa-podaac-sst':'#0d2d1a','gemini-2.5-flash':'#2a1a3d' };
    return {
        padding:'3px 10px', borderRadius:'99px',
        background: bg[src] || '#1a1a2e', color:'#c8dff0',
        fontSize:'11px', fontWeight:'bold', border:'1px solid rgba(255,255,255,0.1)',
    };
}

function scoreBox(color) {
    return { flex:1, background:`${color}18`, borderRadius:'10px', padding:'12px',
             textAlign:'center', border:`1px solid ${color}44`, color:'#fff' };
}

const cardStyle   = { backgroundColor:'#0a1020', padding:'20px', borderRadius:'12px', border:'1px solid #1a2535' };
const resultCard  = { marginTop:'18px', padding:'16px', borderRadius:'10px', background:'rgba(0,212,255,0.04)', border:'1px solid rgba(0,212,255,0.15)' };
const explainBox  = { fontSize:'12px', color:'#b0c8e0', background:'rgba(255,255,255,0.04)', borderRadius:'8px', padding:'10px', marginBottom:'4px', lineHeight:'1.5', border:'1px solid rgba(0,212,255,0.15)' };
const inputStyle  = { padding:'12px', borderRadius:'6px', border:'1px solid #2a3a50', backgroundColor:'#111c2e', color:'#fff', width:'100%', boxSizing:'border-box', fontSize:'14px', outline:'none' };
const btnStyle    = { backgroundColor:'#00d4ff', color:'#000', padding:'14px', border:'none', borderRadius:'6px', fontWeight:'bold', cursor:'pointer', fontSize:'15px', marginTop:'6px' };