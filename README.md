# TechVortex IIITG — Climate and Ocean Intelligence Platform

TechVortex is a multi-module AI-powered climate intelligence dashboard built by Team TechVortex at IIIT Guwahati. The platform integrates coastal ocean monitoring, atmospheric weather analysis, a climate chatbot, a recovery simulator, and an ocean awareness learning hub into a single unified interface.

---

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Module Descriptions](#module-descriptions)
- [Technology Stack](#technology-stack)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [Port Reference](#port-reference)

---

## Features

- **Centralized Dashboard**: A single entry point that unifies 6 different services.
- **Supabase Authentication**: Secure login, signup, and password recovery via email.
- **Ocean Risk ML**: Live monitoring of ocean conditions, plastic risk, and carbon absorption.
- **Twilio SMS Alerts**: Automated SMS notifications for high-risk coastal zones using Gemini AI verification.
- **ClimateBot**: Conversational AI powered by Groq's Llama 3.3 70B for climate data queries.
- **OceanGuard Panel**: Real-time recovery simulation and carbon market pricing.
- **One-Click Startup**: Launch the entire 8-service stack via a single `.bat` file.

---

## Architecture Overview

The platform follows a hub-and-spoke architecture. A central React frontend (Vite) at port 5173 acts as the unified shell. Each functional module runs as an independent full-stack service. The hub communicates with backend services over HTTP and embeds sub-frontends via iframes.

```text
Browser (port 5173) — Central Hub
    |
    |-- Sidebar navigation
    |       |-- Dashboard (AtmoSense weather module)
    |       |-- ClimateBot (Flask chatbot)
    |       |-- Ocean Risk ML (React CRA, port 3000)
    |       |-- OceanGuard (React Vite, port 3002)
    |       |-- OceanIQ (React Vite, port 3001)
    |
    |-- Backend services
            |-- Weather AI API         port 8000  (FastAPI)
            |-- Ocean Risk ML API      port 8001  (FastAPI)
            |-- OceanGuard API         port 8002  (FastAPI)
            |-- ClimateBot             port 5000  (Flask)
```

---

## Module Descriptions

### Central Hub — `weather-module/frontend`
The main React application that boots at port 5173. Contains the Supabase Auth login page, the global sidebar, and iframe routers. 

### AtmoSense — `weather-module`
A weather intelligence module with real-time atmospheric data. Backend is a FastAPI service calling OpenWeatherMap.

### ClimateBot — `chatbot`
A conversational AI assistant powered by Groq's Llama 3.3. Users can ask questions about ocean science and climate topics. Built with Flask.

### Ocean Risk ML — `backend` + `frontend`
A FastAPI backend handling Twilio SMS alerts, Supabase DB operations, Ocean-Meteo scans, and Gemini AI verification. Frontend runs on port 3000.

### OceanGuard — `OceanGuard`
An ocean plastic climate monitoring dashboard. Backend on port 8002 provides endpoints for carbon absorption, plastic source attribution, and economic damage costs. Frontend runs on port 3002.

### OceanIQ — `learning hub/ocean-iq`
A Vite-based React frontend at port 3001 embedded in the central hub. Provides ocean science education content.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontends | React 18, Vite, TailwindCSS, vanilla CSS |
| Backends | Python, FastAPI, Uvicorn, Flask |
| Database & Auth | Supabase |
| ML models | scikit-learn GradientBoosting, LightGBM |
| External APIs | Open-Meteo, OpenWeatherMap, Groq, Twilio, Gemini 2.5 Flash, NASA Earthdata |

---

## Environment Variables

The repository contains `.env.example` files in each service directory. Copy these to `.env` and fill in your keys:

- `backend/.env` (Supabase, Gemini, Twilio)
- `chatbot/.env` (Groq API Key)
- `OceanGuard/backend/.env` (Supabase, Gemini)
- `OceanGuard/frontend/.env` (Google Maps)
- `weather-module/backend/.env` (OpenWeatherMap)
- `weather-module/frontend/.env` (Supabase, Gemini, OWM, Google Maps)

---

## Running the Project

### The Easy Way (Windows One-Click)
Run the automated batch script to start all 8 services concurrently in minimized terminal windows. Ensure you have installed packages using `npm install` and `pip install` in the respective directories first.

```cmd
start-techvortex.bat
```

To stop all services instantly:
```cmd
stop-techvortex.bat
```

> The script will automatically open the central dashboard `http://localhost:5173` in your default browser.

### The Manual Way
If you prefer to run services manually, follow the port mappings below and run `npm run dev` / `npm start` for frontends and `uvicorn main:app` / `python app.py` for backends.

---

## Port Reference

| Port | Service | Directory |
|---|---|---|
| **5173** | **Central Hub (main entry point)** | `weather-module/frontend` |
| 3000 | Ocean Risk ML Frontend | `frontend/` |
| 3001 | OceanIQ Learning Hub | `learning hub/ocean-iq/` |
| 3002 | OceanGuard Frontend | `OceanGuard/frontend/` |
| 8000 | Weather AI API | `weather-module/backend/api/` |
| 8001 | Ocean Risk ML API | `backend/` |
| 8002 | OceanGuard API | `OceanGuard/backend/` |
| 5000 | ClimateBot Flask | `chatbot/` |
