import { useState } from 'react';
import { supabase } from '../supabaseClient';

// ── Icons ──────────────────────────────────────────────────────────────────
function GlobeIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke="#475569" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke="#475569" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
function EyeIcon({ show }) {
  return show ? (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke="#475569" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke="#475569" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────
const inputBase = {
  width: '100%', padding: '11px 14px 11px 40px',
  borderRadius: 9, outline: 'none', boxSizing: 'border-box',
  fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
  fontSize: '0.9rem', fontWeight: 400,
  background: '#0d1117', color: '#e2e8f0',
  transition: 'border-color 0.18s',
};

function Field({ label, icon, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', color: '#94a3b8',
        fontSize: '0.78rem', fontWeight: 600, marginBottom: 7, letterSpacing: 0.2,
      }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>
          {icon}
        </div>
        {children}
      </div>
      {error && <p style={{ color: '#f87171', fontSize: '0.72rem', marginTop: 5 }}>{error}</p>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function LoginPage({ onLogin }) {
  // 'signin' | 'signup' | 'forgot'
  const [mode,       setMode]       = useState('signin');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [name,       setName]       = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [errors,     setErrors]     = useState({});
  const [message,    setMessage]    = useState(null);   // { type: 'success'|'error', text }
  const [focus,      setFocus]      = useState('');

  function resetState() {
    setEmail(''); setPassword(''); setName('');
    setErrors({}); setMessage(null); setLoading(false);
  }
  function switchMode(m) { resetState(); setMode(m); }

  // ── Validation ─────────────────────────────────────────────────────────
  function validate() {
    const e = {};
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Enter a valid email address';
    if (mode !== 'forgot') {
      if (!password || password.length < 6)
        e.password = 'Password must be at least 6 characters';
    }
    if (mode === 'signup' && (!name.trim() || name.trim().length < 2))
      e.name = 'Enter your full name';
    return e;
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  async function handleSubmit(ev) {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setMessage(null);
    setErrors({});

    try {
      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const user = {
          name: data.user.user_metadata?.name || email.split('@')[0],
          email: data.user.email,
          id: data.user.id,
        };
        localStorage.setItem('climateiq_user', JSON.stringify(user));
        onLogin(user);

      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name.trim() } },
        });
        if (error) throw error;
        // Auto sign-in if email confirmation not required
        if (data.session) {
          const user = { name: name.trim(), email, id: data.user.id };
          localStorage.setItem('climateiq_user', JSON.stringify(user));
          onLogin(user);
        } else {
          setMessage({
            type: 'success',
            text: 'Account created! Check your email to confirm, then sign in.',
          });
          switchMode('signin');
        }

      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage({
          type: 'success',
          text: `Password reset link sent to ${email}. Check your inbox.`,
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  }

  const borderFor = (field) =>
    errors[field]
      ? '1.5px solid rgba(248,113,113,0.5)'
      : focus === field
      ? '1.5px solid rgba(37,99,235,0.6)'
      : '1.5px solid #1f2937';

  return (
    <div style={{
      minHeight: '100vh', background: '#000',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
    }}>

      {/* ── Header ── */}
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

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
        <div style={{ width: '100%', maxWidth: 420, animation: 'loginFade 0.4s ease both' }}>

          {/* Title block */}
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 20, marginBottom: 18,
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ color: '#86efac', fontSize: '0.65rem', fontWeight: 600, letterSpacing: 0.8 }}>
                ALL SYSTEMS OPERATIONAL
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              {mode === 'signin' && 'Welcome Back'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot' && 'Reset Password'}
            </h1>
            <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.6 }}>
              {mode === 'signin' && 'Sign in to access the AI climate intelligence platform.'}
              {mode === 'signup' && 'Join TechVortex IIITG to monitor ocean and climate data.'}
              {mode === 'forgot' && "Enter your email and we'll send a reset link."}
            </p>
          </div>

          {/* ── Tab switcher (signin / signup) ── */}
          {mode !== 'forgot' && (
            <div style={{
              display: 'flex', background: '#111827',
              borderRadius: 10, padding: 4, marginBottom: 20,
              border: '1px solid #1f2937',
            }}>
              {[['signin', 'Sign In'], ['signup', 'Sign Up']].map(([m, label]) => (
                <button key={m} onClick={() => switchMode(m)}
                  style={{
                    flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer',
                    borderRadius: 7, fontWeight: 600, fontSize: '0.82rem',
                    fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
                    transition: 'all 0.18s',
                    background: mode === m ? '#2563eb' : 'transparent',
                    color: mode === m ? '#fff' : '#475569',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* ── Global message banner ── */}
          {message && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              fontSize: '0.82rem', fontWeight: 500,
              background: message.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(248,113,113,0.08)',
              border: `1px solid ${message.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(248,113,113,0.3)'}`,
              color: message.type === 'success' ? '#86efac' : '#fca5a5',
            }}>
              {message.text}
            </div>
          )}

          {/* ── Form card ── */}
          <form onSubmit={handleSubmit} style={{
            background: '#111827', border: '1px solid #1f2937',
            borderRadius: 14, padding: '24px 24px 20px',
          }}>

            {/* Name — signup only */}
            {mode === 'signup' && (
              <Field label="Full Name" icon={<UserIcon />} error={errors.name}>
                <input id="signup-name" type="text" value={name} placeholder="e.g. Rahul Sharma"
                  autoComplete="name"
                  onChange={e => { setName(e.target.value); setErrors(v => ({ ...v, name: '' })); }}
                  onFocus={() => setFocus('name')} onBlur={() => setFocus('')}
                  style={{ ...inputBase, border: borderFor('name') }} />
              </Field>
            )}

            {/* Email */}
            <Field label="Email Address" icon={<MailIcon />} error={errors.email}>
              <input id="auth-email" type="email" value={email} placeholder="you@example.com"
                autoComplete="email"
                onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: '' })); }}
                onFocus={() => setFocus('email')} onBlur={() => setFocus('')}
                style={{ ...inputBase, border: borderFor('email') }} />
            </Field>

            {/* Password — not on forgot */}
            {mode !== 'forgot' && (
              <Field label="Password" icon={<LockIcon />} error={errors.password}>
                <input id="auth-password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: '' })); }}
                  onFocus={() => setFocus('password')} onBlur={() => setFocus('')}
                  style={{ ...inputBase, paddingRight: 42, border: borderFor('password') }} />
                {/* Show/hide password toggle */}
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}>
                  <EyeIcon show={showPwd} />
                </button>
              </Field>
            )}

            {/* Forgot password link */}
            {mode === 'signin' && (
              <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 18 }}>
                <button type="button" onClick={() => switchMode('forgot')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: '#3b82f6', fontSize: '0.76rem', fontWeight: 500,
                    fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
                  }}>
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit button */}
            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '11px 0', marginTop: mode === 'forgot' ? 8 : 0,
                borderRadius: 9, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#1e3a8a' : '#2563eb',
                color: '#fff', fontWeight: 600, fontSize: '0.88rem',
                fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
                transition: 'background 0.18s', letterSpacing: 0.2,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              {loading
                ? 'Please wait...'
                : mode === 'signin' ? 'Sign In'
                : mode === 'signup' ? 'Create Account'
                : 'Send Reset Link'}
            </button>

            {/* Back to sign in — from forgot */}
            {mode === 'forgot' && (
              <p style={{ textAlign: 'center', marginTop: 16, marginBottom: 0 }}>
                <button type="button" onClick={() => switchMode('signin')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#3b82f6', fontSize: '0.78rem', fontWeight: 500,
                    fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
                  }}>
                  ← Back to Sign In
                </button>
              </p>
            )}
          </form>

          {/* Platform badges */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 22 }}>
            {['AtmoSense', 'OceanGuard', 'ClimateBot', 'OceanIQ'].map(t => (
              <span key={t} style={{
                padding: '3px 10px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 500,
                background: 'rgba(255,255,255,0.03)', border: '1px solid #1f2937', color: '#334155',
              }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{ padding: '12px 32px', borderTop: '1px solid #111', display: 'flex', justifyContent: 'center' }}>
        <span style={{ color: '#1f2937', fontSize: '0.65rem' }}>
          TechVortex IIITG 2026 · Climate Intelligence Platform
        </span>
      </footer>

      <style>{`
        @keyframes loginFade {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        button:hover:not(:disabled) { opacity: 0.9; }
      `}</style>
    </div>
  );
}
