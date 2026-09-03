# AeroFlow — Next-Gen AI Airport Operations & Passenger Experience Platform

[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TailwindCSS-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20%7C%20Motor%20Async-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Container-Docker%20%7C%20K8s%20Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel%20Edge-000000?logo=vercel&logoColor=white)](https://aeroflow-hub.vercel.app)
[![Render](https://img.shields.io/badge/Deploy-Render%20Cloud-46E3B7?logo=render&logoColor=black)](https://render.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**AeroFlow** is a modern, enterprise-grade airport terminal operations and passenger intelligence system. It unifies **real-time terminal congestion analytics**, **Poisson & M/M/c queueing simulation**, **machine-learning baggage retrieval prediction**, **aircraft-type-aware AI carousel allocation**, and an **intelligent door-to-gate passenger journey planner** into a high-performance distributed web platform.

---

## 📑 Table of Contents
1. [Executive Summary & Core Value](#-executive-summary--core-value)
2. [Live Demonstrations & Endpoints](#-live-demonstrations--endpoints)
3. [System Architecture & Data Flow](#-system-architecture--data-flow)
4. [Feature Deep-Dive](#-feature-deep-dive)
   - [A. Passenger Journey & Flight Intelligence](#a-passenger-journey--flight-intelligence)
   - [B. Staff Operations Command Console](#b-staff-operations-command-console)
   - [C. AI Carousel Sizing & Allocation Engine](#c-ai-carousel-sizing--allocation-engine)
   - [D. Security, RBAC & 2FA Architecture](#d-security-rbac--2fa-architecture)
5. [Mathematical & Machine Learning Models](#-mathematical--machine-learning-models)
6. [Technology Stack](#-technology-stack)
7. [Repository Structure](#-repository-structure)
8. [Quick Start & Local Setup](#-quick-start--local-setup)
9. [API Reference & Telemetry](#-api-reference--telemetry)
10. [Security & Environment Variables](#-security--environment-variables)
11. [Testing & Verification](#-testing--verification)
12. [Contributors & License](#-contributors--license)

---

## 🌟 Executive Summary & Core Value

Modern international hubs process tens of millions of passengers annually. Bottlenecks at security checkpoints, misallocated baggage belts, unexpected passenger surges, and ambiguous terminal itineraries cost airlines and airports millions in delays and degrade traveler satisfaction.

AeroFlow solves these operational challenges through:
- **Intelligent Door-to-Gate Passenger Guidance**: Personalized countdowns calculating real-time city transit duration (OSRM), dynamic security wait times, and physical gate walking distances.
- **Predictive Terminal Congestion Modeling**: Continuous queue-length and wait-time forecasting across Check-in, Security, Immigration, and Boarding gates using Poisson arrival processes and M/M/c multi-server queueing theory.
- **AI-Driven Carousel Allocation & Reassignment**: Sizing algorithms that match wide-body high-density international flights (e.g. B777, A350) with 105m heavy-capacity belts and narrow-body domestic flights with 88m standard belts.
- **End-to-End Baggage Telemetry**: Gradient Boosting Regressor (GBR) models predicting first-bag and last-bag delivery times (P10, P50, P90 percentiles) based on passenger volume, baggage weight, aircraft category, and ground handler efficiency.

---

## 🚀 Live Demonstrations & Endpoints

| Service | Environment | URL |
| :--- | :--- | :--- |
| **Passenger & Staff Web App** | Production (Vercel Edge) | [https://aeroflow-hub.vercel.app](https://aeroflow-hub.vercel.app) |
| **Backend REST & WebSocket API** | Production (Render Cloud) | [https://aeroflow-j4ga.onrender.com](https://aeroflow-j4ga.onrender.com) |
| **Interactive Swagger API Docs** | Production OpenAPI | [https://aeroflow-j4ga.onrender.com/docs](https://aeroflow-j4ga.onrender.com/docs) |
| **API Health Telemetry** | Production Probe | [https://aeroflow-j4ga.onrender.com/health](https://aeroflow-j4ga.onrender.com/health) |

---

## 🏗 System Architecture & Data Flow

```
                                  +--------------------------------------------------+
                                  |            Client Applications (React 18)        |
                                  |    Passenger Portal  ·  Staff Operations Console |
                                  +------------------------+-------------------------+
                                                           |
                                                HTTPS / WSS| (Secure CORS & WebSockets)
                                                           v
                                  +--------------------------------------------------+
                                  |         API Gateway & Reverse Proxy (Ingress)    |
                                  +------------------------+-------------------------+
                                                           |
                                                           v
+--------------------------------------------------------------------------------------------------------------------+
|                                              AEROFLOW CORE ENGINE (FastAPI)                                        |
|                                                                                                                    |
|   +--------------------------+   +-----------------------------+   +------------------------+   +---------------+  |
|   | Queue & Congestion       |   | Baggage Predictor (GBR)     |   | AI Carousel Sizing     |   | RBAC & 2FA    |  |
|   | - Poisson Arrival Dist.  |   | - First/Last Bag P50/P90    |   | - Wide vs Narrow Body  |   | - OTP & JWT   |  |
|   | - M/M/c Queue Models     |   | - Ground Handler Modeling   |   | - 105m vs 88m Belts    |   | - Encryption  |  |
|   +--------------------------+   +-----------------------------+   +------------------------+   +---------------+  |
|                                                                                                                    |
|   +------------------------------------------------------------------------------------------------------------+  |
|   |                                WebSocket Live Broadcaster (15s Simulation Loop)                            |  |
|   +------------------------------------------------------------------------------------------------------------+  |
+----------------------------------------------------------+---------------------------------------------------------+
                                                           |
                                                           | Motor (Async MongoDB Driver)
                                                           v
                                  +--------------------------------------------------+
                                  |             MongoDB Document Database            |
                                  |  - Flights (7-Day Rolling)   - Checkpoint Zones  |
                                  |  - Carousel Assignments      - User Profiles     |
                                  +--------------------------------------------------+
```

---

## 💡 Feature Deep-Dive

### A. Passenger Journey & Flight Intelligence
- **Intelligent Door-to-Gate Planner**:
  - Automatically calculates optimal **"Leave Home By"** timing.
  - Combines live origin-to-airport transit times (OSRM OpenStreetMap routing), dynamic checkpoint wait times, and walking distance to the departure gate.
  - Provides early departure recommendations, airport arrival buffers, and boarding deadlines.
- **Dual Journey Views**:
  - **Standard Timeline**: Compact, high-density milestone progress bar.
  - **Terminal Journey Story**: Step-by-step narrative guiding the passenger from Terminal Curb ➔ Check-in ➔ Security ➔ Duty Free ➔ Boarding Concourse.
- **Digital Boarding Pass Dossier**:
  - Live scannable barcode generator.
  - Seat assignment, boarding group, baggage allowances, gate assignment, and real-time flight status badges.
- **Flight Information Display System (FIDS)**:
  - Real-time search by flight number, airline, or destination/origin city.
  - Instant filtering by direction (Departures / Arrivals), flight status, and terminal concourses.

---

### B. Staff Operations Command Console
- **Terminal Congestion Heatmap**:
  - Live occupancy and queue depth visualizer across Terminal 3 zones (T3 Check-in, Security Domestic/Intl, Immigration, Boarding Gates).
  - Categorizes load into `Low`, `Normal`, `Elevated`, and `Severe` congestion levels.
- **Dynamic Staffing Recommendations**:
  - AI calculates optimal active counter allocations (e.g. recommend opening 8 of 12 security lanes during peak bank hours).
  - Staff can manually override active counters to instantly simulate queue reductions.
- **Live Operational Incident Feed**:
  - System-generated real-time alerts for queue threshold breaches, conveyor belt overlaps, flight delays, and staffing shortfalls.
- **Flight Delay Manager**:
  - Allows operations leads to adjust departure/arrival schedules, instantly recalculating passenger journey milestones and baggage delivery times.

---

### C. AI Carousel Sizing & Allocation Engine
- **Aircraft Sizing Classification**:
  - Identifies **Wide-Body Aircraft** (Boeing 777, 787 Dreamliner, Airbus A350, A380, A330) and flights carrying **230+ passengers**.
  - Identifies **Narrow-Body Aircraft** (Airbus A320, A321, Boeing 737) and regional jets.
- **Baggage Load & Belt Capacity Optimization**:
  - **105-meter High-Capacity Belts** (`AC-01`, `AC-07`, `AC-08`, `AC-13`, `AC-14`) are dynamically reserved for wide-body international arrivals.
  - **88-meter Standard Belts** (`AC-02`–`AC-06`, `AC-09`–`AC-12`) are allocated for domestic narrow-body flights.
  - Applies international baggage allowance multipliers (~1.4 bags/pax vs 0.95 domestic).
- **Interactive Reassign Console**:
  - Explains the exact AI rationale (e.g. *"Wide-Body B777 with 314 pax (~440 bags) requires 105m carousel AC-01 to avoid baggage accumulation"*).
  - 1-Click **"Apply AI Recommendation"** action with instant live passenger notification synchronization.

---

### D. Security, RBAC & 2FA Architecture
- **Hierarchical Role-Based Access Control**:
  - `admin`: Full cluster governance, user management, and airport topology provisioning.
  - `ops_manager`: Airport operations console, staffing adjustments, flight delays.
  - `security_lead`: Security screening throughput and queue management.
  - `baggage_ops`: Baggage carousel assignments, delay injection, conveyor telemetry.
  - `passenger`: Personalized flight dashboard, baggage tracking, journey navigation.
- **Multi-Channel 2FA Authentication**:
  - One-Time Password (OTP) verification supported via Email (Resend / Gmail SMTP), SMS (Twilio), and WhatsApp.
  - Cryptographic token hashing with automatic lockout protection on repeated failed attempts.
- **Data Protection**:
  - Fernet symmetric encryption for sensitive user contact data at rest.
  - Strict Cross-Origin Resource Sharing (CORS) dynamic middleware supporting secure credentials.

---

## 📐 Mathematical & Machine Learning Models

### 1. Terminal Queueing Simulation ($M/M/c$ Model)
Passenger arrivals at each checkpoint $z$ follow a time-varying non-homogeneous Poisson process:

$$\lambda_z(t) = \sum_{f \in \text{Flights}} P_f \cdot \mathcal{N}\left(t \mid \mu_f, \sigma_f^2\right)$$

Where $P_f$ is flight passenger capacity, and arrivals are distributed normally around checkpoint arrival offsets $\mu_f$. The predicted wait time $W_q$ with $c$ active counters and mean service rate $\mu$ is computed via the Erlang-C formula:

$$P_{\text{wait}} = \frac{\frac{(c \rho)^c}{c! (1 - \rho)}}{\sum_{k=0}^{c-1}\frac{(c \rho)^k}{k!} + \frac{(c \rho)^c}{c! (1 - \rho)}}, \quad W_q = \frac{P_{\text{wait}}}{c \mu - \lambda}$$

Where $\rho = \frac{\lambda}{c \mu} < 1$ is counter utilization.

### 2. Gradient Boosting Baggage Delivery Model
Baggage arrival times are predicted using a trained Gradient Boosting Regressor:

$$\hat{T}_{\text{first}}, \hat{T}_{\text{last}} = f_{\text{GBR}}\left(\text{pax}, \text{luggage\_kg}, \text{is\_intl}, \text{hour}, \sin(\text{hour}), \cos(\text{hour}), \text{ground\_handler}\right)$$

### 3. Conveyor Retrieval Curves
The instantaneous luggage count on a claim carousel $c$ at minute $m$ post-first-bag is governed by empirical passenger retrieval curves:

$$\text{BagsOnBelt}(m) = \text{TotalBags} \times \left(1 - \frac{\text{PctRetrieved}(m)}{100}\right)$$

---

## 🛠 Technology Stack

| Layer | Component | Version / Library | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React | `18.2.0` | Declarative component UI |
| **Styling** | Tailwind CSS | `3.3.0` | Glassmorphic dark/light design system |
| **Motion** | Framer Motion | `11.0.0` | Fluid state animations and transitions |
| **Icons** | Lucide React | `0.344.0` | High-precision vector iconography |
| **Backend API** | FastAPI | `0.110.0` | High-throughput asynchronous REST API |
| **Asynchronous Engine**| Python / Uvicorn | `3.11+` | Event-loop async execution |
| **Database** | MongoDB | `7.0` | High-speed document datastore |
| **Async DB Driver** | Motor | `3.3.1` | Non-blocking MongoDB client |
| **ML & Analytics** | Scikit-Learn / NumPy | `1.4.0` | GBR baggage duration models |
| **Routing / Maps** | OSRM / Nominatim | Free Public API | Real-time transit duration matrix |
| **Notifications** | Resend / Twilio | REST API | Multi-channel OTP and alerts |

---

## 📂 Repository Structure

```
AeroFlow/
├── backend/                         # FastAPI core backend application
│   ├── api.py                       # REST API router endpoints
│   ├── auth.py                      # RBAC, JWT, password hashing, and OTP service
│   ├── engines.py                   # Poisson queueing, M/M/c, and AI carousel allocation
│   ├── server.py                    # Server lifecycle, WebSocket broadast, CORS engine
│   ├── database.py                  # Motor async MongoDB connector & indices
│   ├── baggage_model.py             # GBR Machine Learning prediction loader
│   ├── maps_service.py              # OpenStreetMap & OSRM transit route solver
│   ├── email_service.py             # Email notification & OTP dispatch engine
│   ├── sms_service.py               # SMS communication handler
│   ├── whatsapp_service.py          # WhatsApp Business API integration
│   ├── seed_from_master.py          # Rolling 7-day flight schedule synthesizer
│   ├── tests/                       # Comprehensive pytest suite
│   ├── Dockerfile                   # Production multi-worker Docker image
│   └── requirements.txt             # Python package dependencies
├── frontend/                        # React 18 single page application
│   ├── public/                      # Static assets, manifests, icons
│   ├── src/
│   │   ├── components/
│   │   │   ├── ops/                 # Staff Ops: Heatmap, CarouselAllocationBoard, AlertFeed
│   │   │   ├── passenger/           # Passenger: Timeline, BoardingPass, FidsBoard, TimeCard
│   │   │   ├── layout/              # Navbar, CommandMenu, Footer, ThemeToggle
│   │   │   └── ui/                  # Accessible UI primitives (Radix UI)
│   │   ├── pages/                   # Application views: PassengerPortal, OpsConsole, Auth
│   │   ├── lib/                     # API Axios client, formatters, utilities
│   │   └── App.js                   # Application root router & context providers
│   ├── nginx.conf                   # Alpine Nginx SPA routing & reverse proxy
│   └── Dockerfile                   # Multi-stage production container specification
├── k8s/                             # Production Kubernetes manifests
│   └── aeroflow.yaml                # Deployments, StatefulSets, HPA (3-12 pods), Ingress
├── docker-compose.yml               # Multi-container local execution
├── DOCKER_K8S_GUIDE.md              # Docker & Kubernetes operations handbook
├── SETUP.md                         # Complete developer onboarding instructions
├── .gitignore                       # Master secret & build exclusion rules
└── README.md                        # Master repository documentation
```

---

## ⚡ Quick Start & Local Setup

### Option 1: Docker Compose (Fastest)
Spins up MongoDB, the FastAPI backend, and the React frontend on an isolated bridge network:

```bash
docker compose up --build -d
```
- **Passenger & Ops Web Portal**: [http://localhost:3000](http://localhost:3000)
- **Interactive Backend API Docs**: [http://localhost:8001/docs](http://localhost:8001/docs)

---

### Option 2: Native Development Setup

#### Prerequisites
- Node.js `>= 18.0.0`
- Python `>= 3.11`
- MongoDB `>= 6.0` (Running locally on port `27017` or MongoDB Atlas URI)

#### 1. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Copy example environment configuration
cp .env.example .env

# Seed master flight schedules and airport topology
python seed_from_master.py

# Start FastAPI server with live reloading
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup
```bash
cd frontend
npm install

# Copy example environment configuration
cp .env.example .env

# Start React development server
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> 📖 For comprehensive environment variables, database tuning, and production configuration, see [**SETUP.md**](SETUP.md).

---

## 📡 API Reference & Telemetry

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | System health check and uptime probe |
| `GET` | `/api/fids` | Public | Live Flight Information Display System schedule |
| `GET` | `/api/journey/departure/{flight_num}` | Public | Door-to-gate journey milestones & timeline |
| `GET` | `/api/journey/arrival/{flight_num}` | Public | Baggage claim timeline & carousel tracking |
| `GET` | `/api/congestion/zones` | Public | Real-time passenger queue counts & wait times |
| `GET` | `/api/baggage/assignments` | Staff | Live carousel allocations with AI sizing metrics |
| `GET` | `/api/baggage/assignments/{id}/ai-recommendation`| Staff | AI sizing recommendation & rationale for a flight |
| `POST`| `/api/baggage/assignments/{id}/reassign` | Staff | Reassign a flight to a target carousel belt |
| `POST`| `/api/flights/{id}/delay` | Staff | Inject operational flight delay and update passengers |
| `POST`| `/api/auth/login` | Public | Authenticate user credentials & issue OTP |
| `POST`| `/api/auth/verify-otp` | Public | Verify OTP and return signed JWT bearer token |
| `WS` | `/api/ws/live` | Public | Full-duplex WebSocket operations broadcast |

---

## 🔒 Security & Environment Variables

- **Zero Hardcoded Secrets**: All keys, passwords, database URIs, and credentials are strictly injected through environment variables.
- **Git Hygiene**: `.env`, `.env.local`, `*.pem`, `*.key`, `*.xlsx`, and temporary test databases are enforced in `.gitignore`.
- **CORS Protection**: Dynamic origin validation with credential support for trusted hostnames.
- **Rate Limiting**: Endpoint abuse mitigation via SlowAPI memory key storage.

---

## 🧪 Testing & Verification

Run the full automated test suite covering queueing models, carousel allocation rules, RBAC, and baggage predictions:

```bash
cd backend
python -m pytest tests/ -v
```

---

## 📄 License & Credits

Developed with precision for modern airport intelligence. Released under the **MIT License**.
