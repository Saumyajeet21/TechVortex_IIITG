import React, { useState, useEffect } from 'react';
import LoginPage        from './components/LoginPage';
import Sidebar          from './components/Sidebar';
import LandingPage      from './components/LandingPage';
import WeatherDashboard from './components/WeatherDashboard';
import ChatbotPanel     from './components/ChatbotPanel';
import OceanGuardPanel  from './components/OceanGuardPanel';

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

  // Check localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('climateiq_user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  function handleLogin(userData) { setUser(userData); }

  function handleNavigate(item) { setPage(item.id || item); }

  function handleCardNavigate(id) { setPage(id); }

  // ── Show login until user info is set ─────────────────────────────────────
  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      background: '#0d1117',
    }}>
      {/* Persistent Sidebar */}
      <Sidebar currentPage={page} onNavigate={handleNavigate} user={user} />

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        {page === 'home'       && <LandingPage onNavigate={handleCardNavigate} />}
        {page === 'weather'    && <WeatherDashboard onBack={() => setPage('home')} />}
        {page === 'chatbot'    && <ChatbotPanel     onBack={() => setPage('home')} />}
        {page === 'ocean'      && <EmbedView url="http://localhost:3000" />}
        {page === 'oceanguard' && <OceanGuardPanel />}
        {page === 'learning'   && <EmbedView url="http://localhost:3001" />}
      </main>
    </div>
  );
}
