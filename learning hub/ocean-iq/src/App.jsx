import { useState } from 'react';
import Hero from './components/Hero';
import NavTabs from './components/NavTabs';
import LearningHub from './components/LearningHub';
import SafetyGuidance from './components/SafetyGuidance';
import GovHelp from './components/GovHelp';

const isEmbedded = window.self !== window.top;

export default function App() {
  const [tab, setTab] = useState('hub');

  function handleTab(id) {
    setTab(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      {/* Back to main hub — only shown when not embedded */}
      {!isEmbedded && (
        <div style={{ position: 'fixed', top: 16, left: 20, zIndex: 100 }}>
          <a href="http://localhost:5173" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8,
            background: 'rgba(10,37,64,0.85)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem', fontWeight: 600,
            textDecoration: 'none', letterSpacing: 0.3,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color='#fff'}
          onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.8)'}>
            &#8592; Back to Hub
          </a>
        </div>
      )}
      <Hero />
      <NavTabs active={tab} onChange={handleTab} />
      {tab === 'hub'    && <LearningHub />}
      {tab === 'safety' && <SafetyGuidance />}
      {tab === 'gov'    && <GovHelp />}
      <div className="footer">
        <p>OceanIQ — Ocean Awareness Platform | Built for students, coastal communities &amp; general users</p>
        <p style={{ marginTop: 4 }}>In any emergency, call <strong>112</strong> immediately.</p>
      </div>
    </>
  );
}
