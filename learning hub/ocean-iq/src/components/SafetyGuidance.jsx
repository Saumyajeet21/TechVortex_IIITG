import { useState } from 'react';
import Chatbot from './Chatbot';
import { safetyCards, safetyDetails } from '../data/safetyData';

export default function SafetyGuidance() {
  const [selected, setSelected] = useState(null);

  function handleCard(id) {
    setSelected(prev => prev === id ? null : id);
  }

  const detail = selected ? safetyDetails[selected] : null;

  return (
    <div className="section">
      <span className="section-label">Safety Guidance</span>
      <h2 className="section-title">Stay Safe in Coastal Conditions</h2>
      <p className="section-sub">Practical, real-world guidance for coastal hazards — click a situation to expand detailed advice.</p>

      <div className="safety-grid">
        {safetyCards.map(c => (
          <div key={c.id} className={`safety-card ${c.cls}${selected === c.id ? ' sel' : ''}`} onClick={() => handleCard(c.id)}>
            <div className="s-icon">{c.icon}</div>
            <div className="s-title">{c.title}</div>
            <div className="s-tag">{c.tag}</div>
          </div>
        ))}
      </div>

      {detail && (
        <div className="safety-detail">
          <h2 style={{ fontFamily: "'Syne',sans-serif", color: detail.titleColor, marginBottom: '0.5rem' }}>{detail.title}</h2>
          <span className={`risk-badge ${detail.badgeCls}`}>{detail.badge}</span>
          <h4>What {detail.badgeCls === 'risk-low' ? 'to Know' : 'is the Danger?'}</h4>
          <p style={{ color: 'var(--text-mid)', lineHeight: 1.8, marginBottom: '1rem' }}>{detail.intro}</p>
          <h4 style={{ marginBottom: '0.75rem' }}>What Actions to Take</h4>
          <ul className="action-list">
            {detail.actions.map((a, i) => (
              <li key={i}><span className="action-num">{i + 1}</span>{a}</li>
            ))}
          </ul>
          {detail.dyk && (
            <div className="dyk">
              <div className="dyk-label">{detail.dyk.label}</div>
              <p>{detail.dyk.text}</p>
            </div>
          )}
        </div>
      )}

      <Chatbot />
    </div>
  );
}
