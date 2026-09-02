# AeroFlow — Frontend Web Application

The client-side web interface for the AeroFlow Airport Operations & Passenger Experience Platform, built with **React 18**, **Tailwind CSS**, and modern UI primitives.

---

## 1. Architecture & Component Structure

```
frontend/src/
├── components/
│   ├── layout/              # Navigation bar, footers, command menus
│   ├── ops/                 # Operations Console modules
│   │   ├── TerminalCongestionMap.js
│   │   ├── CarouselAllocationBoard.js
│   │   ├── LiveAlertFeed.js
│   │   └── CheckpointThroughputChart.js
│   ├── passenger/           # Passenger Experience modules
│   │   ├── AeroJourneyTimeline.js
│   │   ├── BaggageTrackerCard.js
│   │   ├── BoardingPassDossier.js
│   │   └── TerminalJourneyStory.js
│   └── ui/                  # Reusable atomic UI components (Radix primitives)
├── pages/                   # Top-level view routes
│   ├── OpsConsole.js        # Real-time operational dashboard
│   ├── PassengerPortal.js   # Flight search and journey tracker
│   ├── Login.js             # Authentication & role-based sign-in
│   └── Register.js          # Passenger and staff onboarding
└── App.js                   # Root router, query clients, and theme providers
```

---

## 2. Development Scripts

In the `frontend` directory, execute:

### `npm start`
Runs the application in local development mode with hot-module reloading at `http://localhost:3000`.

### `npm run build`
Compiles and bundles the application for production into the `build/` directory using CRACO and PostCSS. Files are minified and optimized with content hashes for browser caching.

### `npm test`
Launches the test runner in interactive watch mode.

---

## 3. Environment Configuration

Create `.env` in the `frontend/` directory:

```ini
# Backend API Base URL (default: http://localhost:8001)
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## 4. Production Deployment

### Multi-Stage Docker Container
The frontend contains a multi-stage build using Alpine Nginx:
```bash
docker build -t aeroflow-frontend:latest .
docker run -d -p 3000:80 aeroflow-frontend:latest
```

### Vercel Deployment
1. Push the repository to GitHub.
2. Import the repository into the Vercel dashboard.
3. Set the **Root Directory** to `frontend`.
4. Configure the environment variable:
   - `REACT_APP_BACKEND_URL`: `https://your-backend-api-domain.com`
5. Click **Deploy**.
