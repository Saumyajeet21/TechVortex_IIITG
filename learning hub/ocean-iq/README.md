# OceanIQ - Ocean Awareness Platform (React)

A comprehensive ocean awareness and coastal safety platform built with React and Vite.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── Hero.jsx        # Hero section
│   ├── NavTabs.jsx     # Navigation tabs
│   ├── LearningHub.jsx # Educational content section
│   ├── SafetyGuidance.jsx # Safety information section
│   ├── GovHelp.jsx     # Government resources section
│   ├── Quiz.jsx        # Interactive quiz component
│   └── Chatbot.jsx     # Safety chatbot component
├── data/               # Data files (separated for easy editing)
│   ├── quizData.js     # Quiz questions and answers
│   ├── chatbotData.js  # Chatbot responses and keywords
│   ├── safetyData.js   # Safety guidance content
│   └── govData.js      # Government resources data
├── App.jsx             # Main app component
├── main.jsx            # Entry point
└── index.css           # Global styles
```

## 🔧 Integration Guide

### For Your Main Project

1. **Copy the components folder** to your project
2. **Copy the data folder** to your project
3. **Copy index.css** styles to your global CSS
4. **Import and use** the App component:

```jsx
import OceanIQ from './components/App';

function YourMainApp() {
  return (
    <div>
      <OceanIQ />
    </div>
  );
}
```

### Customization

- **Edit content**: Modify files in `src/data/` folder
- **Change styles**: Edit `src/index.css` (uses CSS variables for easy theming)
- **Add modules**: Extend the content objects in `LearningHub.jsx`

## 🎨 Features

- **Learning Hub**: 5 educational modules (Ocean, Marine Life, Submarines, Weather, Coastal Business)
- **Safety Guidance**: Real-world coastal safety information with interactive chatbot
- **Government Resources**: Links to Indian government agencies, emergency numbers, apps
- **Interactive Quiz**: 8-question quiz to test ocean knowledge
- **Responsive Design**: Works on mobile, tablet, and desktop

## 📦 Dependencies

- React 18
- Vite (build tool)

No external UI libraries - pure React and CSS.

## 🛠️ Build for Production

```bash
npm run build
```

Output will be in `dist/` folder.

## 📝 Notes for Team

- All data is separated into `src/data/` for easy content updates
- Components are modular and can be used independently
- CSS uses custom properties (variables) for consistent theming
- No external dependencies beyond React - easy to integrate anywhere
