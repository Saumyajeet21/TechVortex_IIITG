import React, { useState, useEffect } from 'react';
import { LoadScript } from '@react-google-maps/api';
import MapView from './components/SurfSafe/MapView';
import MultiChart from './components/SurfSafe/MultiChart';
import AlertSignup from './components/SurfSafe/AlertSignup';
import './App.css';

const GOOGLE_KEY = process.env.REACT_APP_GOOGLE_KEY;
// Load BOTH 'places' (for Autocomplete) here once — shared by MapView + AlertSignup
const LIBRARIES = ['places'];

function App() {
    const [logs, setLogs] = useState([]);
    const [mapsReady, setMapsReady] = useState(false);

    const fetchLogs = async () => {
        try {
            const response = await fetch('http://localhost:8001/logs');
            if (!response.ok) return;
            const data = await response.json();
            if (!Array.isArray(data)) return;
            // Only update state if data actually changed — prevents Google Maps re-render on every poll
            setLogs(prev => {
                const prevKey = prev.map(l => `${l.id}_${l.score}_${l.created_at}`).join();
                const nextKey = data.map(l => `${l.id}_${l.score}_${l.created_at}`).join();
                return prevKey === nextKey ? prev : data;
            });
        } catch (err) {
            console.error('Connection to Satellite lost.');
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 20000);
        return () => clearInterval(interval);
    }, []);

    const latestLog = logs[0] || { score: 0, ocean_name: 'Scanning...' };
    const isDanger  = latestLog.score >= 8;

    return (
        <div className="app-root">
            <header className="header-wrapper">
                <h1 className="logo-text">OCEAN <span className="logo-ai">AI</span></h1>
            </header>

            <div className={isDanger ? 'status-banner-danger' : 'status-banner-neon'}>
                {isDanger ? '⚠️ DANGER' : '✅ SAFE'} - {latestLog.ocean_name} (Score: {latestLog.score}/10)
            </div>

            {/* Google Maps API loaded ONCE here — MapView & AlertSignup use it directly */}
            <LoadScript
                googleMapsApiKey={GOOGLE_KEY}
                libraries={LIBRARIES}
                loadingElement={<div />}
                onLoad={() => setMapsReady(true)}
            >
                <div className="dashboard-grid">
                    {/* VISUALIZATION PANEL */}
                    <div className="viz-panel">
                        <div className="map-section">
                            <MapView logs={logs} mapsReady={mapsReady} />
                        </div>

                        <div className="chart-section" style={{ minHeight: '400px', display: 'block' }}>
                            <h3 className="card-title">📈 Real-Time Risk Analytics</h3>
                            {logs.length > 0 ? <MultiChart logs={logs} /> : <p>Loading Analytics...</p>}
                        </div>
                    </div>

                    {/* SIDEBAR */}
                    <div className="sidebar-panel">
                        <AlertSignup onSignup={fetchLogs} mapsReady={mapsReady} />
                        <div className="card-dark" style={{ marginTop: '20px' }}>
                            <h3 className="card-title">📡 System Telemetry</h3>
                            <p>Active Sensors: {logs.length}</p>
                            <p>Inference Engine: LightGBM v3.2</p>
                            <p>Map: Google Maps (satellite hybrid)</p>
                            <p>Geocoding: Google Places API</p>
                            <p>AI Verify: Gemini 2.5 Flash</p>
                        </div>
                    </div>
                </div>
            </LoadScript>
        </div>
    );
}

export default App;