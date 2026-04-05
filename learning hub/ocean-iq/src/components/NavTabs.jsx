const tabs = [
  { id: 'hub', label: '📚 Learning Hub', cls: 'active-hub' },
  { id: 'safety', label: '🆘 Safety Guidance', cls: 'active-safety' },
  { id: 'gov', label: '🏛️ Government & Help', cls: 'active-gov' },
];

export default function NavTabs({ active, onChange }) {
  return (
    <div className="nav-tabs">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`tab-btn ${active === t.id ? t.cls : 'inactive'}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
