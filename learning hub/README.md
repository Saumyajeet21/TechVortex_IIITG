# TechVortex IIITG — OceanIQ Module

> **OceanIQ** is an Ocean Awareness & Safety platform built for the TechVortex hackathon at IIIT Guwahati.  
> This repository contains the **ocean-iq** React/Vite app — a modular, embeddable component for use in the main project.

---

## 📁 Repository Structure

```
TechVortex_IIITG/
└── ocean-iq/                  ← React/Vite app (the main module)
    ├── src/
    │   ├── components/        ← All UI components (modular & reusable)
    │   │   ├── Hero.jsx
    │   │   ├── NavTabs.jsx
    │   │   ├── LearningHub.jsx
    │   │   ├── SafetyGuidance.jsx
    │   │   ├── GovHelp.jsx
    │   │   ├── Quiz.jsx
    │   │   └── Chatbot.jsx
    │   ├── data/              ← Content data (edit here for content changes)
    │   │   ├── quizData.js
    │   │   ├── chatbotData.js
    │   │   ├── safetyData.js
    │   │   └── govData.js
    │   ├── App.jsx            ← Root component (tab switching logic)
    │   ├── main.jsx           ← Vite entry point
    │   └── index.css          ← Global design system & CSS variables
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## 🚀 Running Locally (for Development)

```bash
cd ocean-iq
npm install
npm run dev
```

App will be live at **http://localhost:5173**

---

## 🔌 Integrating Into the Main Project

### Option A — Use as a standalone page/route

Copy the entire `ocean-iq/` folder into your main project and add a route pointing to it.

### Option B — Import as a React component

1. Copy `ocean-iq/src/components/` → your project's component folder
2. Copy `ocean-iq/src/data/` → your project's data folder
3. Copy the CSS variables from `ocean-iq/src/index.css` → your global CSS
4. Import and mount the `App` component:

```jsx
import OceanIQ from './components/App';   // adjust path as needed

function YourMainApp() {
  return (
    <div>
      {/* your other content */}
      <OceanIQ />
    </div>
  );
}
```

> **No external UI library dependencies** — only React + Vite. Easy to drop in anywhere.

---

## 🎨 Key Features

| Feature | Description |
|---|---|
| 📚 Learning Hub | 5 modules — Ocean, Marine Life, Submarines, Weather, Coastal Business |
| 🆘 Safety Guidance | Interactive coastal safety cards with detailed action steps |
| 🏛️ Gov & Help | Indian government agencies, emergency numbers, useful apps |
| 🧠 Quiz | 8-question interactive ocean knowledge quiz |
| 🤖 Chatbot | Keyword-based ocean safety assistant |
| 📱 Responsive | Works on mobile, tablet, and desktop |

---

## ✏️ Customizing Content

All content is **separated into data files** in `src/data/`:

| File | What to edit |
|---|---|
| `quizData.js` | Quiz questions, options, answers, explanations |
| `chatbotData.js` | Chatbot keywords and responses |
| `safetyData.js` | Safety guidance content and action steps |
| `govData.js` | Government agencies, helplines, and apps |

---

## 🏗️ Build for Production

```bash
cd ocean-iq
npm run build
```

Output: `ocean-iq/dist/` (static files, ready to deploy)

---

## 📦 Dependencies

- **React 19** + **React DOM**
- **Vite 8** (build tool)
- No external UI libraries

---

## 🆘 Emergency Contact (for reference)

**National Emergency: 112**  
Coast Guard (Maritime Rescue): 1554  
NDMA Helpline: 1078  
