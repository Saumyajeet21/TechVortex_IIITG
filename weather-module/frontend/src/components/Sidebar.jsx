import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

// ── SVG Icons (stroke-based, clean) ───────────────────────────────────────
function Ico({ d, d2, size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />{d2 && <path d={d2} />}
    </svg>
  );
}
const Icons = {
  home:     d => <Ico d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"
                   d2="M9 21V12h6v9" {...d} />,
  weather:  d => <Ico d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
                   d2="M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z" {...d} />,
  ocean:    d => <Ico d="M2 12c1.5 0 1.5-2 3-2s1.5 2 3 2 1.5-2 3-2 1.5 2 3 2 1.5-2 3-2M2 17c1.5 0 1.5-2 3-2s1.5 2 3 2 1.5-2 3-2 1.5 2 3 2 1.5-2 3-2" {...d} />,
  chat:     d => <Ico d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" {...d} />,
  book:     d => <Ico d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" d2="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" {...d} />,
  external: d => <Ico d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" {...d} />,
  globe:    d => <Ico d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"
                   d2="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" {...d} />,
  shield:   d => <Ico d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...d} />,
};

// ── Nav Items ──────────────────────────────────────────────────────────────
const NAV = [
  { id: 'home',        label: 'Dashboard',    Icon: Icons.home    },
  { id: 'weather',    label: 'AtmoSense',    Icon: Icons.weather },
  { id: 'chatbot',    label: 'ClimateBot',   Icon: Icons.chat    },
  { id: 'ocean',      label: 'Ocean Risk ML', Icon: Icons.ocean  },
  { id: 'oceanguard', label: 'OceanGuard',   Icon: Icons.shield  },
  { id: 'learning',  label: 'OceanIQ',      Icon: Icons.book    },
];

// ── Nav Item Component ─────────────────────────────────────────────────────
function NavItem({ item, active, onClick }) {
  const [hov, setHov] = useState(false);
  const isActive = active === item.id;

  return (
    <button
      onClick={() => onClick(item)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '8px 12px', borderRadius: 7,
        border: 'none', cursor: 'pointer', textAlign: 'left',
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
        fontSize: '0.83rem', fontWeight: isActive ? 600 : 500,
        letterSpacing: 0.1,
        color: isActive ? '#60a5fa' : hov ? '#e2e8f0' : '#94a3b8',
        background: isActive ? 'rgba(96,165,250,0.12)' : hov ? 'rgba(255,255,255,0.06)' : 'transparent',
        transition: 'all 0.15s ease',
      }}
    >
      <item.Icon size={15} color={isActive ? '#60a5fa' : hov ? '#e2e8f0' : '#4b5563'} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.external && (
        <Icons.external size={12} color={isActive ? '#60a5fa' : '#4b5563'} />
      )}
    </button>
  );
}

// ── Sidebar Component ──────────────────────────────────────────────────────
export default function Sidebar({ currentPage, onNavigate, user, onLogout }) {
  async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.removeItem('climateiq_user');
    if (onLogout) onLogout();
  }
  return (
    <aside style={{
      width: 216, flexShrink: 0,
      background: '#000000',
      borderRight: '1px solid #1a1a1a',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      position: 'sticky', top: 0, height: '100vh',
      overflow: 'hidden',
    }}>
      {/* Logo / Product Name */}
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: '#1d4ed8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icons.globe size={15} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>
              TechVortex
            </div>
            <div style={{ fontSize: '0.62rem', color: '#4b5563', fontWeight: 500 }}>
              IIITG · Climate AI
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 600, color: '#3d3d3d',
          letterSpacing: 1.2, textTransform: 'uppercase', padding: '4px 12px 8px' }}>
          Modules
        </div>
        {NAV.map(item => (
          <NavItem key={item.id} item={item} active={currentPage} onClick={onNavigate} />
        ))}
      </nav>

      {/* Status footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #1a1a1a',
      }}>
        {/* Logged-in user */}
        {user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 10, paddingBottom: 10,
            borderBottom: '1px solid #1a1a1a',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(37,99,235,0.18)',
              border: '1px solid rgba(37,99,235,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              fontSize: '0.7rem', fontWeight: 700, color: '#60a5fa',
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user.name}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#4b5563', marginTop: 1,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email || user.phone || ''}
              </div>
            </div>
            {/* Logout button */}
            <button onClick={handleLogout} title="Sign out"
              style={{
                marginLeft: 'auto', flexShrink: 0,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px', borderRadius: 5,
                color: '#4b5563', fontSize: '0.65rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
              onMouseLeave={e => e.currentTarget.style.color = '#4b5563'}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}

        {/* System status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#16a34a',
          }} />
          <span style={{ fontSize: '0.65rem', color: '#374151', fontWeight: 500 }}>
            All systems operational
          </span>
        </div>
        <div style={{ fontSize: '0.58rem', color: '#1f2937', marginTop: 3 }}>
          6 services · :5173 :8000 :8001 :3003 :5000
        </div>
      </div>
    </aside>
  );
}
