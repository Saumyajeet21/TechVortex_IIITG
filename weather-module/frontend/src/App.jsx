import React, { useState, useEffect } from 'react';
import LoginPage        from './components/LoginPage';
import Sidebar          from './components/Sidebar';
import LandingPage      from './components/LandingPage';
import WeatherDashboard from './components/WeatherDashboard';
import ChatbotPanel     from './components/ChatbotPanel';
import { supabase }     from './supabaseClient';

// Embedded iframe view for external apps
function EmbedView({ url }) {
  return (
    <iframe
      src={url}
      title="Embedded App"
      style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
      allow="geolocation"
    />
  );
}

export default function App() {
  const [page, setPage]   = useState('home');
  const [user, setUser]   = useState(null);

  // Restore session from Supabase on mount
  useEffect(() => {
    // Check active Supabase session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = {
          name:  session.user.user_metadata?.name || session.user.email.split('@')[0],
          email: session.user.email,
          id:    session.user.id,
        };
        setUser(u);
        localStorage.setItem('climateiq_user', JSON.stringify(u));
      } else {
        // Fall back to localStorage (legacy / offline)
        const stored = localStorage.getItem('climateiq_user');
        if (stored) setUser(JSON.parse(stored));
      }
    });

    // Listen for auth state changes (logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        localStorage.removeItem('climateiq_user');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  function handleLogin(userData)   { setUser(userData); }
  function handleLogout()          { setUser(null); setPage('home'); }
  function handleNavigate(item)    { setPage(item.id || item); }
  function handleCardNavigate(id)  { setPage(id); }

  // ── Show login until user info is set ─────────────────────────────────────
  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      background: '#0d1117',
    }}>
      {/* Persistent Sidebar */}
      <Sidebar currentPage={page} onNavigate={handleNavigate} user={user} onLogout={handleLogout} />

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        {page === 'home'       && <LandingPage onNavigate={handleCardNavigate} />}
        {page === 'weather'    && <WeatherDashboard onBack={() => setPage('home')} />}
        {page === 'chatbot'    && <ChatbotPanel     onBack={() => setPage('home')} />}
        {page === 'ocean'      && <EmbedView url="http://localhost:3003" />}
        {page === 'oceanguard' && <EmbedView url="http://localhost:3002" />}
        {page === 'learning'   && <EmbedView url="http://localhost:3001" />}
      </main>
    </div>
  );
}
