import React, { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:8002';

// ── Static zone data (mirrors lib/zones.ts) ────────────────────────────────────
const ZONES = [
  { id:'MUM-001', name:'Mumbai Coast',        lat:18.92, lon:72.82, risk:0.78, risk_label:'HIGH',   carbon_pct:0.34, damage_usd:29837, region:'Maharashtra',       description:'High shipping traffic zone near Mumbai port with Ulhas and Mithi river outflows.' },
  { id:'CHN-001', name:'Chennai Marina',       lat:13.05, lon:80.27, risk:0.61, risk_label:'MEDIUM', carbon_pct:0.52, damage_usd:18200, region:'Tamil Nadu',         description:"World's longest urban beach facing Bay of Bengal with high fishing vessel activity." },
  { id:'KOC-001', name:'Kochi Backwaters',     lat:9.93,  lon:76.26, risk:0.44, risk_label:'MEDIUM', carbon_pct:0.71, damage_usd:9100,  region:'Kerala',             description:'Rich mangrove ecosystem in Vembanad Lake region. Periyar River main inflow.' },
  { id:'SUN-001', name:'Sundarbans Delta',     lat:21.94, lon:89.18, risk:0.83, risk_label:'HIGH',   carbon_pct:0.28, damage_usd:41500, region:'West Bengal',        description:"World's largest mangrove delta. Critical carbon sink under severe plastic stress." },
  { id:'GOA-001', name:'Goa North Coast',      lat:15.49, lon:73.82, risk:0.29, risk_label:'LOW',    carbon_pct:0.86, damage_usd:4200,  region:'Goa',                description:'Relatively pristine coastal zone. Mandovi and Zuari rivers. Tourism pressure manageable.' },
  { id:'VIZ-001', name:'Visakhapatnam Coast',  lat:17.68, lon:83.22, risk:0.67, risk_label:'HIGH',   carbon_pct:0.45, damage_usd:21600, region:'Andhra Pradesh',     description:'Industrial port city with steel plant discharges. Bay of Bengal fishing hotspot.' },
  { id:'ORS-001', name:'Odisha Coast',         lat:19.90, lon:86.10, risk:0.58, risk_label:'MEDIUM', carbon_pct:0.55, damage_usd:14300, region:'Odisha',             description:'Chilika Lake biodiversity hotspot. Mahanadi delta under heavy agricultural runoff.' },
  { id:'AND-001', name:'Andaman Islands',      lat:11.74, lon:92.66, risk:0.22, risk_label:'LOW',    carbon_pct:0.91, damage_usd:3100,  region:'Andaman & Nicobar', description:'Pristine coral reefs. Remote location shields from mainland pollution.' },
  { id:'MAN-001', name:'Gulf of Mannar',       lat:9.10,  lon:79.10, risk:0.52, risk_label:'MEDIUM', carbon_pct:0.63, damage_usd:11800, region:'Tamil Nadu',         description:'Marine national park with seagrass beds. Heavy pearl oyster fishing activity.' },
  { id:'KUT-001', name:'Gulf of Kutch',        lat:22.60, lon:70.20, risk:0.71, risk_label:'HIGH',   carbon_pct:0.38, damage_usd:24500, region:'Gujarat',            description:'Major industrial port zone. ONGC oil operations and refinery discharges.' },
  { id:'MAN-002', name:'Mangalore Coast',      lat:12.87, lon:74.84, risk:0.48, risk_label:'MEDIUM', carbon_pct:0.67, damage_usd:12900, region:'Karnataka',          description:'Netravathi river delta. Mangalore port shipping traffic increasing rapidly.' },
  { id:'PAR-001', name:'Paradip Port',         lat:20.32, lon:86.61, risk:0.74, risk_label:'HIGH',   carbon_pct:0.33, damage_usd:27800, region:'Odisha',             description:"India's eastern gateway port. Mahanadi outflow makes this a high-risk accumulation zone." },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtK  = n => { if (!n && n!==0) return '—'; const v=Math.abs(n); return v>=1e6?`$${(n/1e6).toFixed(1)}M`:v>=1e3?`$${(n/1e3).toFixed(1)}K`:`$${n.toFixed(0)}`; };
const riskColor = l => l==='HIGH'?'#ef4444':l==='MEDIUM'?'#f59e0b':'#22c55e';
const riskBg    = l => l==='HIGH'?'rgba(239,68,68,0.15)':l==='MEDIUM'?'rgba(245,158,11,0.15)':'rgba(34,197,94,0.15)';

// ── Palette ───────────────────────────────────────────────────────────────────
const P = { bg:'#080f1a', surface:'#0d1829', card:'#0a1220', border:'rgba(255,255,255,0.07)', text:'#e2e8f0', muted:'#64748b', dim:'#283447', blue:'#38bdf8', purple:'#8b5cf6', teal:'#06b6d4', green:'#22c55e', amber:'#f59e0b', red:'#ef4444' };

// ── Micro SVGs ─────────────────────────────────────────────────────────────────
const I = ({ d, size=16, c='currentColor', sw=1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);

// ── Zone Card (list view) ──────────────────────────────────────────────────────
function ZoneListCard({ zone, onClick }) {
  const rc = riskColor(zone.risk_label);
  return (
    <div onClick={() => onClick(zone)}
      style={{ background: P.surface, border: P.border, borderRadius: 12, padding: '16px 18px',
        cursor: 'pointer', transition: 'all 0.18s', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(56,189,248,0.3)'; e.currentTarget.style.background='#112030'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor=P.border; e.currentTarget.style.background=P.surface; }}>
      <div style={{ position:'absolute', top:0, left:0, width:3, height:'100%', background: rc, borderRadius:'12px 0 0 12px' }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:'0.9rem', color:P.text, marginBottom:2 }}>{zone.name}</div>
          <div style={{ fontSize:'0.7rem', color:P.muted }}>{zone.region}</div>
        </div>
        <span style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.62rem', fontWeight:800,
          background: riskBg(zone.risk_label), color: rc, border:`1px solid ${rc}40` }}>
          {zone.risk_label}
        </span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <div>
          <div style={{ fontSize:'0.58rem', color:P.muted, letterSpacing:1, textTransform:'uppercase', marginBottom:2 }}>Plastic Risk</div>
          <div style={{ fontSize:'1.1rem', fontWeight:800, color:rc }}>{Math.round(zone.risk*100)}%</div>
        </div>
        <div>
          <div style={{ fontSize:'0.58rem', color:P.muted, letterSpacing:1, textTransform:'uppercase', marginBottom:2 }}>Carbon Health</div>
          <div style={{ fontSize:'1.1rem', fontWeight:800, color:P.green }}>{Math.round(zone.carbon_pct*100)}%</div>
        </div>
      </div>
      <div style={{ fontSize:'0.62rem', color:P.dim, marginTop:6 }}>{zone.description.slice(0,80)}…</div>
    </div>
  );
}

// ── Zone Detail Header ─────────────────────────────────────────────────────────
function ZoneHeader({ zone, carbon, damage }) {
  const rc = riskColor(zone.risk_label);
  const plasticRisk = carbon ? Math.round((1 - (carbon.carbon_absorption_pct||zone.carbon_pct))*100) : Math.round(zone.risk*100);
  const carbonHealth = carbon ? Math.round((carbon.carbon_absorption_pct||zone.carbon_pct)*100) : Math.round(zone.carbon_pct*100);
  const monthlyLoss = damage?.headline_damage_usd || zone.damage_usd;

  return (
    <div style={{ background: P.surface, border: P.border, borderRadius: 14, padding:'20px 24px', marginBottom:20 }}>
      <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <h2 style={{ fontSize:'1.4rem', fontWeight:800, color:P.text, margin:0, fontFamily:"'Space Grotesk','Inter',sans-serif" }}>{zone.name}</h2>
            <span style={{ padding:'3px 10px', borderRadius:6, fontSize:'0.62rem', fontWeight:800,
              background:riskBg(zone.risk_label), color:rc, border:`1px solid ${rc}40` }}>
              {zone.risk_label} RISK
            </span>
          </div>
          <p style={{ fontSize:'0.82rem', color:P.muted, margin:0, lineHeight:1.6 }}>{zone.description}</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:P.border, borderRadius:10, overflow:'hidden', flexShrink:0 }}>
          {[
            { label:'PLASTIC RISK',   value:`${Math.round(zone.risk*100)}%`,     color:P.red    },
            { label:'CARBON HEALTH',  value:`${Math.round(zone.carbon_pct*100)}%`, color:P.green  },
            { label:'MONTHLY LOSS',   value:fmtK(monthlyLoss),                   color:P.amber  },
            { label:'ZONE ID',        value:zone.id,                              color:P.text   },
          ].map(s => (
            <div key={s.label} style={{ background:P.card, padding:'12px 18px', minWidth:110 }}>
              <div style={{ fontSize:'0.55rem', color:P.muted, letterSpacing:1.2, textTransform:'uppercase', marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:'1.05rem', fontWeight:800, color:s.color, fontFamily:"'Space Grotesk','Inter',sans-serif" }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────────
const TAB_ICONS = { Overview:'🗺', Sources:'🔵', Simulator:'🎮' };
function Tabs({ active, onChange }) {
  return (
    <div style={{ display:'flex', gap:4, background:'#040d16', borderRadius:10, padding:4, marginBottom:20, width:'fit-content' }}>
      {['Overview','Sources','Simulator'].map(t => (
        <button key={t} onClick={() => onChange(t)} style={{
          padding:'7px 18px', borderRadius:7, border:'none', cursor:'pointer',
          fontFamily:"'Inter',sans-serif", fontSize:'0.8rem', fontWeight:600,
          background: active===t ? '#132338' : 'transparent',
          color: active===t ? P.blue : P.muted,
          boxShadow: active===t ? '0 0 0 1px rgba(56,189,248,0.3)' : 'none',
          transition:'all 0.15s',
        }}>
          {TAB_ICONS[t]} {t}
        </button>
      ))}
    </div>
  );
}

// ── Overview tab ───────────────────────────────────────────────────────────────
function OverviewTab({ carbon, damage }) {
  if (!carbon) return (
    <div style={{ color:P.muted, fontSize:'0.82rem', padding:'30px 0' }}>Loading analysis data…</div>
  );
  const veg = carbon.vegetation_health || {};
  const prices = damage?.carbon_prices || {};

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Vegetation & Water Health */}
      <div style={{ background:P.surface, border:P.border, borderRadius:12, padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <span style={{ fontSize:'0.9rem' }}>🌱</span>
          <span style={{ fontWeight:700, fontSize:'0.9rem', color:P.text }}>Vegetation & Water Health</span>
        </div>
        {/* 4 small metric cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:10 }}>
          {[
            { label:'LIVE NDVI',     value:(veg.seagrass_ndvi??0.61).toFixed(3), unit:'',    color:P.green,  sub:'Seagrass Vitality'  },
            { label:'BASELINE NDVI', value:(veg.baseline_ndvi??0.75).toFixed(3), unit:'',    color:P.muted,  sub:'5-year healthy mean' },
            { label:'TURBIDITY',     value:(veg.turbidity_ntu??4.4).toFixed(1),  unit:' NTU', color:P.teal,  sub:'Water clarity'       },
            { label:'SEA TEMP',      value:(veg.water_temp_c??27.0).toFixed(1),  unit:' °C', color:P.amber,  sub:'Surface temp'        },
          ].map(m => (
            <div key={m.label} style={{ background:P.card, border:P.border, borderRadius:9, padding:'12px 14px' }}>
              <div style={{ fontSize:'0.55rem', color:P.muted, letterSpacing:1.2, textTransform:'uppercase', marginBottom:6 }}>{m.label}</div>
              <div style={{ fontSize:'1.45rem', fontWeight:800, color:m.color, fontFamily:"'Space Grotesk','Inter',sans-serif", lineHeight:1 }}>
                {m.value}<span style={{ fontSize:'0.7rem', fontWeight:500 }}>{m.unit}</span>
              </div>
              <div style={{ fontSize:'0.6rem', color:P.muted, marginTop:4 }}>{m.sub}</div>
            </div>
          ))}
        </div>
        {/* 3 absorption cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {[
            { label:'BASELINE ABSORPTION', value:carbon.baseline_absorption_tonnes_year, color:P.muted,  bg:undefined },
            { label:'ACTUAL ABSORPTION',   value:carbon.actual_absorption_tonnes_year,   color:P.green,  bg:'rgba(34,197,94,0.05)' },
            { label:'LOST ABSORPTION',     value:carbon.lost_absorption_tonnes_year,     color:P.red,    bg:'rgba(239,68,68,0.07)'  },
          ].map(m => {
            const v = m.value; const disp = v>=1e3?`${(v/1e3).toFixed(1)}K`:v?.toFixed(0)??'—';
            return (
              <div key={m.label} style={{ background: m.bg||P.card, border:P.border, borderRadius:9, padding:'14px 16px', textAlign:'center' }}>
                <div style={{ fontSize:'0.54rem', color:P.muted, letterSpacing:1.3, textTransform:'uppercase', marginBottom:6 }}>{m.label}</div>
                <div style={{ fontSize:'1.6rem', fontWeight:900, color:m.color, fontFamily:"'Space Grotesk','Inter',sans-serif" }}>{disp}</div>
                <div style={{ fontSize:'0.6rem', color:P.muted, marginTop:3 }}>tCO₂/year</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Economic Damage */}
      <div style={{ background:P.surface, border:P.border, borderRadius:12, padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <span style={{ fontSize:'0.9rem' }}>💰</span>
          <span style={{ fontWeight:700, fontSize:'0.9rem', color:P.text }}>Economic Damage</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {[
            { title:'Voluntary Market', sub:'What corporations pay today',    tag:'MARKET RATE', tagColor:P.blue,   val:prices.voluntary_market_usd, note:'$15.50/tonne — VCM spot price', bg:'rgba(56,189,248,0.04)', ac:P.blue   },
            { title:'EU Regulatory',    sub:'EU Emissions Trading Scheme',    tag:'EU ETS',      tagColor:P.purple, val:prices.eu_ets_usd,           note:'$75/tonne — what Europe charges industry', bg:'rgba(139,92,246,0.04)', ac:P.purple },
            { title:'True Cost',        sub:'US EPA Social Cost of Carbon',   tag:'EPA ESTIMATE',tagColor:P.amber,  val:prices.social_cost_usd??prices.social_cost_carbon_usd, note:'$51/tonne — actual economic harm', bg:'rgba(245,158,11,0.04)', ac:P.amber  },
          ].map(c => (
            <div key={c.title} style={{ background:c.bg, border:P.border, borderRadius:10, padding:'16px 18px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                <div>
                  <div style={{ fontWeight:700, color:c.ac, fontSize:'0.82rem' }}>{c.title}</div>
                  <div style={{ fontSize:'0.65rem', color:P.muted, marginTop:1 }}>{c.sub}</div>
                </div>
                <span style={{ padding:'2px 7px', borderRadius:5, fontSize:'0.52rem', fontWeight:800,
                  background:c.tagColor+'22', color:c.tagColor }}>{c.tag}</span>
              </div>
              <div style={{ fontSize:'1.5rem', fontWeight:900, color:c.ac, margin:'8px 0 2px',
                fontFamily:"'Space Grotesk','Inter',sans-serif" }}>
                {fmtK(c.val)} <span style={{ fontSize:'0.72rem', fontWeight:400, color:P.muted }}>/monthly</span>
              </div>
              <div style={{ fontSize:'0.6rem', color:P.dim, marginTop:4 }}>{c.note}</div>
            </div>
          ))}
        </div>
        {damage?.equivalent_to && (
          <div style={{ fontSize:'0.68rem', color:P.dim, marginTop:12, paddingTop:12,
            borderTop:`1px solid ${P.border}` }}>
            ≈ {damage.equivalent_to}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sources tab ────────────────────────────────────────────────────────────────
function SourcesTab({ source, loading }) {
  if (loading) return <div style={{ color:P.muted, padding:'30px 0', textAlign:'center' }}>Loading sources…</div>;
  if (!source)  return <div style={{ color:P.dim,   padding:'30px 0', textAlign:'center' }}>No source data yet.</div>;

  const attr = source.attribution || {};
  const SRCS = [
    { key:'shipping_pct',         label:'Shipping',     color:'#3b82f6', icon:'🚢' },
    { key:'river_runoff_pct',     label:'River Runoff', color:'#06b6d4', icon:'🌊' },
    { key:'fishing_nets_pct',     label:'Fishing Nets', color:'#8b5cf6', icon:'🎣' },
    { key:'open_ocean_drift_pct', label:'Ocean Drift',  color:'#64748b', icon:'🌐' },
  ];
  const data = SRCS.map(s => ({ ...s, value: attr[s.key] || 0 })).filter(d => d.value > 0);
  const max  = Math.max(...data.map(d => d.value), 1);
  const FEASIBILITY_COLOR = { high:'#22c55e', medium:'#f59e0b', low:'#ef4444' };

  return (
    <div style={{ background:P.surface, border:P.border, borderRadius:12, padding:'18px 20px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <span style={{ fontSize:'0.82rem' }}>🔵</span>
        <span style={{ fontWeight:700, fontSize:'0.9rem', color:P.text }}>Plastic Source Attribution</span>
      </div>

      {/* Stacked bar */}
      <div style={{ display:'flex', borderRadius:8, overflow:'hidden', height:38, marginBottom:14 }}>
        {data.map(d => (
          <div key={d.key} style={{ width:`${d.value}%`, background:d.color,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'0.75rem', fontWeight:700, color:'#fff', transition:'opacity 0.2s' }}>
            {d.value > 12 && `${d.value.toFixed(0)}%`}
          </div>
        ))}
      </div>

      {/* Legend grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:16 }}>
        {data.map(d => (
          <div key={d.key} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px' }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:d.color, flexShrink:0 }} />
            <span style={{ fontSize:'0.75rem', color:P.muted }}>{d.icon} {d.label}</span>
            <span style={{ marginLeft:'auto', fontSize:'0.75rem', fontWeight:700, color:P.text }}>{d.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>

      {/* Custom horizontal bar chart */}
      <div style={{ marginBottom:20 }}>
        {data.map(d => (
          <div key={d.key} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <div style={{ width:80, fontSize:'0.72rem', color:P.muted, textAlign:'right', flexShrink:0 }}>{d.label}</div>
            <div style={{ flex:1, background:'rgba(255,255,255,0.05)', borderRadius:4, height:20, overflow:'hidden' }}>
              <div style={{ width:`${(d.value/max)*100}%`, background:d.color, height:'100%',
                display:'flex', alignItems:'center', paddingLeft:8, borderRadius:4, transition:'width 0.8s ease' }}>
                <span style={{ fontSize:'0.68rem', fontWeight:700, color:'#fff' }}>{d.value.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Interventions */}
      {source.interventions?.length > 0 && (
        <>
          <div style={{ fontSize:'0.62rem', fontWeight:800, color:P.blue, letterSpacing:1.5,
            textTransform:'uppercase', marginBottom:12 }}>Recommended Interventions</div>
          {source.interventions.slice(0,3).map((iv, i) => {
            const fc = FEASIBILITY_COLOR[iv.feasibility] || P.muted;
            return (
              <div key={i} style={{ padding:'12px 14px', background:P.card, border:P.border,
                borderRadius:9, marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                  <span style={{ fontSize:'0.82rem', fontWeight:700, color:P.text, flex:1, paddingRight:8 }}>{iv.action}</span>
                  <span style={{ padding:'2px 10px', borderRadius:20, fontSize:'0.62rem', fontWeight:700,
                    background:fc+'22', color:fc, flexShrink:0 }}>{iv.feasibility}</span>
                </div>
                <div style={{ display:'flex', gap:16, marginBottom:iv.description?6:0 }}>
                  <span style={{ fontSize:'0.72rem', color:P.green }}>↓ {iv.estimated_reduction_pct}% reduction</span>
                  <span style={{ fontSize:'0.72rem', color:P.muted }}>
                    {iv.cost_usd===0?'Zero cost':`$${(iv.cost_usd/1000).toFixed(0)}K investment`}
                  </span>
                </div>
                {iv.description && <p style={{ fontSize:'0.68rem', color:P.dim, margin:0, lineHeight:1.6 }}>{iv.description}</p>}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── Simulator tab ──────────────────────────────────────────────────────────────
function SimulatorTab({ zone }) {
  const [reduction, setReduction] = useState(30);
  const [months,    setMonths]    = useState(6);
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);

  const run = useCallback(async (r, m) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/simulate`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ lat:zone.lat, lon:zone.lon, radius_km:50, plastic_reduction_pct:r, months_ahead:m }),
      });
      setResult(await res.json());
    } catch (e) { setResult({ error: e.message }); }
    setLoading(false);
  }, [zone]);

  const handleReduction = e => { const v=+e.target.value; setReduction(v); if(result) run(v,months); };
  const handleMonths    = e => { const v=+e.target.value; setMonths(v);    if(result) run(reduction,v); };

  const proj    = result?.projected_state;
  const doNothing = result?.do_nothing_projection;

  const Slider = ({ label, value, onChange, min, max, step, valLabel, gradStart, gradEnd, midLabel }) => (
    <div style={{ marginBottom:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <span style={{ fontSize:'0.88rem', fontWeight:600, color:P.muted }}>{label}</span>
        <span style={{ fontSize:'1.05rem', fontWeight:800, color:P.blue }}>{valLabel}</span>
      </div>
      <div style={{ position:'relative', height:20, display:'flex', alignItems:'center' }}>
        <div style={{ position:'absolute', left:0, right:0, height:5, borderRadius:3,
          background:`linear-gradient(90deg, ${gradStart}, ${gradEnd})` }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={onChange}
          style={{ width:'100%', position:'relative', zIndex:1, appearance:'none', background:'transparent',
            cursor:'pointer', accentColor:gradEnd }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.62rem', color:P.dim, marginTop:4 }}>
        {[`${min}${midLabel?'':' (no action)'}`, midLabel||'50%', `${max}${midLabel?' months':' (full cleanup)'}`].map((l,i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ background:P.surface, border:P.border, borderRadius:12, padding:'20px 24px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <span style={{ fontSize:'0.82rem' }}>🤖</span>
        <span style={{ fontWeight:700, fontSize:'0.9rem', color:P.text }}>Recovery Simulator</span>
      </div>
      <p style={{ fontSize:'0.75rem', color:P.muted, marginBottom:24 }}>
        Adjust sliders to model the impact of plastic reduction on ecosystem recovery and economic savings.
      </p>

      <Slider label="Plastic Reduction Target" value={reduction} onChange={handleReduction}
        min={0} max={100} step={5} valLabel={`${reduction}%`}
        gradStart="#0ea5e9" gradEnd="#38bdf8" />
      <Slider label="Projection Period" value={months} onChange={handleMonths}
        min={1} max={24} step={1} valLabel={`${months} months`}
        gradStart="#7c3aed" gradEnd="#a78bfa" midLabel="12 months" />

      {!result && (
        <button onClick={() => run(reduction, months)} disabled={loading} style={{
          width:'100%', padding:'13px', borderRadius:10, border:'none', cursor:'pointer',
          background: loading ? 'rgba(56,189,248,0.1)' : '#0ea5e9',
          color: loading ? P.muted : '#fff',
          fontFamily:"'Inter',sans-serif", fontSize:'0.9rem', fontWeight:700,
          transition:'all 0.2s', marginBottom:4,
          boxShadow: loading ? 'none' : '0 4px 20px rgba(14,165,233,0.35)',
        }}>
          {loading ? 'Calculating…' : '▶ Run Simulation'}
        </button>
      )}

      {loading && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'20px 0', color:P.muted, fontSize:'0.82rem' }}>
          <div style={{ width:18, height:18, border:`2px solid ${P.blue}`, borderTopColor:'transparent',
            borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
          Projecting…
        </div>
      )}

      {result && !loading && !result.error && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:16 }}>
          {/* IF WE ACT */}
          <div style={{ background:'rgba(34,197,94,0.05)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:10, padding:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
              <span style={{ fontSize:'0.7rem' }}>↗</span>
              <span style={{ fontSize:'0.7rem', fontWeight:800, color:P.green, letterSpacing:1 }}>IF WE ACT</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div>
                <div style={{ fontSize:'0.58rem', color:P.muted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:2 }}>Carbon recovers to</div>
                <div style={{ fontSize:'1.3rem', fontWeight:800, color:P.green, fontFamily:"'Space Grotesk','Inter',sans-serif" }}>
                  {((proj?.carbon_absorption_pct||0)*100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize:'0.58rem', color:P.muted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:2 }}>Cost saved</div>
                <div style={{ fontSize:'1.1rem', fontWeight:800, color:P.amber, fontFamily:"'Space Grotesk','Inter',sans-serif" }}>
                  ${(proj?.damage_saved_usd_total||0).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize:'0.58rem', color:P.muted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:2 }}>Recovery time</div>
                <div style={{ fontSize:'0.9rem', fontWeight:700, color:P.blue }}>
                  ⌛ {proj?.months_to_recovery >= 999 ? '∞' : proj?.months_to_recovery} months
                </div>
              </div>
              <div style={{ background:'rgba(34,197,94,0.1)', borderRadius:6, padding:'5px 8px' }}>
                <span style={{ fontSize:'0.65rem', color:P.green }}>↑ {proj?.absorption_recovery_pct}% restoration vs current</span>
              </div>
            </div>
          </div>

          {/* DO NOTHING */}
          <div style={{ background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, padding:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
              <span style={{ fontSize:'0.7rem' }}>↘</span>
              <span style={{ fontSize:'0.7rem', fontWeight:800, color:P.red, letterSpacing:1 }}>DO NOTHING</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div>
                <div style={{ fontSize:'0.58rem', color:P.muted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:2 }}>Carbon drops to</div>
                <div style={{ fontSize:'1.3rem', fontWeight:800, color:P.red, fontFamily:"'Space Grotesk','Inter',sans-serif" }}>
                  {((doNothing?.carbon_absorption_pct_end||0)*100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize:'0.58rem', color:P.muted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:2 }}>Annual loss</div>
                <div style={{ fontSize:'1.1rem', fontWeight:800, color:'#fca5a5', fontFamily:"'Space Grotesk','Inter',sans-serif" }}>
                  ${(doNothing?.economic_loss_usd_year||0).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize:'0.58rem', color:P.muted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:2 }}>Ecosystem collapse</div>
                <div style={{ fontSize:'0.9rem', fontWeight:700, color:'#fca5a5' }}>
                  ⌛ {doNothing?.ecosystem_collapse_months ? `~${doNothing.ecosystem_collapse_months}` : '∞'} months
                </div>
              </div>
              <div style={{ background:'rgba(239,68,68,0.1)', borderRadius:6, padding:'5px 8px' }}>
                <span style={{ fontSize:'0.65rem', color:P.red }}>⚠ Continued degradation at 0.6%/month</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {result?.error && <div style={{ color:P.red, fontSize:'0.8rem', marginTop:12 }}>Error: {result.error}</div>}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function OceanGuardPanel() {
  const [selected, setSelected] = useState(null);
  const [tab,      setTab]      = useState('Overview');
  const [carbon,   setCarbon]   = useState(null);
  const [damage,   setDamage]   = useState(null);
  const [source,   setSource]   = useState(null);
  const [srcLoad,  setSrcLoad]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const [query, setQuery] = useState('');
  const sorted = [...ZONES].sort((a,b) => b.risk - a.risk);
  const filtered = query.trim()
    ? sorted.filter(z =>
        z.name.toLowerCase().includes(query.toLowerCase()) ||
        z.region.toLowerCase().includes(query.toLowerCase()) ||
        z.risk_label.toLowerCase().includes(query.toLowerCase())
      )
    : sorted;

  async function selectZone(zone) {
    setSelected(zone); setTab('Overview');
    setCarbon(null); setDamage(null); setSource(null);
    setLoading(true);
    try {
      const payload = { lat:zone.lat, lon:zone.lon, radius_km:50 };
      const [c, d] = await Promise.all([
        fetch(`${API}/api/carbon-absorption`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }).then(r=>r.json()),
        fetch(`${API}/api/damage-cost`,       { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }).then(r=>r.json()),
      ]);
      setCarbon(c); setDamage(d);
    } catch {}
    setLoading(false);
  }

  async function loadSources() {
    if (!selected || source) return;
    setSrcLoad(true);
    try {
      const s = await fetch(`${API}/api/plastic-source`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ lat:selected.lat, lon:selected.lon, radius_km:50 }),
      }).then(r=>r.json());
      setSource(s);
    } catch {}
    setSrcLoad(false);
  }

  const handleTab = t => {
    setTab(t);
    if (t==='Sources' && !source) loadSources();
  };

  // Zone list view
  if (!selected) return (
    <div style={{ background:P.bg, minHeight:'100vh', padding:'28px 28px 48px',
      fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", color:P.text }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
        <div style={{ width:34, height:34, borderRadius:10, background:'rgba(56,189,248,0.12)',
          border:'1px solid rgba(56,189,248,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <I d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" size={17} c={P.blue} />
        </div>
        <h1 style={{ fontFamily:"'Space Grotesk','Inter',sans-serif", fontSize:'1.25rem', fontWeight:800,
          color:'#f1f5f9', letterSpacing:'-0.3px', margin:0 }}>OceanGuard</h1>
        <span style={{ padding:'2px 8px', borderRadius:6, fontSize:'0.58rem', fontWeight:800,
          background:'rgba(56,189,248,0.1)', color:P.blue, border:'1px solid rgba(56,189,248,0.2)', letterSpacing:0.5 }}>
          ML MODELS
        </span>
      </div>
      <p style={{ color:P.muted, fontSize:'0.82rem', marginBottom:20 }}>
        Ocean Plastic Climate Monitor — Indian coastal zones
      </p>

      {/* Search bar */}
      <div style={{ position:'relative', marginBottom:20, maxWidth:480 }}>
        <div style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:P.muted, pointerEvents:'none' }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search zone, region or risk level…"
          style={{
            width:'100%', padding:'10px 36px 10px 38px', borderRadius:9, outline:'none',
            background:'#07111a',
            border:`1px solid ${query ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color:P.text, fontSize:'0.85rem', fontFamily:"'Inter',sans-serif",
            boxSizing:'border-box', transition:'border-color 0.18s',
          }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{
            position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
            background:'none', border:'none', cursor:'pointer',
            color:P.muted, fontSize:18, lineHeight:1, padding:'0 4px',
          }}>×</button>
        )}
      </div>

      {/* Zone grid */}
      {filtered.length > 0 ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {filtered.map(z => <ZoneListCard key={z.id} zone={z} onClick={selectZone} />)}
        </div>
      ) : (
        <div style={{ textAlign:'center', padding:'56px 0', color:P.dim, fontSize:'0.85rem' }}>
          No zones match&nbsp;<strong style={{ color:P.muted }}>"{query}"</strong>
        </div>
      )}
    </div>
  );

  // Zone detail view
  return (
    <div style={{ background:P.bg, minHeight:'100vh', fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", color:P.text }}>
      {/* Top nav bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'10px 24px', background:'#050d18', borderBottom:'1px solid rgba(255,255,255,0.06)',
        position:'sticky', top:0, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <button onClick={() => setSelected(null)} style={{
            display:'flex', alignItems:'center', gap:5, background:'none', border:'none',
            cursor:'pointer', color:P.muted, fontSize:'0.8rem', fontWeight:600, padding:'5px 8px',
            borderRadius:7, transition:'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color=P.text}
          onMouseLeave={e => e.currentTarget.style.color=P.muted}>
            ← Back
          </button>
          <div style={{ width:1, height:20, background:'rgba(255,255,255,0.08)' }} />
          <span style={{ fontWeight:700, fontSize:'0.9rem', color:P.text }}>OceanGuard</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.78rem', color:P.muted }}>
          <span>{selected.region}</span>
          <button onClick={() => selectZone(selected)} title="Refresh" style={{
            background:'none', border:'none', cursor:'pointer', color:P.muted, padding:4 }}>↻</button>
        </div>
      </div>

      <div style={{ padding:'24px 28px 48px' }}>
        {/* Zone header */}
        <ZoneHeader zone={selected} carbon={carbon} damage={damage} />

        {/* Tabs */}
        <Tabs active={tab} onChange={handleTab} />

        {/* Loading state */}
        {loading && (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'30px 0', color:P.muted, fontSize:'0.82rem' }}>
            <div style={{ width:18, height:18, border:`2px solid ${P.blue}`, borderTopColor:'transparent',
              borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            Loading analysis…
          </div>
        )}

        {/* Tab content */}
        {!loading && tab === 'Overview'  && <OverviewTab   carbon={carbon} damage={damage} />}
        {!loading && tab === 'Sources'   && <SourcesTab    source={source} loading={srcLoad} />}
        {!loading && tab === 'Simulator' && <SimulatorTab  zone={selected} />}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
