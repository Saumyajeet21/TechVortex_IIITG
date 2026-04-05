import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

const OCEAN_API = import.meta.env.VITE_OCEAN_API_URL || 'http://localhost:8001';
const MAPS_KEY  = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const ACTIVITIES = [
  'Surfing', 'Travelling', 'Naval Ships',
  'Merchant Ship', 'Water Sports', 'Deep Sea Travelling for Study',
];

// ── Risk helpers ─────────────────────────────────────────────────────────────
function riskMeta(score) {
  if (score <= 3)  return { label: 'SAFE',    color: '#22c55e', bg: 'rgba(34,197,94,0.15)'   };
  if (score <= 5)  return { label: 'LOW',     color: '#a3e635', bg: 'rgba(163,230,53,0.12)'  };
  if (score <= 7)  return { label: 'CAUTION', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)'  };
  if (score <= 9)  return { label: 'DANGER',  color: '#f87171', bg: 'rgba(248,113,113,0.15)' };
  return               { label: 'EXTREME', color: '#c084fc', bg: 'rgba(192,132,252,0.15)' };
}

// ── Geocode a place name → lat/lon ────────────────────────────────────────
async function geocode(query) {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
    );
    const d = await res.json();
    if (d.results?.length) {
      return { lat: d.results[0].latitude, lon: d.results[0].longitude, name: d.results[0].name };
    }
  } catch {}
  return null;
}

// ── Tiny map pin SVG ──────────────────────────────────────────────────────
function MapPin({ score, x, y, name, onClick, active }) {
  const { color } = riskMeta(score);
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }} transform={`translate(${x},${y})`}>
      {active && (
        <circle r={20} fill="none" stroke={color} strokeWidth={2} opacity={0.5}>
          <animate attributeName="r" from="14" to="24" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      <circle r={10} fill={color} opacity={0.85} stroke="#0a1628" strokeWidth={2} />
      <text textAnchor="middle" dy={4} fontSize={9} fontWeight="bold" fill="#0a1628">{score}</text>
      {active && (
        <text y={20} textAnchor="middle" fontSize={8} fill={color} fontWeight={600}>
          {name?.split(' ')[0]}
        </text>
      )}
    </g>
  );
}

// ── World map positions (normalised % of SVG 800x400) ─────────────────────
const SENSOR_POSITIONS = {
  'Pacific Ocean':     { px: 12,  py: 42 },
  'Atlantic Ocean':    { px: 34,  py: 38 },
  'Indian Ocean':      { px: 62,  py: 62 },
  'Mediterranean Sea': { px: 50,  py: 32 },
  'Caribbean Sea':     { px: 25,  py: 47 },
  'Southern Ocean':    { px: 50,  py: 88 },
  'Arctic Ocean':      { px: 50,  py: 6  },
};

export default function OceanDashboard({ onBack }) {
  const [logs,       setLogs]      = useState([]);
  const [history,    setHistory]   = useState([]);   // last N scans for trend chart
  const [selected,   setSelected]  = useState(null); // selected ocean name
  const [lastScan,   setLastScan]  = useState(null);
  const [topAlert,   setTopAlert]  = useState(null);
  const svgRef = useRef(null);

  // Registration form
  const [form, setForm] = useState({
    full_name: '', phone_number: '', location_name: '',
    lat: '', lon: '', activity_type: 'Surfing',
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regStatus,  setRegStatus]  = useState('');   // 'fetching' | 'analyzing' | ''
  const [regResult,  setRegResult]  = useState(null);
  const [geocoding,  setGeocoding]  = useState(false);
  const [emergency,  setEmergency]  = useState(null);
  const [emergencyLoading, setEL]   = useState(false);

  // ── Fetch logs ──────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    try {
      const res  = await fetch(`${OCEAN_API}/logs`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      // deduplicate by ocean_name — keep freshest
      const seen = new Set(); const deduped = [];
      for (const l of data) {
        if (!seen.has(l.ocean_name)) { seen.add(l.ocean_name); deduped.push(l); }
      }
      setLogs(deduped);

      // build trend history (last 20 log entries of raw data for line chart)
      setHistory(data.slice(0, 20).reverse().map((l, i) => ({
        t: i,
        score: l.score,
        wave:  +(l.height || 0).toFixed(2),
        time:  l.created_at?.slice(11, 16) || '',
      })));

      // top alert = highest risk
      const top = [...deduped].sort((a, b) => b.score - a.score)[0];
      setTopAlert(top);
      setLastScan(new Date());
    } catch {}
  }, []);

  useEffect(() => {
    fetchLogs();
    const t = setInterval(fetchLogs, 20000);
    return () => clearInterval(t);
  }, [fetchLogs]);

  // ── Geocode location name when typed ───────────────────────────────────
  const geoTimer = useRef(null);
  function handleLocChange(val) {
    setForm(p => ({ ...p, location_name: val, lat: '', lon: '' }));
    clearTimeout(geoTimer.current);
    if (val.length < 3) return;
    geoTimer.current = setTimeout(async () => {
      setGeocoding(true);
      const r = await geocode(val);
      if (r) setForm(p => ({ ...p, lat: r.lat, lon: r.lon }));
      setGeocoding(false);
    }, 600);
  }

  // ── Registration ────────────────────────────────────────────────────────
  async function handleRegister(e) {
    e.preventDefault();
    setRegLoading(true); setRegResult(null); setRegStatus('fetching');
    setTimeout(() => setRegStatus('analyzing'), 2000);
    try {
      const res = await fetch(`${OCEAN_API}/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, lat: parseFloat(form.lat) || 0, lon: parseFloat(form.lon) || 0 }),
      });
      setRegResult(await res.json());
    } catch { setRegResult({ error: true }); }
    finally { setRegLoading(false); setRegStatus(''); }
  }

  async function handleEmergency() {
    if (!window.confirm('Send emergency SMS to ALL registered users?')) return;
    setEL(true);
    try {
      const r = await fetch(`${OCEAN_API}/trigger-emergency`, { method: 'POST' });
      setEmergency(await r.json());
    } catch { setEmergency({ status: 'error' }); }
    finally { setEL(false); }
  }

  // ── Radar chart data ────────────────────────────────────────────────────
  const radarData = logs.slice(0, 6).map(l => ({
    subject: l.ocean_name?.split(' ')[0] || '?',
    score:   l.score,
    wave:    +(l.height || 0).toFixed(1),
  }));

  // ── Comparison line data ────────────────────────────────────────────────
  const compData = logs.slice(0, 7).map((l, i) => ({
    name:  l.ocean_name?.split(' ')[0] || i,
    score: l.score,
    wave:  +(l.height || 0).toFixed(1),
  }));

  const selectedLog = logs.find(l => l.ocean_name === selected);
  const { label: alertLabel, color: alertColor } = topAlert ? riskMeta(topAlert.score) : { label: '', color: '#22c55e' };

  return (
    <div style={{
      minHeight: '100vh', background: '#060b14',
      fontFamily: "'Inter','Segoe UI',sans-serif", color: '#e2e8f0',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Top alert bar ── */}
      {topAlert && (
        <div style={{
          padding: '8px 20px', background: topAlert.score >= 8 ? 'rgba(239,68,68,0.18)' : 'rgba(251,191,36,0.12)',
          border: `1px solid ${alertColor}44`, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ color: alertColor, fontWeight: 700, fontSize: '0.82rem' }}>
            ▲ {alertLabel} — {topAlert.ocean_name} (Score: {topAlert.score}/10)
          </span>
          <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
            Wave: {topAlert.height?.toFixed(1)}m · Wind: {topAlert.wind_speed?.toFixed(0)}km/h
            · Water: {topAlert.water_temp?.toFixed(1)}°C
          </span>
          <button onClick={onBack} style={{
            marginLeft: 'auto', background: 'none', border: '1px solid rgba(255,255,255,0.15)',
            color: '#94a3b8', padding: '3px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem',
          }}>← Back</button>
        </div>
      )}

      {/* ── Main body: map (left) + panels (right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', flex: 1, minHeight: 0 }}>

        {/* ── LEFT: World map SVG ── */}
        <div style={{ position: 'relative', overflow: 'hidden', background: '#070d1a' }}>
          {/* Map header */}
          <div style={{ position: 'absolute', top: 10, left: 12, zIndex: 2,
            display: 'flex', gap: 8 }}>
            {['Map', 'Satellite'].map((t, i) => (
              <button key={t} style={{
                padding: '4px 12px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                background: i === 1 ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.06)',
                border: i === 1 ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(255,255,255,0.1)',
                color: i === 1 ? '#22d3ee' : '#94a3b8', cursor: 'pointer',
              }}>{t}</button>
            ))}
          </div>

          {/* SVG World Map */}
          <svg ref={svgRef} viewBox="0 0 800 420" width="100%" height="100%"
            style={{ display: 'block' }}>
            {/* Ocean background */}
            <rect width={800} height={420} fill="#0c1a2e" />
            {/* Very simplified continent shapes as paths */}
            {/* North America */}
            <path d="M120,60 L200,50 L240,80 L230,150 L190,180 L160,170 L130,130 Z"
              fill="#1a2d1a" stroke="#1e3a1e" strokeWidth={0.5} />
            {/* South America */}
            <path d="M180,190 L220,200 L230,280 L200,330 L170,310 L160,240 Z"
              fill="#1a2d1a" stroke="#1e3a1e" strokeWidth={0.5} />
            {/* Europe */}
            <path d="M370,50 L430,45 L450,80 L420,100 L390,90 L370,70 Z"
              fill="#1a2d1a" stroke="#1e3a1e" strokeWidth={0.5} />
            {/* Africa */}
            <path d="M380,110 L450,100 L470,200 L440,300 L390,300 L360,210 L360,130 Z"
              fill="#1a2d1a" stroke="#1e3a1e" strokeWidth={0.5} />
            {/* Asia */}
            <path d="M450,30 L650,25 L680,100 L620,140 L560,130 L500,110 L460,80 Z"
              fill="#1a2d1a" stroke="#1e3a1e" strokeWidth={0.5} />
            {/* Australia */}
            <path d="M610,240 L690,235 L700,300 L660,320 L610,300 Z"
              fill="#1a2d1a" stroke="#1e3a1e" strokeWidth={0.5} />
            {/* India */}
            <path d="M540,120 L570,115 L580,180 L555,195 L535,170 Z"
              fill="#1a2d1a" stroke="#1e3a1e" strokeWidth={0.5} />

            {/* Grid lines */}
            {[100,200,300,400,500,600,700].map(x => (
              <line key={x} x1={x} y1={0} x2={x} y2={420}
                stroke="rgba(6,182,212,0.06)" strokeWidth={0.5} strokeDasharray="3 6" />
            ))}
            {[70,140,210,280,350].map(y => (
              <line key={y} x1={0} y1={y} x2={800} y2={y}
                stroke="rgba(6,182,212,0.06)" strokeWidth={0.5} strokeDasharray="3 6" />
            ))}

            {/* Risk markers */}
            {logs.map(log => {
              const pos = SENSOR_POSITIONS[log.ocean_name];
              if (!pos) return null;
              const x = (pos.px / 100) * 800;
              const y = (pos.py / 100) * 420;
              return (
                <MapPin
                  key={log.ocean_name} score={log.score}
                  x={x} y={y} name={log.ocean_name}
                  active={selected === log.ocean_name}
                  onClick={() => setSelected(selected === log.ocean_name ? null : log.ocean_name)}
                />
              );
            })}
          </svg>

          {/* Selected location popup */}
          {selectedLog && (() => {
            const { color, label } = riskMeta(selectedLog.score);
            return (
              <div style={{
                position: 'absolute', bottom: 16, left: 16,
                background: 'rgba(6,11,20,0.92)', backdropFilter: 'blur(12px)',
                border: `1px solid ${color}44`, borderRadius: 14,
                padding: '14px 18px', minWidth: 260, maxWidth: 340,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.95rem' }}>
                    {selectedLog.ocean_name}
                  </span>
                  <span style={{
                    padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700,
                    color, background: `${color}22`,
                  }}>{label} {selectedLog.score}/10</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
                  {[
                    ['Wave',    `${selectedLog.height?.toFixed(1)} m`],
                    ['Wind',    `${selectedLog.wind_speed?.toFixed(0)} km/h`],
                    ['Water',   `${selectedLog.water_temp?.toFixed(1)}°C`],
                    ['Current', `${selectedLog.ocean_current_velocity?.toFixed(2)} m/s`],
                    ['Swell',   `${selectedLog.swell_height?.toFixed(1)} m`],
                    ['Vis.',    `${selectedLog.visibility?.toFixed(1)} km`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: 'rgba(255,255,255,0.04)',
                      borderRadius: 8, padding: '6px 8px' }}>
                      <div style={{ color: '#475569', fontSize: '0.6rem' }}>{k}</div>
                      <div style={{ color: color, fontWeight: 600, fontSize: '0.82rem' }}>{v}</div>
                    </div>
                  ))}
                </div>
                {selectedLog.explanation && (
                  <p style={{ margin: '10px 0 0', color: '#64748b', fontSize: '0.7rem',
                    lineHeight: 1.5, fontStyle: 'italic' }}>
                    {selectedLog.explanation}
                  </p>
                )}
                <button onClick={() => setSelected(null)} style={{
                  marginTop: 8, background: 'none', border: 'none',
                  color: '#475569', fontSize: '0.7rem', cursor: 'pointer',
                }}>✕ Close</button>
              </div>
            );
          })()}
        </div>

        {/* ── RIGHT: Registration + Telemetry ── */}
        <div style={{
          borderLeft: '1px solid rgba(6,182,212,0.12)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Alert Registration */}
          <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flex: 1, overflowY: 'auto' }}>
            <div style={{ color: '#22d3ee', fontWeight: 600, fontSize: '0.78rem',
              letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚡</span> Alert Registration
            </div>

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { key: 'full_name',    ph: 'Full name'       },
                { key: 'phone_number', ph: 'Phone (+91...)'  },
              ].map(f => (
                <input
                  key={f.key} required value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.ph}
                  style={{
                    padding: '8px 10px', background: 'rgba(15,23,42,0.8)',
                    border: '1px solid rgba(6,182,212,0.2)', borderRadius: 6,
                    color: '#e2e8f0', fontSize: '0.78rem', outline: 'none',
                  }}
                />
              ))}

              <select value={form.activity_type}
                onChange={e => setForm(p => ({ ...p, activity_type: e.target.value }))}
                style={{
                  padding: '8px 10px', background: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(6,182,212,0.2)', borderRadius: 6,
                  color: '#e2e8f0', fontSize: '0.78rem', outline: 'none',
                }}>
                {ACTIVITIES.map(a => <option key={a}>{a}</option>)}
              </select>

              {/* Location with auto-geocode */}
              <div style={{ position: 'relative' }}>
                <input
                  required value={form.location_name}
                  onChange={e => handleLocChange(e.target.value)}
                  placeholder="Location name (auto-geocoded)"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '8px 10px', background: 'rgba(15,23,42,0.8)',
                    border: `1px solid ${form.lat ? 'rgba(34,197,94,0.4)' : 'rgba(6,182,212,0.2)'}`,
                    borderRadius: 6, color: '#e2e8f0', fontSize: '0.78rem', outline: 'none',
                  }}
                />
                {form.lat && (
                  <div style={{ fontSize: '0.62rem', color: '#22c55e', marginTop: 2 }}>
                    ✓ {form.lat.toFixed ? (+form.lat).toFixed(3) : form.lat}, {(+form.lon).toFixed(3)}
                  </div>
                )}
                {geocoding && (
                  <div style={{ fontSize: '0.62rem', color: '#64748b', marginTop: 2 }}>
                    Geocoding...
                  </div>
                )}
              </div>

              <button type="submit" disabled={regLoading}
                style={{
                  padding: '10px', borderRadius: 8,
                  background: regLoading
                    ? 'rgba(6,182,212,0.2)'
                    : 'linear-gradient(135deg,#0891b2,#0e7490)',
                  border: 'none', color: '#fff', fontWeight: 600,
                  fontSize: '0.8rem', cursor: regLoading ? 'not-allowed' : 'pointer',
                }}>
                {regLoading
                  ? regStatus === 'analyzing'
                    ? '⟳ Analyzing ocean conditions via satellite + Gemini AI...'
                    : '⟳ Fetching Satellite + AI Data...'
                  : '⚡ Register & Get Risk Score'}
              </button>
            </form>

            {/* Result */}
            {regResult && !regResult.error && (() => {
              const { color, label } = riskMeta(regResult.score);
              return (
                <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10,
                  background: `${color}11`, border: `1px solid ${color}33` }}>
                  <div style={{ fontWeight: 700, color, fontSize: '0.9rem' }}>
                    {label} — {regResult.score}/10
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.7rem', marginTop: 4, fontStyle: 'italic' }}>
                    {regResult.explanation}
                  </div>
                  {regResult.score >= 8 && (
                    <div style={{ marginTop: 8, color: '#fca5a5', fontSize: '0.72rem', fontWeight: 600 }}>
                      DANGER — SMS alert sent to your number
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* System Telemetry */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(6,182,212,0.1)',
            background: 'rgba(6,11,20,0.5)' }}>
            <div style={{ color: '#22d3ee', fontWeight: 600, fontSize: '0.72rem',
              letterSpacing: 1, marginBottom: 10 }}>
              ⚙ SYSTEM TELEMETRY
            </div>
            {[
              ['Active Sensors', `${logs.length * 20}s scan interval`],
              ['Inference Engine', 'LightGBM v3.2 + Physics blend'],
              ['AI Verify', 'Gemini 2.5 Flash (30min cache)'],
              ['Satellite SST', 'NASA PODAAC MUR-JPL-L4'],
              ['SMS Alerts', 'Twilio (30min window)'],
              ['Last Scan', lastScan?.toLocaleTimeString('en-IN') || 'Connecting...'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
                marginBottom: 5, fontSize: '0.68rem' }}>
                <span style={{ color: '#475569' }}>{k}:</span>
                <span style={{ color: '#94a3b8' }}>{v}</span>
              </div>
            ))}

            {/* Emergency button */}
            <button onClick={handleEmergency} disabled={emergencyLoading}
              style={{
                width: '100%', marginTop: 10, padding: '7px', borderRadius: 7,
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
                color: '#f87171', fontWeight: 600, fontSize: '0.74rem', cursor: 'pointer',
              }}>
              {emergencyLoading ? 'Sending...' : '⚠ Trigger Emergency SMS Broadcast'}
            </button>
            {emergency && (
              <div style={{ marginTop: 6, color: '#64748b', fontSize: '0.65rem', textAlign: 'center' }}>
                {emergency.status} — {(emergency.sms_sent_to || []).join(', ') || 'No users registered'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom: Analytics Charts ── */}
      <div style={{
        borderTop: '1px solid rgba(6,182,212,0.1)',
        background: '#070d1a', padding: '14px 16px',
      }}>
        <div style={{ color: '#22d3ee', fontWeight: 600, fontSize: '0.72rem',
          letterSpacing: 1, marginBottom: 12 }}>
          ▸ REAL-TIME RISK ANALYTICS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>

          {/* Line chart — trend */}
          <div>
            <div style={{ color: '#475569', fontSize: '0.62rem', marginBottom: 6 }}>LIVE RISK TREND</div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(6,182,212,0.07)" />
                <XAxis dataKey="time" tick={{ fill: '#334155', fontSize: 8 }} interval={4} />
                <YAxis domain={[0, 10]} tick={{ fill: '#334155', fontSize: 8 }} />
                <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #1e3a4a', fontSize: 10 }} />
                <Line type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={2}
                  dot={false} name="Risk" />
                <Line type="monotone" dataKey="wave" stroke="#22c55e" strokeWidth={1.5}
                  dot={false} name="Wave" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart — risk by location */}
          <div>
            <div style={{ color: '#475569', fontSize: '0.62rem', marginBottom: 6 }}>RISK BY LOCATION</div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={compData}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(6,182,212,0.07)" />
                <XAxis dataKey="name" tick={{ fill: '#334155', fontSize: 7 }} />
                <YAxis domain={[0, 10]} tick={{ fill: '#334155', fontSize: 8 }} />
                <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #1e3a4a', fontSize: 10 }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}
                  fill="#06b6d4" name="Risk Score"
                  label={{ position: 'top', fill: '#475569', fontSize: 7 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar chart */}
          <div>
            <div style={{ color: '#475569', fontSize: '0.62rem', marginBottom: 6 }}>OCEAN RISK RADAR</div>
            <ResponsiveContainer width="100%" height={120}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(6,182,212,0.12)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 7 }} />
                <Radar dataKey="score" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Comparison line – score vs wave */}
          <div>
            <div style={{ color: '#475569', fontSize: '0.62rem', marginBottom: 6 }}>OCEAN COMPARISON</div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={compData}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(6,182,212,0.07)" />
                <XAxis dataKey="name" tick={{ fill: '#334155', fontSize: 7 }} />
                <YAxis tick={{ fill: '#334155', fontSize: 8 }} />
                <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #1e3a4a', fontSize: 10 }} />
                <Legend wrapperStyle={{ fontSize: 8, color: '#475569' }} />
                <Line type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={2} dot={false} name="Risk" />
                <Line type="monotone" dataKey="wave"  stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Wave(m)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
