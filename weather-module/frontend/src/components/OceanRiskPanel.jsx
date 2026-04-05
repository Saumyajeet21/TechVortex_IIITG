import React, { useState, useEffect, useCallback } from 'react';

const OCEAN_API = import.meta.env.VITE_OCEAN_API_URL || 'http://localhost:8001';

const ACTIVITIES = [
  'Surfing', 'Travelling', 'Naval Ships',
  'Merchant Ship', 'Water Sports', 'Deep Sea Travelling for Study',
];

function riskLabel(score) {
  if (score <= 3) return { label: 'Safe',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   ring: '#22c55e' };
  if (score <= 6) return { label: 'Caution', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  ring: '#fbbf24' };
  if (score <= 8) return { label: 'Danger',  color: '#f87171', bg: 'rgba(248,113,113,0.12)', ring: '#f87171' };
  return              { label: 'Extreme', color: '#c084fc', bg: 'rgba(192,132,252,0.15)',  ring: '#c084fc' };
}

function ScoreRing({ score }) {
  const { color, label } = riskLabel(score);
  const r = 28, circ = 2 * Math.PI * r;
  const dash = (score / 10) * circ;
  return (
    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
      <svg width={72} height={72} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={6} />
        <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color, fontWeight: 700, fontSize: '1.1rem', lineHeight: 1 }}>{score}</span>
        <span style={{ color: '#94a3b8', fontSize: '0.55rem', marginTop: 2 }}>{label}</span>
      </div>
    </div>
  );
}

function OceanCard({ log }) {
  const { color, label, bg } = riskLabel(log.score);
  return (
    <div style={{
      background: 'rgba(15,23,42,0.6)', border: `1px solid ${color}33`,
      borderRadius: 14, padding: '14px 16px', display: 'flex',
      gap: 14, alignItems: 'center', transition: 'border-color 0.3s',
    }}>
      <ScoreRing score={log.score} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.9rem',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {log.ocean_name}
        </div>
        <div style={{
          display: 'inline-block', marginTop: 3, padding: '1px 8px',
          borderRadius: 20, fontSize: '0.68rem', fontWeight: 600,
          color, background: bg, border: `1px solid ${color}55`,
        }}>{label}</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { icon: '🌊', val: `${log.height?.toFixed(1)}m`, tip: 'Wave' },
            { icon: '💨', val: `${log.wind_speed?.toFixed(0)}km/h`, tip: 'Wind' },
            { icon: '🌡', val: `${log.water_temp?.toFixed(1)}°C`, tip: 'Water' },
            { icon: '🌀', val: `${log.ocean_current_velocity?.toFixed(2)}m/s`, tip: 'Current' },
          ].map(f => (
            <div key={f.tip} style={{ display: 'flex', alignItems: 'center',
              gap: 4, color: '#94a3b8', fontSize: '0.72rem' }}>
              <span>{f.icon}</span><span>{f.val}</span>
            </div>
          ))}
        </div>
        {log.explanation && (
          <div style={{ marginTop: 6, color: '#64748b', fontSize: '0.68rem',
            fontStyle: 'italic', lineHeight: 1.4 }}>
            {log.explanation}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OceanRiskPanel() {
  const [logs, setLogs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [lastScan, setLastScan]     = useState(null);
  const [form, setForm]             = useState({
    full_name: '', phone_number: '', location_name: '',
    lat: '', lon: '', activity_type: 'Surfing',
  });
  const [registering, setRegistering] = useState(false);
  const [result, setResult]           = useState(null);
  const [regError, setRegError]       = useState('');
  const [emergency, setEmergency]     = useState(null);
  const [emergencyLoading, setEmergencyLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${OCEAN_API}/logs`, { cache: 'no-store' });
      if (!res.ok) throw new Error('API unreachable');
      const data = await res.json();
      // Deduplicate: keep latest log per ocean_name
      const seen = new Set();
      const deduped = data.filter(l => {
        if (seen.has(l.ocean_name)) return false;
        seen.add(l.ocean_name); return true;
      });
      setLogs(deduped);
      setLastScan(new Date());
    } catch {
      // Ocean API offline — show placeholder
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const t = setInterval(fetchLogs, 20000); // match backend scan interval
    return () => clearInterval(t);
  }, [fetchLogs]);

  async function handleRegister(e) {
    e.preventDefault();
    setRegistering(true); setResult(null); setRegError('');
    try {
      const res = await fetch(`${OCEAN_API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          lat: parseFloat(form.lat) || 0,
          lon: parseFloat(form.lon) || 0,
        }),
      });
      if (!res.ok) throw new Error('Registration failed');
      setResult(await res.json());
    } catch (err) {
      setRegError(err.message);
    } finally {
      setRegistering(false);
    }
  }

  async function handleEmergency() {
    if (!window.confirm('Send emergency SMS to ALL registered users?')) return;
    setEmergencyLoading(true); setEmergency(null);
    try {
      const res = await fetch(`${OCEAN_API}/trigger-emergency`, { method: 'POST' });
      setEmergency(await res.json());
    } catch {
      setEmergency({ status: 'error' });
    } finally {
      setEmergencyLoading(false);
    }
  }

  const globalLogs  = logs.filter(l => l.ocean_name && !l.phone_number);
  const userLogs    = logs.filter(l => l.ocean_name && l.lat && !globalLogs.includes(l));

  return (
    <div className="ocean-panel" style={{ padding: '0 2px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: '1.2rem', fontWeight: 700 }}>
            Ocean Risk Intelligence
          </h2>
          <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
            LightGBM + NASA PODAAC + Open-Meteo Marine
            {lastScan && ` · Updated ${lastScan.toLocaleTimeString('en-IN')}`}
          </span>
        </div>
        <button
          onClick={fetchLogs}
          style={{
            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: 8, color: '#a5b4fc', cursor: 'pointer',
            fontSize: '0.8rem', padding: '5px 12px',
          }}>
          Refresh
        </button>
      </div>

      {/* Global Ocean Risk Cards */}
      <div style={{ marginBottom: 4, color: '#475569', fontSize: '0.7rem',
        fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
        Global Sensor Network
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', color: '#475569', padding: 40, fontSize: '0.85rem' }}>
          <div className="spinner" style={{ margin: '0 auto 10px' }} />
          Connecting to Ocean AI sensor network...
        </div>
      ) : logs.length === 0 ? (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 12, padding: '16px 20px', color: '#f87171', fontSize: '0.82rem',
        }}>
          Ocean API offline. Start with: <code style={{ background: 'rgba(0,0,0,0.3)',
            padding: '2px 6px', borderRadius: 4 }}>
            uvicorn main:app --port 8001
          </code> from the <code style={{ background: 'rgba(0,0,0,0.3)',
            padding: '2px 6px', borderRadius: 4 }}>backend/</code> folder.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12, marginBottom: 28 }}>
          {logs.map((log, i) => <OceanCard key={i} log={log} />)}
        </div>
      )}

      {/* Registration Form */}
      <div style={{
        background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 16, padding: '20px 24px', marginBottom: 20,
      }}>
        <h3 style={{ margin: '0 0 16px', color: '#c7d2fe', fontSize: '1rem', fontWeight: 600 }}>
          Register for SMS Alerts
        </h3>
        <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.78rem' }}>
          Register your maritime activity. You will receive an SMS alert if your location
          becomes dangerous within the next 30 minutes.
        </p>
        <form onSubmit={handleRegister} style={{ display: 'grid',
          gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { key: 'full_name',      label: 'Full Name',               type: 'text',   col: 1 },
            { key: 'phone_number',   label: 'Phone (+91...)',           type: 'tel',    col: 1 },
            { key: 'location_name',  label: 'Location / Beach Name',   type: 'text',   col: 2 },
            { key: 'lat',            label: 'Latitude',                 type: 'number', col: 1 },
            { key: 'lon',            label: 'Longitude',                type: 'number', col: 1 },
          ].map(f => (
            <div key={f.key} style={{ gridColumn: f.col === 2 ? '1 / -1' : 'auto' }}>
              <label style={{ display: 'block', color: '#94a3b8',
                fontSize: '0.72rem', marginBottom: 4, fontWeight: 500 }}>
                {f.label}
              </label>
              <input
                type={f.type}
                step={f.type === 'number' ? 'any' : undefined}
                required
                value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                style={{
                  width: '100%', padding: '8px 10px', boxSizing: 'border-box',
                  background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(99,102,241,0.25)',
                  borderRadius: 8, color: '#e2e8f0', fontSize: '0.82rem', outline: 'none',
                }}
              />
            </div>
          ))}

          {/* Activity dropdown */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', color: '#94a3b8',
              fontSize: '0.72rem', marginBottom: 4, fontWeight: 500 }}>
              Activity Type
            </label>
            <select
              value={form.activity_type}
              onChange={e => setForm(p => ({ ...p, activity_type: e.target.value }))}
              style={{
                width: '100%', padding: '8px 10px',
                background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: 8, color: '#e2e8f0', fontSize: '0.82rem', outline: 'none',
              }}>
              {ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <button
              type="submit"
              disabled={registering}
              style={{
                width: '100%', padding: '10px', borderRadius: 10,
                background: registering
                  ? 'rgba(99,102,241,0.3)'
                  : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                border: 'none', color: '#fff', fontWeight: 600,
                fontSize: '0.88rem', cursor: registering ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}>
              {registering ? 'Analyzing conditions...' : 'Register & Get Risk Assessment'}
            </button>
          </div>
          {regError && (
            <div style={{ gridColumn: '1 / -1', color: '#f87171', fontSize: '0.78rem' }}>
              {regError} — Is the Ocean API running on port 8001?
            </div>
          )}
        </form>

        {/* Registration Result */}
        {result && (() => {
          const { color, label, bg } = riskLabel(result.score);
          return (
            <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12,
              background: bg, border: `1px solid ${color}44` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <ScoreRing score={result.score} />
                <div>
                  <div style={{ color, fontWeight: 700, fontSize: '1.05rem' }}>
                    {label} — {result.score}/10
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 2 }}>
                    {result.activity} at {result.location}
                    {result.correction_made && (
                      <span style={{ marginLeft: 8, color: '#fbbf24' }}>
                        · Gemini corrected score
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {result.explanation && (
                <p style={{ margin: '10px 0 0', color: '#cbd5e1', fontSize: '0.78rem',
                  lineHeight: 1.6, fontStyle: 'italic' }}>
                  {result.explanation}
                </p>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {[
                  { k: 'Wave', v: `${result.wave_height}m` },
                  { k: 'Wind', v: `${result.wind_speed} km/h` },
                  { k: 'Water', v: `${result.water_temp}°C` },
                  { k: 'Current', v: `${result.ocean_current_velocity} m/s` },
                  { k: 'Visibility', v: `${result.visibility} km` },
                ].map(f => (
                  <span key={f.k} style={{
                    background: 'rgba(15,23,42,0.5)', borderRadius: 20,
                    padding: '3px 10px', fontSize: '0.7rem', color: '#94a3b8',
                  }}>
                    {f.k}: <strong style={{ color: '#e2e8f0' }}>{f.v}</strong>
                  </span>
                ))}
              </div>
              {result.data_sources?.length > 0 && (
                <div style={{ marginTop: 10, fontSize: '0.65rem', color: '#475569' }}>
                  Data: {result.data_sources.join(' · ')}
                </div>
              )}
              {result.score >= 8 && (
                <div style={{
                  marginTop: 12, padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
                  color: '#fca5a5', fontSize: '0.78rem', fontWeight: 600,
                }}>
                  DANGER — Avoid this area. An SMS alert has been sent to your number.
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Emergency Broadcast */}
      <div style={{
        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 14, padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#fca5a5', fontWeight: 600, fontSize: '0.9rem' }}>
              Emergency Broadcast
            </div>
            <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: 2 }}>
              Sends an immediate danger SMS to all currently registered users.
            </div>
          </div>
          <button
            onClick={handleEmergency}
            disabled={emergencyLoading}
            style={{
              padding: '8px 18px', borderRadius: 10, fontWeight: 700, fontSize: '0.82rem',
              border: '1px solid rgba(239,68,68,0.5)', cursor: emergencyLoading ? 'not-allowed' : 'pointer',
              background: emergencyLoading ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.2)',
              color: '#f87171', transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}>
            {emergencyLoading ? 'Sending...' : 'Trigger Emergency SMS'}
          </button>
        </div>
        {emergency && (
          <div style={{ marginTop: 12, color: '#94a3b8', fontSize: '0.78rem' }}>
            {emergency.status} — Alerts sent to: {(emergency.sms_sent_to || []).join(', ') || 'none'}
          </div>
        )}
      </div>
    </div>
  );
}
