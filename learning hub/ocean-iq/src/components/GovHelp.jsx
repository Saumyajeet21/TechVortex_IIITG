import { govCards, helplines, apps, alertLevels } from '../data/govData';

export default function GovHelp() {
  return (
    <div className="section">
      <span className="section-label">Government & Help Links</span>
      <h2 className="section-title">Emergency Contacts & Official Resources</h2>
      <p className="section-sub">Connect to official Indian government agencies, emergency services, and ocean data platforms.</p>

      <div className="emergency-bar">
        <div className="em-icon">🚨</div>
        <div className="em-text">
          <h3>National Emergency Number</h3>
          <p>For any life-threatening emergency — fire, accident, medical, disaster — call immediately</p>
        </div>
        <div className="em-num">112</div>
      </div>

      <div className="gov-grid">
        {govCards.map(g => (
          <div key={g.logo} className="gov-card">
            <div className="gov-logo">{g.logo}</div>
            <div className="gov-full">{g.full}</div>
            <div className="gov-desc">{g.desc}</div>
            <a className="gov-btn" href={g.url} target="_blank" rel="noreferrer">Visit {g.logo} →</a>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--white)', border: '1px solid var(--card-border)', borderRadius: 16, padding: '1.6rem', marginBottom: '1.5rem' }}>
        <span className="section-label">Helplines</span>
        <h3 style={{ fontFamily: "'Syne',sans-serif", color: 'var(--ocean-deep)', marginBottom: '1rem', fontSize: '1.2rem' }}>Key Emergency Numbers</h3>
        <div className="helpline-grid">
          {helplines.map(h => (
            <div key={h.num} className="helpline-card">
              <div className="helpline-num" style={{ color: h.color, fontSize: h.small ? '1rem' : undefined }}>{h.num}</div>
              <div className="helpline-label">{h.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'linear-gradient(135deg,#eaf6fb,#d4efdf)', border: '1px solid rgba(23,165,137,0.3)', borderRadius: 16, padding: '1.6rem' }}>
        <span className="section-label">Quick Reference</span>
        <h3 style={{ fontFamily: "'Syne',sans-serif", color: 'var(--ocean-deep)', marginBottom: '1rem', fontSize: '1.2rem' }}>Colour-Coded Cyclone Alerts (IMD)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alertLevels.map(a => (
            <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: a.bg, borderRadius: 10, borderLeft: `4px solid ${a.color}` }}>
              <div style={{ fontWeight: 700, color: a.labelColor || a.color, width: 80 }}>{a.label}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-mid)' }}>{a.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
