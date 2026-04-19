import React, { useState, useEffect } from 'react';

// ── Inject keyframes once ─────────────────────────────────────────────────
const CSS = `
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes cardIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
`;

// ── SVG Icon Library (outline, 20×20 viewBox) ──────────────────────────────
function Icon({ d, d2, size = 22, color = 'currentColor', strokeWidth = 1.5 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      {d2 && <path d={d2} />}
    </svg>
  );
}

// Individual icons
const WeatherIcon  = ({ size, color }) => <Icon size={size} color={color}
  d="M12 3v1m0 16v1M4.22 4.22l.71.71m12.73 12.73.71.71M3 12h1m16 0h1M4.93 19.07l.71-.71M18.36 5.64l.71-.71"
  d2="M12 7a5 5 0 1 1 0 10A5 5 0 0 1 12 7z" />;

const OceanIcon    = ({ size, color }) => <Icon size={size} color={color}
  d="M2 12c1.5 0 1.5-2 3-2s1.5 2 3 2 1.5-2 3-2 1.5 2 3 2 1.5-2 3-2M2 17c1.5 0 1.5-2 3-2s1.5 2 3 2 1.5-2 3-2 1.5 2 3 2 1.5-2 3-2M2 7c1.5 0 1.5-2 3-2s1.5 2 3 2 1.5-2 3-2 1.5 2 3 2 1.5-2 3-2" />;

const ChatIcon     = ({ size, color }) => <Icon size={size} color={color}
  d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />;

const BookIcon     = ({ size, color }) => <Icon size={size} color={color}
  d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
  d2="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />;

const GlobeIcon    = ({ size, color }) => <Icon size={size} color={color}
  d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"
  d2="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />;

const ArrowIcon    = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const SparkleIcon  = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
    <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
  </svg>
);

// ── Feature Definitions ────────────────────────────────────────────────────
const FEATURES = [
  {
    id: 'weather',
    Icon: WeatherIcon,
    title: 'AtmoSense',
    subtitle: 'Neural Network Weather Forecast',
    desc: '72-hour AI temperature prediction with real-time bias correction, AQI monitoring, and Gemini AI-generated narrative summaries.',
    stats: [['Model', 'MLP Neural Net'], ['Accuracy', '~2.1°C MAE'], ['Horizon', '72 hrs']],
    accent: '#3b82f6',
    glow: 'rgba(59,130,246,0.18)',
    border: 'rgba(59,130,246,0.28)',
    cta: 'Open AtmoSense',
    delay: 0,
  },
  {
    id: 'ocean',
    Icon: OceanIcon,
    title: 'OceanGuard',
    subtitle: 'Maritime Risk Intelligence',
    desc: 'Real-time ocean risk scoring with LightGBM + physics blending. NASA PODAAC satellite SST, Open-Meteo Marine API, and Twilio SMS alerts.',
    stats: [['Model', 'LightGBM'], ['Coverage', '7 Oceans'], ['Score', '1–10 Risk']],
    accent: '#06b6d4',
    glow: 'rgba(6,182,212,0.18)',
    border: 'rgba(6,182,212,0.28)',
    cta: 'Open OceanGuard',
    badge: ':3003',
    delay: 80,
  },
  {
    id: 'chatbot',
    Icon: ChatIcon,
    title: 'ClimateBot',
    subtitle: 'AI Research Assistant · Llama 3.3 70B',
    desc: 'Specialist AI for ocean science, marine biology, weather systems, and climate research powered by Llama 3.3 70B via Groq with live weather context.',
    stats: [['Model', 'Llama 3.3 70B'], ['API', 'Groq'], ['Domain', 'Climate']],
    accent: '#10b981',
    glow: 'rgba(16,185,129,0.18)',
    border: 'rgba(16,185,129,0.28)',
    cta: 'Open ClimateBot',
    delay: 160,
  },
  {
    id: 'learning',
    Icon: BookIcon,
    title: 'OceanIQ',
    subtitle: 'Interactive Learning Hub',
    desc: 'Structured learning platform covering ocean dynamics, marine safety, government resources, and climate science with an AI-powered assistant.',
    stats: [['Modules', 'Learn + Safety'], ['Gov Help', 'India Contacts'], ['AI', 'Llama 3.3 70B']],
    accent: '#f59e0b',
    glow: 'rgba(245,158,11,0.18)',
    border: 'rgba(245,158,11,0.28)',
    cta: 'Open OceanIQ',
    badge: ':3001',
    delay: 240,
  },
];

// ── Stat Pill ──────────────────────────────────────────────────────────────
function StatPill({ label, value, accent }) {
  return (
    <div style={{
      flex: 1, padding: '10px 8px', borderRadius: 10, textAlign: 'center',
      background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.055)',
    }}>
      <div style={{ color: accent, fontWeight: 700, fontSize: '0.78rem', lineHeight: 1.2 }}>{value}</div>
      <div style={{ color: '#475569', fontSize: '0.6rem', marginTop: 3, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

// ── Live Dashboard ──────────────────────────────────────────────────────────
function LiveDashboard() {
  const [oceanData, setOceanData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8001/logs')
      .then(r => r.json())
      .then(d => Array.isArray(d) && setOceanData(d))
      .catch(() => {});
  }, []);

  const topRisk    = oceanData ? Math.max(...oceanData.map(l => l.score || 0)).toFixed(1) : '—';
  const sensors    = oceanData ? new Set(oceanData.map(l => l.ocean_name)).size : '—';
  const dangerous  = oceanData ? oceanData.filter(l => l.score >= 7).length : '—';

  const METRICS = [
    { label: 'AI Models Active',    value: '3',          sub: 'MLP · LightGBM · Llama',  color: '#3b82f6' },
    { label: 'Oceans Monitored',    value: String(sensors), sub: 'Global coverage',       color: '#06b6d4' },
    { label: 'Highest Risk Score',  value: topRisk !== '—' ? `${topRisk}/10` : '—',
      sub: topRisk >= 7 ? 'DANGER ZONES ACTIVE' : 'All zones nominal',                    color: topRisk >= 7 ? '#f87171' : '#10b981' },
    { label: 'Data Sources',        value: '5+',         sub: 'NASA · Open-Meteo · Groq', color: '#8b5cf6' },
    { label: 'High Risk Zones',     value: String(dangerous), sub: 'Score ≥ 7.0',         color: '#f59e0b' },
    { label: 'Alerts System',       value: 'LIVE',       sub: 'Twilio SMS · Supabase',    color: '#10b981' },
  ];

  return (
    <section style={{
      maxWidth: 920, margin: '0 auto 40px', padding: '0 0 8px',
      animation: 'fadeUp 0.7s ease 0.2s both',
    }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600,
          letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Platform Dashboard
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
      </div>

      {/* Metrics grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12,
      }}>
        {METRICS.map(({ label, value, sub, color }) => (
          <div key={label} style={{
            padding: '16px 12px', borderRadius: 14, textAlign: 'center',
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(8px)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor=`${color}44`; e.currentTarget.style.boxShadow=`0 0 20px ${color}18`; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow='none'; }}>
            <div style={{
              fontSize: '1.7rem', fontWeight: 800, color,
              letterSpacing: '-0.5px', lineHeight: 1,
            }}>{value}</div>
            <div style={{ color: '#cbd5e1', fontSize: '0.72rem', fontWeight: 600,
              marginTop: 8, letterSpacing: 0.2 }}>{label}</div>
            <div style={{ color: '#475569', fontSize: '0.64rem', marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Feature Card ───────────────────────────────────────────────────────────
function FeatureCard({ feature, onNavigate }) {
  const [hov, setHov] = useState(false);
  const { Icon: Ico, title, subtitle, desc, stats, accent, glow, border, cta, badge, disabled, delay } = feature;

  return (
    <div
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => !disabled && onNavigate(feature.id)}
      style={{
        borderRadius: 16, padding: '28px',
        background: hov ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.022)',
        border: `1px solid ${hov ? border : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hov ? `0 0 40px ${glow}, 0 16px 40px rgba(0,0,0,0.5)` : '0 2px 16px rgba(0,0,0,0.3)',
        transform: hov ? 'translateY(-4px) scale(1.01)' : 'none',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex', flexDirection: 'column', gap: 20,
        backdropFilter: 'blur(16px)',
        animation: `cardIn 0.5s ease both`,
        animationDelay: `${delay}ms`,
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Top glow strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: hov ? `linear-gradient(90deg, transparent, ${accent}66, transparent)` : 'transparent',
        transition: 'background 0.3s ease',
      }} />

      {/* Icon + Title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: `linear-gradient(135deg, ${accent}22, ${accent}0a)`,
          border: `1px solid ${accent}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: hov ? `0 0 18px ${accent}44` : 'none',
          transition: 'box-shadow 0.25s ease',
        }}>
          <Ico size={22} color={accent} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1rem', lineHeight: 1.3 }}>{title}</span>
            {badge && (
              <span style={{
                fontSize: '0.58rem', fontWeight: 600, padding: '2px 7px',
                borderRadius: 8, background: `${accent}18`,
                border: `1px solid ${accent}30`, color: accent,
                letterSpacing: 0.3,
              }}>localhost{badge}</span>
            )}
            {disabled && (
              <span style={{
                fontSize: '0.58rem', fontWeight: 600, padding: '2px 7px',
                borderRadius: 8, background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b',
              }}>Soon</span>
            )}
          </div>
          <div style={{ color: accent, fontSize: '0.68rem', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
            {subtitle}
          </div>
        </div>
      </div>

      {/* Description */}
      <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7, fontWeight: 400 }}>
        {desc}
      </p>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8 }}>
        {stats.map(([label, value]) => (
          <StatPill key={label} label={label} value={value} accent={accent} />
        ))}
      </div>

      {/* CTA */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span style={{
          color: hov && !disabled ? accent : '#334155',
          fontSize: '0.78rem', fontWeight: 600,
          transition: 'color 0.2s ease',
        }}>{cta}</span>
        <div style={{
          opacity: hov && !disabled ? 1 : 0,
          transform: hov && !disabled ? 'translateX(0)' : 'translateX(-6px)',
          transition: 'all 0.22s ease',
          color: accent,
        }}>
          <ArrowIcon size={16} color={accent} />
        </div>
      </div>
    </div>
  );
}

// ── Main Landing Page ──────────────────────────────────────────────────────
export default function LandingPage({ onNavigate }) {
  // Inject keyframes
  useEffect(() => {
    const el = document.createElement('style');
    el.setAttribute('data-lp', '1');
    el.textContent = CSS;
    if (!document.head.querySelector('[data-lp]')) document.head.appendChild(el);
    return () => el.remove();
  }, []);

  return (
    <div style={{
      minHeight: '100vh', background: '#0d1117', color: '#f1f5f9',
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Content ── */}
      <main style={{ flex: 1, position: 'relative', zIndex: 1, padding: '0 24px' }}>

        {/* ── Hero ── */}
        <section style={{
          maxWidth: 820, margin: '0 auto', textAlign: 'center',
          padding: '48px 0 40px',
          animation: 'fadeUp 0.5s ease both',
        }}>
          {/* Status badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20, marginBottom: 20,
            background: 'rgba(37,99,235,0.08)',
            border: '1px solid rgba(37,99,235,0.18)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ color: '#60a5fa', fontSize: '0.68rem', fontWeight: 600, letterSpacing: 0.6 }}>
              3 AI MODELS &nbsp;&middot;&nbsp; REAL-TIME DATA &nbsp;&middot;&nbsp; LIVE ALERTS
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            margin: '0 0 16px', fontWeight: 700, lineHeight: 1.12,
            fontSize: 'clamp(2.4rem, 5vw, 3.5rem)', letterSpacing: '-1.5px',
            color: '#f1f5f9',
          }}>
            Climate Intelligence<br />
            <span style={{
              background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Powered by AI
            </span>
          </h1>

          <p style={{
            color: '#64748b', fontSize: '1.08rem', lineHeight: 1.72,
            margin: '0 auto 32px', maxWidth: 520, fontWeight: 400,
          }}>
            A unified platform combining neural weather forecasting, ocean risk scoring,
            and AI-powered climate research — in real time.
          </p>

          {/* Tech tags */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['LightGBM', 'MLP Neural Net', 'Llama 3.3 70B', 'NASA PODAAC', 'Groq', 'Twilio'].map(t => (
              <span key={t} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 500,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                color: '#475569',
              }}>{t}</span>
            ))}
          </div>
        </section>

        {/* ── Live Dashboard Metrics ── */}
        <LiveDashboard />
      </main>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '16px 32px',
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: 8,
      }}>
        <span style={{ color: '#1e293b', fontSize: '0.68rem', fontWeight: 500 }}>
          TechVortex IIITG 2026 &middot; Climate &amp; Ocean Intelligence
        </span>
        <div style={{ display: 'flex', gap: 16 }}>
          {[['Hub',':5173'],['Weather',':8000'],['Ocean AI',':8001'],['SurfSafe',':3003'],['Chatbot',':5000'],['OceanIQ',':3001']].map(([n,p]) => (
            <span key={n} style={{ color: '#1e293b', fontSize: '0.65rem' }}>{n}<span style={{ color: '#0f172a' }}>{p}</span></span>
          ))}
        </div>
      </footer>
    </div>
  );
}
