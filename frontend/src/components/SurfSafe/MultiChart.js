import React from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, Legend,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

// ── Seaborn-inspired palette ──────────────────────────────────────
const PALETTE = {
    blue:    '#4c9be8',
    teal:    '#2ab5b5',
    green:   '#3dba78',
    amber:   '#f0a500',
    red:     '#e85454',
    purple:  '#9b6ee8',
    cyan:    '#00d4ff',
    muted:   '#6e8898',
};

const OCEAN_COLORS = [PALETTE.cyan, PALETTE.teal, PALETTE.green, PALETTE.blue, PALETTE.purple, PALETTE.amber];

function riskColor(score) {
    if (score >= 8) return PALETTE.red;
    if (score >= 5) return PALETTE.amber;
    return PALETTE.green;
}

function latestPerOcean(logs) {
    const seen = new Map();
    for (const log of logs) {
        if (!seen.has(log.ocean_name)) seen.set(log.ocean_name, log);
    }
    return Array.from(seen.values());
}

// ── Shared Tooltip ────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(6,13,24,0.97)', border: '1px solid #1e3a5f',
            borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#e0e8f0',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        }}>
            {label && <p style={{ margin:'0 0 6px', color: PALETTE.cyan, fontWeight:'bold', fontSize:'11px' }}>{label}</p>}
            {payload.map((p, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'6px', margin:'2px 0' }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background: p.color, display:'inline-block' }}/>
                    <span style={{ color:'#8aa8c0' }}>{p.name}:</span>
                    <strong style={{ color:'#fff' }}>
                        {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
                        {p.name === 'Risk Score' ? '/10' : p.name === 'Wave Height' ? 'm' : ''}
                    </strong>
                </div>
            ))}
        </div>
    );
};

// Shared axis tick styles
const axisStyle    = { fill: '#8ab4cc', fontSize: 11, fontFamily: 'Inter, sans-serif' };
const axisStyleSm  = { fill: '#8ab4cc', fontSize: 10, fontFamily: 'Inter, sans-serif' };
const gridStyle    = { stroke: '#0e1e30', strokeDasharray: '4 4' };

export default function MultiChart({ logs }) {
    if (!logs?.length) return (
        <div style={{ color: '#4a6580', textAlign:'center', padding:'40px', fontStyle:'italic' }}>
            Awaiting satellite data...
        </div>
    );

    const perOcean = latestPerOcean([...logs]);

    // 1. Trend (last 20 entries, chronological)
    const trendData = [...logs].reverse().slice(-20).map(l => ({
        time:   new Date(l.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
        'Risk Score': l.score,
        'Wave Height': l.height,
    }));

    // 2. Bar — current risk per ocean (first word only to keep labels short)
    const barData = perOcean.map(l => ({
        name:  (l.ocean_name || '').split(' ')[0],   // e.g. "Caribbean", "Southern", "Baga"
        score: l.score,
        height: l.height ?? 0,
    }));

    // 3. Radar
    const radarData = perOcean.slice(0, 8).map(l => ({
        ocean: (l.ocean_name || '').split(' ')[0],
        score: l.score,
        full:  l.ocean_name,
    }));

    // 4. Multi-ocean lines
    const oceanNames = [...new Set(logs.map(l => l.ocean_name))].slice(0, 5);
    const lineData = [];
    [...logs].reverse().slice(-50).forEach(log => {
        const t = new Date(log.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
        let bucket = lineData.find(b => b.time === t);
        if (!bucket) { bucket = { time: t }; lineData.push(bucket); }
        bucket[log.ocean_name] = log.score;
    });

    return (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginTop:'12px' }}>

            {/* 1 — Risk Trend */}
            <ChartCard title="📈 Live Risk Trend" subtitle="Score over time">
                <ResponsiveContainer width="100%" height={195}>
                    <AreaChart data={trendData} margin={{ top:5, right:10, left:-18, bottom:5 }}>
                        <defs>
                            <linearGradient id="gRisk" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor={PALETTE.teal}  stopOpacity={0.5} />
                                <stop offset="100%" stopColor={PALETTE.teal}  stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="gWave" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor={PALETTE.blue}  stopOpacity={0.35} />
                                <stop offset="100%" stopColor={PALETTE.blue}  stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid {...gridStyle} vertical={false} />
                        <XAxis dataKey="time" tick={axisStyleSm} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis domain={[0, 10]} tick={axisStyle} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="Risk Score"  stroke={PALETTE.teal} strokeWidth={2.5} fill="url(#gRisk)" dot={false} activeDot={{ r:5, fill:PALETTE.teal }} />
                        <Area type="monotone" dataKey="Wave Height" stroke={PALETTE.blue} strokeWidth={1.5} fill="url(#gWave)" dot={false} activeDot={{ r:4, fill:PALETTE.blue }} />
                        <Legend wrapperStyle={{ fontSize:10, color:'#8ab4cc', paddingTop:'6px' }} />
                    </AreaChart>
                </ResponsiveContainer>
            </ChartCard>

            {/* 2 — Risk by Ocean */}
            <ChartCard title="🌊 Risk by Location" subtitle="Current danger levels">
                <ResponsiveContainer width="100%" height={195}>
                    <BarChart data={barData} margin={{ top:5, right:10, left:-18, bottom:48 }}>
                        <CartesianGrid {...gridStyle} vertical={false} />
                        <XAxis
                            dataKey="name"
                            tick={{ fill:'#8ab4cc', fontSize:10, fontFamily:'Inter, sans-serif' }}
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                            angle={-40}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis domain={[0, 10]} tick={axisStyle} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill:'rgba(255,255,255,0.03)' }} />
                        <Bar dataKey="score" name="Risk Score" radius={[6,6,0,0]} maxBarSize={40}>
                            {barData.map((e, i) => (
                                <Cell key={i}
                                    fill={riskColor(e.score)}
                                    fillOpacity={0.85}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>

            {/* 3 — Radar */}
            <ChartCard title="📡 Ocean Risk Radar" subtitle="Relative risk across all sensors">
                <ResponsiveContainer width="100%" height={200}>
                    <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
                        <PolarGrid stroke="#0e1e30" />
                        <PolarAngleAxis dataKey="ocean" tick={{ fill:'#8ab4cc', fontSize:10, fontFamily:'Inter, sans-serif' }} />
                        <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} axisLine={false} />
                        <Radar name="Risk" dataKey="score"
                            stroke={PALETTE.cyan} fill={PALETTE.cyan} fillOpacity={0.2} strokeWidth={2}
                            dot={{ fill: PALETTE.cyan, r:3 }}
                        />
                        <Tooltip content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                                <div style={{ background:'rgba(6,13,24,0.97)', border:'1px solid #1e3a5f', borderRadius:'8px', padding:'8px 12px', fontSize:'12px' }}>
                                    <p style={{ color: PALETTE.cyan, margin:0, fontWeight:'bold' }}>{d.full}</p>
                                    <p style={{ margin:'4px 0 0', color:'#fff' }}>Risk: <strong style={{ color: riskColor(d.score) }}>{d.score}/10</strong></p>
                                </div>
                            );
                        }} />
                    </RadarChart>
                </ResponsiveContainer>
            </ChartCard>

            {/* 4 — Multi-ocean comparison */}
            <ChartCard title="🔀 Ocean Comparison" subtitle="Score trend per location">
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={lineData} margin={{ top:5, right:10, left:-18, bottom:5 }}>
                        <CartesianGrid {...gridStyle} vertical={false} />
                        <XAxis dataKey="time" tick={axisStyleSm} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis domain={[0, 10]} tick={axisStyle} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize:10, color:'#8ab4cc', paddingTop:'4px' }}
                            formatter={v => v?.split(' ')[0]} />
                        {oceanNames.map((ocean, idx) => (
                            <Area key={ocean} type="monotone" dataKey={ocean}
                                stroke={OCEAN_COLORS[idx % OCEAN_COLORS.length]}
                                fill={OCEAN_COLORS[idx % OCEAN_COLORS.length]}
                                fillOpacity={0.06}
                                strokeWidth={1.8} dot={false} connectNulls
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </ChartCard>

        </div>
    );
}

// ── Card wrapper ───────────────────────────────────────────────────
function ChartCard({ title, subtitle, children }) {
    return (
        <div style={{
            background: 'linear-gradient(145deg,#060d18,#0b1628)',
            borderRadius: '14px', padding: '18px 16px 12px',
            border: '1px solid #0e1e30',
            boxShadow: '0 4px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03)'
        }}>
            <div style={{ marginBottom:'12px' }}>
                <h3 style={{ margin:0, color:'#c8dff0', fontSize:'11px', fontWeight:700,
                             textTransform:'uppercase', letterSpacing:'1.5px' }}>{title}</h3>
                {subtitle && <p style={{ margin:'3px 0 0', color:'#3a5570', fontSize:'10px' }}>{subtitle}</p>}
            </div>
            {children}
        </div>
    );
}