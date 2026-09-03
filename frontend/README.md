# AeroFlow — Frontend Web Application

The client-side web application for the **AeroFlow Airport Operations & Passenger Intelligence Platform**, built with **React 18**, **Tailwind CSS**, **Framer Motion**, and accessible **Radix UI** primitives.

---

## 🏛 Architecture & Component Structure

```
frontend/src/
├── components/
│   ├── layout/              # Navbar, ThemeToggle, MobileDrawer, CommandMenu, Footer
│   ├── ops/                 # Staff Operations Console modules
│   │   ├── TerminalCongestionMap.js      # Zone occupancy & wait time visualizer
│   │   ├── CarouselAllocationBoard.js    # AI carousel sizing & reassignment board
│   │   ├── LiveAlertFeed.js              # Operational incident telemetry stream
│   │   └── CheckpointThroughputChart.js  # Counter staffing & capacity metrics
│   ├── passenger/           # Passenger Experience modules
│   │   ├── AeroJourneyTimeline.js        # Standard milestone timeline
│   │   ├── TerminalJourneyStory.js       # Interactive step-by-step journey narrative
│   │   ├── TimeRecommendationCard.js     # Intelligent "Leave Home By" door-to-gate planner
│   │   ├── BaggageTrackerCard.js         # Baggage claim countdown & belt tracking
│   │   ├── BoardingPassDossier.js        # Digital boarding pass & barcode renderer
│   │   ├── FidsBoard.js                  # Flight Information Display System board
│   │   └── FlightSearchHero.js           # Flight discovery search hero
│   └── ui/                  # Reusable atomic design components (Radix UI primitives)
├── pages/                   # Top-level application view routes
│   ├── PassengerPortal.js   # Passenger journey dashboard & flight explorer
│   ├── OpsConsole.js        # Staff real-time operations console
│   └── auth/
│       ├── Login.js         # Role-based credential authentication & 2FA entry
│       └── Register.js      # Passenger & staff invite onboarding
├── lib/                     # Axios API client, date/time formatters, and utility functions
└── App.js                   # Application router, theme provider, and state management
```

---

## 🚀 Development Scripts

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm start

# Compile production bundle into build/
npm run build

# Run unit tests
npm test
```

---

## 🌐 Environment Variables

Create `.env` in the `frontend/` directory:

```ini
# Backend API Base URL
REACT_APP_BACKEND_URL=http://localhost:8000

# Optional Features
ENABLE_HEALTH_CHECK=true
```

---

## 🚢 Deployment

- **Vercel (Recommended)**: Set Root Directory to `frontend` and inject `REACT_APP_BACKEND_URL`.
- **Docker Nginx**: Use the provided multi-stage `Dockerfile` to build an optimized static Alpine Nginx image.
