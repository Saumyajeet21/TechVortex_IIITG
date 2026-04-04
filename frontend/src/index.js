import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Find the <div id="root"></div> in your public/index.html
const container = document.getElementById('root');
const root = createRoot(container);

// Render your entire App inside that div
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);