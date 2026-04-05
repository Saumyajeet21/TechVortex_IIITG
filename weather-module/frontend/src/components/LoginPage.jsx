import { useState } from 'react';

// ── SVG Icons ──────────────────────────────────────────────────────────────
function GlobeIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke="#475569" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke="#475569" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.61 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 3.12 4.18 2 2 0 0 1 5.09 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 23 17z" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

export default function LoginPage({ onLogin }) {
  const [name,   setName]   = useState('');
  const [phone,  setPhone]  = useState('');
  const [errors, setErrors] = useState({});
  const [focus,  setFocus]  = useState('');

  function validate() {
    const e = {};
    if (!name.trim() || name.trim().length < 2) e.name  = 'Enter your full name';
    if (!/^\+?[\d\s\-]{7,15}$/.test(phone.trim()))  e.phone = 'Enter a valid phone number';
    return e;
  }

  function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const user = { name: name.trim(), phone: phone.trim() };
    localStorage.setItem('climateiq_user', JSON.stringify(user));
    onLogin(user);
  }

  const inputBase = {
    width: '100%', padding: '11px 14px 11px 40px',
    borderRadius: 9, outline: 'none',
    fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
    fontSize: '0.9rem', fontWeight: 400,
    background: '#0d1117',
    color: '#e2e8f0',
    transition: 'border-color 0.18s',
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#000',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
    }}>

      {/* Header bar */}
      <header style={{
        padding: '0 32px', height: 56,
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, background: '#1d4ed8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <GlobeIcon />
          </div>
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.9rem' }}>
            TechVortex IIITG
          </span>
        </div>
      </header>

      {/* Main */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 16px',
      }}>
        <div style={{
          width: '100%', maxWidth: 400,
          animation: 'loginFade 0.4s ease both',
        }}>
          {/* Title block */}
          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            {/* Live badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 20, marginBottom: 20,
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.18)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ color: '#86efac', fontSize: '0.65rem', fontWeight: 600, letterSpacing: 0.8 }}>
                ALL SYSTEMS OPERATIONAL
              </span>
            </div>

            <h1 style={{
              fontSize: '1.75rem', fontWeight: 700, color: '#f1f5f9',
              margin: '0 0 8px', letterSpacing: '-0.5px',
            }}>
              Welcome to ClimateIQ
            </h1>
            <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.6 }}>
              Enter your details to access the AI climate intelligence platform.
            </p>
          </div>

          {/* Card */}
          <form onSubmit={handleSubmit} style={{
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: 14,
            padding: '28px 28px 24px',
          }}>

            {/* Name */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'block', color: '#94a3b8',
                fontSize: '0.78rem', fontWeight: 600, marginBottom: 7,
                letterSpacing: 0.2,
              }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}>
                  <UserIcon />
                </div>
                <input
                  id="login-name"
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setErrors(v => ({ ...v, name: '' })); }}
                  onFocus={() => setFocus('name')}
                  onBlur={() => setFocus('')}
                  placeholder="e.g. Rahul Sharma"
                  autoComplete="name"
                  style={{
                    ...inputBase,
                    border: errors.name
                      ? '1.5px solid rgba(248,113,113,0.5)'
                      : focus === 'name'
                      ? '1.5px solid rgba(37,99,235,0.6)'
                      : '1.5px solid #1f2937',
                  }}
                />
              </div>
              {errors.name && (
                <p style={{ color: '#f87171', fontSize: '0.72rem', marginTop: 5 }}>{errors.name}</p>
              )}
            </div>

            {/* Phone */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block', color: '#94a3b8',
                fontSize: '0.78rem', fontWeight: 600, marginBottom: 7,
                letterSpacing: 0.2,
              }}>
                Phone Number
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}>
                  <PhoneIcon />
                </div>
                <input
                  id="login-phone"
                  type="tel"
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setErrors(v => ({ ...v, phone: '' })); }}
                  onFocus={() => setFocus('phone')}
                  onBlur={() => setFocus('')}
                  placeholder="e.g. +91 98765 43210"
                  autoComplete="tel"
                  style={{
                    ...inputBase,
                    border: errors.phone
                      ? '1.5px solid rgba(248,113,113,0.5)'
                      : focus === 'phone'
                      ? '1.5px solid rgba(37,99,235,0.6)'
                      : '1.5px solid #1f2937',
                  }}
                />
              </div>
              {errors.phone && (
                <p style={{ color: '#f87171', fontSize: '0.72rem', marginTop: 5 }}>{errors.phone}</p>
              )}
            </div>

            {/* Submit */}
            <LoginButton />

            <p style={{
              color: '#1f2937', fontSize: '0.7rem', textAlign: 'center', marginTop: 16,
            }}>
              Your details are stored locally and not shared.
            </p>
          </form>

          {/* Platform badges */}
          <div style={{
            display: 'flex', gap: 8, justifyContent: 'center',
            flexWrap: 'wrap', marginTop: 24,
          }}>
            {['AtmoSense', 'Ocean Risk ML', 'ClimateBot', 'OceanIQ'].map(t => (
              <span key={t} style={{
                padding: '3px 10px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 500,
                background: 'rgba(255,255,255,0.03)', border: '1px solid #1f2937',
                color: '#334155',
              }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        padding: '12px 32px', borderTop: '1px solid #111',
        display: 'flex', justifyContent: 'center',
      }}>
        <span style={{ color: '#1f2937', fontSize: '0.65rem' }}>
          TechVortex IIITG 2026 · Climate Intelligence Platform
        </span>
      </footer>

      <style>{`
        @keyframes loginFade {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// Separate component to use hover state
function LoginButton() {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="submit"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', padding: '11px 0',
        borderRadius: 9, border: 'none', cursor: 'pointer',
        background: hov ? '#1d4ed8' : '#2563eb',
        color: '#fff', fontWeight: 600,
        fontSize: '0.88rem',
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'background 0.18s',
        letterSpacing: 0.2,
      }}
    >
      Enter Platform
      <ArrowIcon />
    </button>
  );
}
