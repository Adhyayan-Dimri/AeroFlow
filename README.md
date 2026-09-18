# AeroFlow - Next-Gen AI Airport Operations & Passenger Intelligence Platform
> *From curb to gate, no need to wait.*

[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TailwindCSS-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20%7C%20Motor%20Async-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Google SSO](https://img.shields.io/badge/Auth-Google%20OAuth%202.0%20%7C%202FA-4285F4?logo=google&logoColor=white)](https://developers.google.com/identity)
[![RAG Engine](https://img.shields.io/badge/Tactical%20AI-Autonomous%20RAG%20%7C%20SOP-FF6F00?logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)
[![Computer Vision](https://img.shields.io/badge/Computer%20Vision-YOLOv8x%20%7C%20DeepSORT-00E5FF?logo=opencv&logoColor=black)](https://github.com/ultralytics/ultralytics)
[![Docker](https://img.shields.io/badge/Container-Docker%20%7C%20K8s%20Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel%20Edge-000000?logo=vercel&logoColor=white)](https://aeroflow-hub.vercel.app)
[![Render](https://img.shields.io/badge/Deploy-Render%20Cloud-46E3B7?logo=render&logoColor=black)](https://render.com)


---

##  Table of Contents
1. [Executive Overview & Operational Value](#-executive-overview--operational-value)
2. [Live Deployments & Endpoints](#-live-deployments--endpoints)
3. [Key Innovations & Feature Deep-Dive](#-key-innovations--feature-deep-dive)
   - [1. Autonomous RAG & Auto-Pilot Dispatch Engine](#1-autonomous-rag--auto-pilot-dispatch-engine)
   - [2. AeroVoice Multilingual AI Assistant](#2-aerovoice-multilingual-ai-assistant)
   - [3. Interactive 2D Spatial Terminal Heatmap](#3-interactive-2d-spatial-terminal-heatmap)
   - [4. CCTV AI Passenger Flow Vision (YOLOv8x + DeepSORT)](#4-cctv-ai-passenger-flow-vision-yolov8x--deepsort)
   - [5. Enterprise Identity, Google OAuth 2.0 & Multi-Channel 2FA](#5-enterprise-identity-google-oauth-20--multi-channel-2fa)
   - [6. Advanced Safety, Emergency SOS & Anti-Phishing Suite](#6-advanced-safety-emergency-sos--anti-phishing-suite)
   - [7. Door-to-Gate Passenger Journey & FIDS Telemetry](#7-door-to-gate-passenger-journey--fids-telemetry)
   - [8. AI Carousel Sizing & GBR Baggage Retrieval Predictor](#8-ai-carousel-sizing--gbr-baggage-retrieval-predictor)
4. [System Architecture & Data Flow](#-system-architecture--data-flow)
5. [Mathematical & Machine Learning Foundations](#-mathematical--machine-learning-foundations)
6. [Technology Stack](#-technology-stack)
7. [Repository Directory Structure](#-repository-directory-structure)
8. [Quick Start & Local Setup](#-quick-start--local-setup)
   - [Option 1: Docker Compose (One-Click)](#option-1-docker-compose-one-click)
   - [Option 2: Native Development Setup](#option-2-native-development-setup)
9. [Comprehensive API Reference](#-comprehensive-api-reference)
10. [Security Hardening & Privacy](#-security-hardening--privacy)
11. [Automated Testing & Quality Verification](#-automated-testing--quality-verification)

---

##  Executive Overview & Operational Value

Aviation mega-hubs process tens of millions of passengers every year. Bottlenecks at forecourt entry gates, unexpected passenger arrival surges, security checkpoint gridlocks, misallocated baggage reclaim belts, and fragmented communications result in millions of dollars in carrier delays and passenger frustration.

**AeroFlow** is a next-generation distributed airport operations platform that bridges the gap between **tactical airport ground operations** and **personalized passenger intelligence**. Powered by real-time spatial telemetry, queuing theory, computer vision surveillance (YOLOv8x + DeepSORT), machine-learning baggage models, an autonomous RAG (Retrieval-Augmented Generation) policy engine, and bilingual voice assistance, AeroFlow ensures frictionless transit from city curb to departure gate.

### Key Value Pillars
-  **Autonomous SOP Execution**: Eliminates operator hesitation during critical bottleneck events by automatically triggering ICAO & CISF directives.
-  **Real-Time Computer Vision Telemetry**: YOLOv8x neural detection and DeepSORT persistent tracking measure passenger ingress/egress and terminal occupancy live from CCTV feeds.
-  **Synchronized Door-to-Gate Guidance**: Calculates live "Leave Home By" advisories factoring city traffic (OSRM), security screening delays, and physical gate walking distances.
-  **Full Spatial Awareness**: Live 2D architectural heatmaps of terminal zones provide airport duty managers with instantaneous operational clarity.
-  **Frictionless Multilingual Accessibility**: High-accuracy Indian English, Hindi, and mixed Hinglish voice assistant tailored for domestic and international travelers.
-  **Zero-Trust Enterprise Security**: Multi-tier RBAC, Google OAuth 2.0 SSO, multi-channel 2FA, heuristic anti-phishing email validation, and Fernet database encryption.

---

##  Live Deployments & Endpoints

| Service Component | Infrastructure / Provider | URL | Status |
| :--- | :--- | :--- | :--- |
| **Passenger & Operations Web App** | Vercel Edge Network | [https://aeroflow-hub.vercel.app](https://aeroflow-hub.vercel.app) | `Active` |
| **Backend Core REST & WebSocket API** | Render Cloud (FastAPI / Uvicorn) | [https://aeroflow-j4ga.onrender.com](https://aeroflow-j4ga.onrender.com) | `Active` |
| **Interactive OpenAPI Documentation** | Swagger UI | [https://aeroflow-j4ga.onrender.com/docs](https://aeroflow-j4ga.onrender.com/docs) | `Active` |
| **Real-Time Health Probe** | Health Check Endpoint | [https://aeroflow-j4ga.onrender.com/health](https://aeroflow-j4ga.onrender.com/health) | `Active` |

---

##  Key Innovations & Feature Deep-Dive

### 1. Autonomous RAG & Auto-Pilot Dispatch Engine
Located in `backend/rag_engine.py` and `frontend/src/components/ops/RagAutomationController.js`, AeroFlow integrates a tactical Retrieval-Augmented Generation engine designed specifically for airport terminal operations.

```
                           +----------------------------------------+
                           |     Live Terminal Congestion Telemetry |
                           |  (Queue Depth, Wait Times, Belt Loads) |
                           +-------------------+--------------------+
                                               |
                                               v
+---------------------------------------------------------------------------------------------+
|                                    AEROFLOW RAG ENGINE                                      |
|                                                                                             |
|   +------------------------------------+          +-------------------------------------+   |
|   | AIRPORT SOP CORPUS                 |          | TF-IDF & Cosine Similarity          |   |
|   | - ICAO Annex 9 Passenger Regs      |  ----->  | Semantic Vector Matcher             |   |
|   | - CISF Security Directives 14/2024 |          | (Top-k SOP Clause Extraction)       |   |
|   | - Widebody Belt Sizing Rules       |          +------------------+------------------+   |
|   | - DigiYatra Entry Load Balancing   |                             |                      |
|   +------------------------------------+                             v                      |
|                                                   +-------------------------------------+   |
|                                                   | Operational Action Generator        |   |
|                                                   | - Lane Escalation / E-Gate Divert   |   |
|                                                   | - Carousel Auto-Reassignment        |   |
|                                                   +------------------+------------------+   |
+----------------------------------------------------------------------|----------------------+
                                                                       |
                         +---------------------------------------------+---------------------------------------------+
                         |                                                                                           |
                         v (Autonomous Mode)                                                                         v (Manual Review Mode)
        +-----------------------------------+                                                       +------------------------------------+
        | Real-Time Automated Dispatch      |                                                       | Staff Review & 1-Click Approval    |
        | - Open ATRS Security Lanes 9 & 10 |                                                       | - Rationale & Directive Cited      |
        | - Reallocate Widebody to 105m Belt|                                                       | - Duty Manager Confirms Action     |
        +-----------------+-----------------+                                                       +-----------------+------------------+
                          |                                                                                           |
                          +------------------------------------+------------------------------------------------------+
                                                               |
                                                               v
                                            +--------------------------------------+
                                            | Immutable RAG Audit Log & History    |
                                            | (Timestamped SOP Execution Record)   |
                                            +--------------------------------------+
```

- **Standard Operating Procedure (SOP) Knowledge Base**:
  - `SOP-CONG-01`: Forecourt & DigiYatra Dynamic Load Balancing (diverts entry queues to auxiliary e-gates when wait time > 6.0 min).
  - `SOP-CONG-02`: CISF Security Screening SHA & ATRS Lane Escalation (mandates opening ATRS Lanes 9 & 10 and deploying 3–4 screening officers when SHA density $\ge$ 80%).
  - `SOP-CONG-03`: International Immigration Hall & Biometric E-Gate Staffing (deploys Bureau of Immigration officers during arrival surges > 1,000 pax/hr).
  - `SOP-CONG-04`: Domestic Check-in Island Self Bag Drop Conversion (converts manual airline counters to automated SBD lines during peak bank hours).
  - `SOP-BAG-01`: Widebody High-Capacity Carousel Allocation (ICAO Annex 9 compliant enforcement of 105m belts for B777, B787, A350, A380).
  - `SOP-BAG-02`: Baggage Carousel Conflict & Overlap Resolution (resolves flight schedule bunching within a 15-minute window).
  - `SOP-BAG-03`: Emergency Reserve Belt Isolation (safeguards belts AC-13 and AC-14 for diversion and VIP contingencies).
- **Sub-Second Vector Search**: TF-IDF n-gram vectorization with cosine similarity scoring matches live operational anomalies to exact regulatory clauses.
- **Dual Operating Modes**:
  - **Autonomous Auto-Pilot**: Automatically triggers operational remedies (lane openings, belt reassignments, DigiYatra gate switches) and emits live WebSocket alerts.
  - **Manual Review**: Stages recommendations for the Duty Manager with cited regulatory rationales and a single-click "Apply Action" trigger.
- **Immutable Audit Trail**: Chronological log recording rule triggers, timestamps, impacted terminal zones, and dispatch outcomes.

---

### 2. AeroVoice Multilingual AI Assistant
Located in `frontend/src/components/passenger/AeroVoiceAssistant.js`, AeroVoice provides hands-free passenger wayfinding and flight intelligence.

- **Dynamic Turn-by-Turn Auto-Detection (English · Hindi · Hinglish)**:
  - Users do not need to manually toggle language switches or country flags.
  - Speech input is processed via the Web Speech API configured to `en-IN`, enabling high-accuracy phonetic recognition for both English and Devnagari/Hinglish vocabulary.
  - AeroVoice inspects speech tokens in real time and automatically responds in the passenger's chosen language:
    - *English query* ➔ *English synthesized vocal and visual response*.
    - *Hindi / Hinglish query* ➔ *Natural Hindi vocal synthesis & Hindi text output*.
- **Live Synchronized "Leave Home" Intelligence**:
  - Deeply linked with the ML `forecast` and `TimeRecommendationCard` engine.
  - When asked *"Ghar se kab niklu?"* or *"When should I leave home?"*, AeroVoice calculates departure deadlines based on live OSRM city travel duration, security queues, and boarding gate buffers.
- **Context-Aware Voice Actions**:
  - **Flight Status**: Checks delay minutes, departure time, and active boarding gate.
  - **Baggage Reclaim**: Identifies assigned carousel belt number and delivery status.
  - **Terminal Wayfinding**: Provides precise walking instructions to Check-in Islands, DigiYatra gates, Food Courts, and Boarding Piers.
  - **PRM / Wheelchair Assistance**: Immediately provides guidelines for booking airport mobility assistance and dedicated boarding lanes.
- **Interactive UI with Waveform Acoustics**:
  - Real-time animated audio visualizer waves during active listening.
  - Bilingual quick-inquiry suggestion chips organized with stacked English and Hindi prompts.

---

### 3. Interactive 2D Spatial Terminal Heatmap
Located in `frontend/src/components/ops/TerminalSpatialHeatmap.js` and `TerminalCongestionMap.js`, this module provides an architectural floorplan of Delhi Indira Gandhi International Airport (DEL T3).

- **Architectural Vector Layout**:
  - **Forecourt Entry**: Entry Gates 1–4 (North) & Gates 5–8 (South) with DigiYatra biometric lane tracking.
  - **Check-in Concourse**: Dedicated Islands A & B, C & D (Domestic Indigo/Air India), E & F, and G & H (International).
  - **Security Hold Area (SHA)**: Domestic Security SHA North & International ATRS Screening Lanes SHA South.
  - **Border Control**: Immigration & Customs Clearance Hall.
  - **Departure Piers**: Pier A (Gates 1–15) and Pier B (Gates 16–30) concourses.
  - **Arrivals Reclaim Hall**: High-Capacity (105m) and Standard (88m) Baggage Carousels `AC-01` through `AC-14`.
- **Dynamic Occupancy Gradients**:
  - Low (< 50% capacity): Emerald / Green.
  - Moderate (50%–75% capacity): Amber / Yellow.
  - High (75%–90% capacity): Coral / Orange.
  - Critical (> 90% capacity): Pulsing Crimson / Red.
- **Interactive Simulation Controls**:
  - **Airport Surge Multiplier**: Real-time slider (0.5x to 2.5x load) allowing operations leads to stress-test terminal capacity against holiday travel surges.
  - **Staff Allocation Counter**: Adjusts active screening lanes and counter staffing to simulate instantaneous queue dissipation.
  - **Zone Inspector Drawer**: Deep-dives into queue volume, waiting duration, staffing key, and AI SOP recommendations.
  - **Layer Filtering**: Switch views between All Zones, Check-in Islands, Security Screening, Boarding Piers, and Baggage Claim.

---

### 4. CCTV AI Passenger Flow Vision (YOLOv8x + DeepSORT)
Located in `frontend/src/components/ops/CctvFlowMonitor.js` and `backend/cctv_service.py`, AeroFlow incorporates real-time computer vision surveillance to monitor physical terminal ingress and egress.

```
                           +-----------------------------------------------+
                           |          Live CCTV Security Cameras           |
                           |   CAM-01 (Forecourt Entry) · CAM-04 (Exit)    |
                           +-----------------------+-----------------------+
                                                   |
                                                   v
+--------------------------------------------------------------------------------------------------+
|                                    CCTV COMPUTER VISION PIPELINE                                 |
|                                                                                                  |
|   +------------------------------------+              +--------------------------------------+   |
|   | OpenCV Frame Ingestion Engine      |   -------->  | YOLOv8x Deep Neural Detector         |   |
|   | - 1080p @ 30 FPS / 4K @ 24 FPS     |              | - Real-time Person Class Inference   |   |
|   | - Hardware Accelerated Decoding    |              | - High-Confidence Bounding Boxes     |   |
|   +------------------------------------+              +------------------+-------------------+   |
|                                                                          |                       |
|                                                                          v                       |
|   +------------------------------------+              +--------------------------------------+   |
|   | Flow Analytics & Terminal Density  |              | DeepSORT Multi-Object Tracker        |   |
|   | - Hourly Ingress / Egress Rates    |   <--------  | - Persistent Track IDs (PAX-EN/EX)   |   |
|   | - Instant Net Occupancy Count      |              | - Velocity Vectors & Occlusion Logic |   |
|   | - Surge Alerting (Optimal/Surge)   |              | - 60fps Video Overlay Canvas Sync    |   |
|   +------------------------------------+              +--------------------------------------+   |
+--------------------------------------------------------------------------------------------------+
```

- **Dual-Feed Camera Telemetry**:
  - **`CAM-01-ENTRY`**: Gate 01 · Departure Concourse Entry (DEL T3 Forecourt North) — 1080p @ 30 FPS.
  - **`CAM-04-EXIT`**: Gate 04 · Arrivals Landside Exit (DEL T3 Arrivals Concourse - Exit B) — 4K @ 24 FPS.
- **YOLOv8x Neural Object Detection**:
  - Employs state-of-the-art YOLOv8x weights optimized for pedestrian detection in dense, cluttered terminal environments.
  - Confidence scoring per detected passenger ranges between `0.90` and `0.98`.
- **DeepSORT Multi-Object Tracking (MOT)**:
  - Assigns persistent, mathematically tracked IDs (`YOLO·PAX-EN-01` through `08`, `YOLO·PAX-EX-01` through `08`).
  - Mitigates double-counting caused by temporary passenger occlusions, baggage trolley crossings, and structural pillars.
- **60fps Liquid-Smooth Canvas Video Overlay**:
  - Overlays moving bounding boxes, tracking labels, confidence chips, and velocity vector arrows directly over live streaming video feeds.
  - Interactive operator toggles: switch YOLO Bounding Boxes ON/OFF, toggle Flow Vectors ON/OFF, and inspect individual pedestrian trajectories.
- **Bi-Directional Net Terminal Density & Flow Rate**:
  - Instantaneous ingress flow rate (`entering_flow_hr`) and egress flow rate (`exiting_flow_hr`).
  - Computes net passengers physically inside the terminal relative to the 9,500 maximum terminal capacity.
  - Dynamic density classification: `Optimal` (< 5,500 pax), `Moderate Surge` (5,500–7,800 pax), and `High Density` (> 7,800 pax).
  - 12-hour hourly comparative timeline graphing ingress vs. egress curves.
  - Sub-15ms video processing inference latency.

---

### 5. Enterprise Identity, Google OAuth 2.0 & Multi-Channel 2FA
Located in `backend/auth.py` and `frontend/src/components/auth/GoogleAuthButton.js`.

- **Google Identity Services (GIS) Single Sign-On (SSO)**:
  - Supports Google One-Tap and branded GIS button authentication.
  - Secure backend token verification via Google's OAuth2 endpoints (`https://oauth2.googleapis.com/tokeninfo?id_token=...`).
  - Automatically provisions new passenger accounts, links Google unique subject identifiers (`sub`), and issues signed HS256 JWT bearer tokens.
- **Multi-Channel Two-Factor Authentication (2FA)**:
  - One-Time Password (OTP) verification supported across **Email** (Gmail SMTP / Resend / Brevo), **SMS** (Twilio), and **WhatsApp Business API**.
  - Rate-limited generation with cryptographic expiration (10 minutes) and automated lockout safeguards against brute-force guessing.
- **5-Tier Role-Based Access Control (RBAC)**:
  - `admin`: Complete cluster provisioning, user governance, and infrastructure configuration.
  - `ops_manager`: Full operational command console, staffing overrides, flight schedule delay management.
  - `security_lead`: Checkpoint throughput, CISF screening lane configurations, SHA density monitoring.
  - `baggage_ops`: Carousel sizing allocations, belt overrides, baggage delivery tracking.
  - `passenger`: Personalized flight dashboard, baggage tracking, journey navigation.

---

### 6. Advanced Safety, Emergency SOS & Anti-Phishing Suite
Located in `backend/email_service.py` and `backend/server.py`.

- **Heuristic Anti-Phishing HTML Email Validator**:
  - All automated transactional emails (OTP, flight delay alerts, gate change advisories) pass through an internal security filter before transmission:
    - **Credential Harvesting Prevention**: Automatically rejects templates containing suspicious prompts (e.g., *"enter your password"*, *"verify your secret"*).
    - **Form Tag Prohibition**: Strictly blocks any `<form>`, `<input>`, or `<select>` tags in email bodies.
    - **Link Verification**: Enforces absolute `https://` URIs and rejects URL shorteners (`bit.ly`, `tinyurl`) and raw IP addresses.
    - **Deceptive Anchor Text & Homograph Protection**: Validates that anchor text matching domain patterns (`site.com`) corresponds to the actual link destination host.
- **Emergency SOS & Operational Broadcasts**:
  - Real-time emergency broadcast pipeline enabling security leads to trigger terminal-wide alerts, gate holds, or evacuation advisories via WebSockets.
- **Cryptographic Data Protection at Rest**:
  - Sensitive passenger phone numbers and email tokens are encrypted using **Fernet symmetric encryption** (`cryptography.fernet`).
  - Passwords hashed using industry-standard **bcrypt** (12 work factor salt rounds).
  - API rate-limiting enforced via **SlowAPI** with IP key extraction.

---

### 7. Door-to-Gate Passenger Journey & FIDS Telemetry
Located in `backend/maps_service.py` and `frontend/src/components/passenger/`.

- **Intelligent Door-to-Gate Planner**:
  - Solves the multi-modal journey timeline:
    $$\text{Total Duration} = T_{\text{city transit}} (\text{OSRM}) + T_{\text{check-in}} + T_{\text{security}} + T_{\text{concourse walk}} + T_{\text{buffer}}$$
  - Recommends the exact time the passenger must leave their home or hotel to guarantee reaching the gate before boarding closure.
- **Digital Boarding Pass Dossier**:
  - Scannable dynamic barcode generator for gate scanners.
  - Displays boarding group, seat allocation, terminal gate, departure countdown, and cabin baggage limits.
- **Live Flight Information Display System (FIDS)**:
  - Instantaneous search across departures and arrivals.
  - Filter by airline, flight code, status (`Scheduled`, `Boarding`, `Delayed`, `Departed`), and terminal gate.

---

### 8. AI Carousel Sizing & GBR Baggage Retrieval Predictor
Located in `backend/engines.py` and `backend/baggage_model.py`.

- **Aircraft Sizing Classification & Belt Matching**:
  - **Widebody Aircraft** (B777, B787, A350, A380, A330) carrying $\ge 230$ passengers are assigned to **105-meter High-Capacity Belts** (`AC-01`, `AC-07`, `AC-08`, `AC-13`, `AC-14`).
  - **Narrowbody Aircraft** (A320, A321, B737) and regional jets are assigned to **88-meter Standard Belts** (`AC-02`–`AC-06`, `AC-09`–`AC-12`).
  - Computes baggage accumulation coefficients (~1.4 bags/pax international vs. 0.95 domestic) to prevent conveyor pileups.
- **Gradient Boosting Regressor (GBR)**:
  - Predicts P10, P50, and P90 delivery milestones for first-bag and last-bag appearance based on passenger volume, baggage weight, aircraft category, and ground handler historical performance.

---

##  System Architecture & Data Flow

```
                                    +----------------------------------------------------+
                                    |               CLIENT LAYER (React 18)              |
                                    |                                                    |
                                    |  +------------------------+  +------------------+  |
                                    |  | Passenger Web Portal   |  | Ops Command Hub  |  |
                                    |  | - AeroVoice Assistant  |  | - 2D Heatmap     |  |
                                    |  | - Journey / FIDS       |  | - RAG Controller |  |
                                    |  | - Digital Boarding Pass|  | - CCTV Monitor   |  |
                                    |  | - Door-to-Gate Advice  |  | - Carousel Board |  |
                                    |  +------------------------+  +------------------+  |
                                    +-------------------------+--------------------------+
                                                              |
                                                    HTTPS/WSS | (REST API & WebSockets)
                                                              v
                                    +----------------------------------------------------+
                                    |            API GATEWAY & CORS MIDDLEWARE           |
                                    |             SlowAPI Rate Limiter & Guards          |
                                    +-------------------------+--------------------------+
                                                              |
                                                              v
+-------------------------------------------------------------------------------------------------------------------------+
|                                              AEROFLOW CORE ENGINE (FastAPI)                                             |
|                                                                                                                         |
|   +--------------------------+  +--------------------------+  +--------------------------+  +-----------------------+   |
|   | Autonomous RAG Engine    |  | M/M/c Queuing Simulator  |  | Baggage Prediction (GBR) |  | Security & Auth       |   |
|   | - ICAO/CISF SOP Vectorizer| | - Poisson Arrivals       |  | - Gradient Boosting Reg. |  | - Google OAuth 2.0    |   |
|   | - Dynamic Auto-Pilot     |  | - Erlang-C Wait Times    |  | - First/Last Bag P50/P90 |  | - Multi-Channel 2FA   |   |
|   | - Real-Time Action Plan  |  | - Zone Congestion Models |  | - 105m vs 88m Belts      |  | - 5-Tier RBAC & Fernet|   |
|   +--------------------------+  +--------------------------+  +--------------------------+  +-----------------------+   |
|                                                                                                                         |
|   +-----------------------------------------------------------------------------------------------------------------+   |
|   |                               CCTV Computer Vision Engine (OpenCV / YOLOv8x / DeepSORT)                         |   |
|   |                               - 60fps Bounding Box Tracking & Bi-Directional Flow Rates                         |   |
|   +-----------------------------------------------------------------------------------------------------------------+   |
|                                                                                                                         |
|   +-----------------------------------------------------------------------------------------------------------------+   |
|   |                               WebSocket Broadcaster (Real-Time 15-Second Simulation Loop)                       |   |
|   +-----------------------------------------------------------------------------------------------------------------+   |
+-------------------------------------------------------------+-----------------------------------------------------------+
                                                              |
                              +-------------------------------+-------------------------------+
                              |                                                               |
                              v                                                               v
             +----------------------------------+                            +----------------------------------+
             |    Async MongoDB (Motor Driver)  |                            |        External Cloud APIs       |
             | - Rolling 7-Day Flight Schedules |                            | - Google OAuth 2.0 Identity      |
             | - Checkpoint & Terminal Zones    |                            | - OpenStreetMap / OSRM Routing   |
             | - Baggage Reclaim Telemetry      |                            | - Resend / Gmail SMTP Email      |
             | - User Profiles & RAG Audit Logs |                            | - Twilio SMS & WhatsApp Business |
             +----------------------------------+                            +----------------------------------+
```

---

##  Mathematical & Machine Learning Foundations

### 1. Terminal Queueing Simulation ($M/M/c$ Model)
Passenger arrivals at each checkpoint zone $z$ follow a time-varying non-homogeneous Poisson process:

$$\lambda_z(t) = \sum_{f \in \text{Flights}} P_f \cdot \mathcal{N}\left(t \mid \mu_f, \sigma_f^2\right)$$

Where:
- $P_f$ is total flight passenger volume.
- $\mathcal{N}(t \mid \mu_f, \sigma_f^2)$ is the arrival distribution centered at arrival offset $\mu_f$ with variance $\sigma_f^2$.

The expected wait time $W_q$ with $c$ active screening counters and mean service rate $\mu$ per counter is calculated via the Erlang-C formula:

$$P_{\text{wait}} = \frac{\frac{(c \rho)^c}{c! (1 - \rho)}}{\sum_{k=0}^{c-1}\frac{(c \rho)^k}{k!} + \frac{(c \rho)^c}{c! (1 - \rho)}}, \quad W_q = \frac{P_{\text{wait}}}{c \mu - \lambda}$$

Where $\rho = \frac{\lambda}{c \mu} < 1$ represents server utilization.

### 2. Gradient Boosting Baggage Delivery Model
First-bag ($T_{\text{first}}$) and last-bag ($T_{\text{last}}$) delivery times are predicted using trained Gradient Boosting Regressor ensembles:

$$\hat{T}_{\text{first}}, \hat{T}_{\text{last}} = f_{\text{GBR}}\Big(\text{Passengers}, \text{BaggageWeightKg}, \text{IsInternational}, \text{HourOfDay}, \sin(\text{Hour}), \cos(\text{Hour}), \text{GroundHandlerTier}\Big)$$

### 3. Conveyor Accumulation Dynamics
The instantaneous baggage count remaining on reclaim carousel $c$ at minute $m$ following first-bag delivery is modeled by empirical passenger retrieval curves:

$$\text{BagsOnBelt}(m) = \text{TotalBags} \times \left(1 - \frac{\text{PctRetrieved}(m)}{100}\right)$$

---

##  Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `18.2.0` | High-performance reactive component architecture |
| **Styling & Design** | Tailwind CSS | `3.3.0` | Modern responsive dark/light glassmorphic UI |
| **Animation & Motion** | Framer Motion | `11.0.0` | Fluid state transitions, drawers, and modal animations |
| **Voice Dictation** | Web Speech API | Native Browser | Bilingual English/Hindi/Hinglish speech recognition (`en-IN`) |
| **Voice Synthesis** | SpeechSynthesis API | Native Browser | Real-time auditory responses in Hindi and English |
| **Spatial Canvas** | SVG / Canvas API | Native Browser | High-fidelity interactive 2D terminal floorplan & CCTV overlays |
| **Backend Framework** | FastAPI | `0.110.0` | High-throughput asynchronous Python REST API |
| **ASGI Web Server** | Uvicorn | `0.28.0` | Event-loop async concurrency server |
| **Tactile AI / RAG** | Scikit-Learn / NumPy | `1.4.0` | TF-IDF n-gram vectorization & Cosine Similarity search |
| **Computer Vision** | OpenCV (`cv2`) | `4.9.0` | Video frame extraction, video streaming, and metadata decoding |
| **Object Detection** | YOLOv8x | Latest | Neural real-time human detection and spatial bounding box extraction |
| **Object Tracking** | DeepSORT | Latest | Persistent multi-object pedestrian tracking across camera streams |
| **Database** | MongoDB | `7.0` | Scalable document store for flights, zones, and audit logs |
| **Async DB Driver** | Motor | `3.3.1` | Non-blocking async MongoDB client for Python |
| **Authentication** | Google Identity Services | OAuth 2.0 | Google One-Tap & branded SSO button integration |
| **Security & 2FA** | PyJWT / bcrypt / Fernet | Latest | HS256 tokens, salted password hashing, symmetric data encryption |
| **Rate Limiting** | SlowAPI | `0.1.9` | In-memory IP rate limiting and endpoint abuse protection |
| **Transit Routing** | OSRM / OpenStreetMap | Public API | Origin-to-terminal driving transit duration matrices |
| **Communications** | Resend / Twilio / Brevo | REST APIs | Multi-channel OTPs and emergency operational alerts |

---

##  Repository Directory Structure

```
AeroFlow/
├── backend/                         # FastAPI core backend application
│   ├── api.py                       # REST API router endpoints (RAG, CCTV, FIDS, Baggage)
│   ├── auth.py                      # Google OAuth 2.0, RBAC, JWT, Fernet encryption, 2FA
│   ├── rag_engine.py                # Autonomous RAG Auto-Pilot & SOP semantic vector retriever
│   ├── cctv_service.py              # YOLOv8x detection & DeepSORT video stream analytics
│   ├── engines.py                   # Poisson queueing simulation & AI carousel sizing logic
│   ├── server.py                    # Server lifecycle, WebSocket live broadcaster, CORS setup
│   ├── database.py                  # Motor async MongoDB connector & indices
│   ├── baggage_model.py             # Gradient Boosting Regressor (GBR) model loader
│   ├── maps_service.py              # OpenStreetMap & OSRM transit route solver
│   ├── email_service.py             # Anti-phishing email validator & multi-provider OTP engine
│   ├── sms_service.py               # SMS communication handler (Twilio)
│   ├── whatsapp_service.py          # WhatsApp Business API integration
│   ├── seed_from_master.py          # Rolling 7-day flight schedule synthesizer
│   ├── data/                        # Sample CCTV footage for real-time video inference
│   │   ├── entry.mp4                # Departure concourse entry surveillance clip
│   │   └── exit.mp4                 # Arrivals landside exit surveillance clip
│   ├── tests/                       # Comprehensive pytest automation suite
│   │   ├── test_cctv_flow.py        # CCTV stats and video stream test coverage
│   │   └── ...                      # Additional engine and API test suites
│   ├── Dockerfile                   # Multi-worker production backend container
│   └── requirements.txt             # Python backend dependencies
├── frontend/                        # React 18 single-page application
│   ├── public/                      # Static assets, manifests, icons
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/                # GoogleAuthButton & 2FA verification modals
│   │   │   ├── ops/                 # Staff Ops: CctvFlowMonitor, TerminalSpatialHeatmap,
│   │   │   │                        # RagAutomationController, CarouselAllocationBoard
│   │   │   ├── passenger/           # Passenger: AeroVoiceAssistant, Timeline, BoardingPass,
│   │   │   │                        # FidsBoard, TimeRecommendationCard, TerminalJourneyStory
│   │   │   ├── layout/              # Navbar, CommandMenu, Footer, ThemeToggle
│   │   │   └── ui/                  # Accessible UI primitives (Radix UI / Tailwind)
│   │   ├── pages/                   # Application routes: PassengerPortal, OpsConsole, Auth
│   │   ├── context/                 # AuthContext, ThemeContext, FlightDataContext
│   │   ├── lib/                     # Axios API client, formatting utilities, audio helpers
│   │   └── App.js                   # Application root router & provider trees
│   ├── nginx.conf                   # Alpine Nginx SPA routing & reverse proxy
│   ├── Dockerfile                   # Multi-stage production container build
│   └── package.json                 # Frontend dependencies & Craco build scripts
├── k8s/                             # Production Kubernetes deployment manifests
│   └── aeroflow.yaml                # Deployments, StatefulSets, HPA (3-12 pods), Ingress
├── docker-compose.yml               # Multi-container orchestration (Mongo + API + Web)
├── DOCKER_K8S_GUIDE.md              # Containerization and Kubernetes runbook
├── SETUP.md                         # Detailed developer onboarding instructions
├── .gitignore                       # Master secrets and build exclusion rules
└── README.md                        # Master repository documentation
```

---

##  Quick Start & Local Setup

### Option 1: Docker Compose (One-Click)
Spins up MongoDB, the FastAPI backend, and the React frontend on an isolated bridge network:

```bash
docker compose up --build -d
```
- **Passenger & Ops Web Portal**: [http://localhost:3000](http://localhost:3000)
- **Interactive Backend API Docs**: [http://localhost:8001/docs](http://localhost:8001/docs)

---

### Option 2: Native Development Setup

#### Prerequisites
- **Node.js**: `>= 18.0.0`
- **Python**: `>= 3.11`
- **MongoDB**: `>= 6.0` (Running locally on port `27017` or MongoDB Atlas URI)

#### 1. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env

# Seed master flight schedules and airport terminal topology
python seed_from_master.py

# Start FastAPI development server with auto-reload
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Start React development server
npm start
```
The application will launch automatically at [http://localhost:3000](http://localhost:3000).

> 📖 For comprehensive environment variable definitions and advanced configurations, see [**SETUP.md**](SETUP.md).

---

##  Comprehensive API Reference

### 1. Autonomous RAG & Auto-Pilot Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/rag/status` | Staff | Returns RAG mode (`manual` or `autonomous`), active actions, and status |
| `POST` | `/api/rag/toggle-mode` | Staff | Toggles between Manual Review and Autonomous Auto-Pilot mode |
| `POST` | `/api/rag/query` | Staff | Submits free-text operational query for semantic SOP retrieval |
| `POST` | `/api/rag/evaluate` | Staff | Triggers immediate terminal-wide congestion and baggage evaluation |
| `POST` | `/api/rag/apply-action` | Staff | Manually approves and applies a staged RAG action recommendation |
| `GET` | `/api/rag/audit-log` | Staff | Retrieves the immutable chronological RAG execution history |

### 2. CCTV Computer Vision & Video Analytics
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/cctv/stats` | Staff / Public | Real-time CCTV metrics, camera statuses, instant counts, and flow timeline |
| `GET` | `/api/cctv/feed/{camera_type}` | Public | Stream live MP4 camera feed (`entry` or `exit`) with byte-range support |

### 3. Authentication & Identity Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/google` | Public | Authenticates Google Identity credential token & issues JWT |
| `POST` | `/api/auth/login` | Public | Validates email/password credentials and issues 2FA OTP |
| `POST` | `/api/auth/verify-otp` | Public | Verifies One-Time Password and issues signed JWT bearer token |
| `POST` | `/api/auth/register` | Public | Registers a new passenger account and sends verification OTP |
| `GET` | `/api/auth/me` | Authenticated | Returns currently authenticated user profile and assigned roles |

### 4. Flight Telemetry & Passenger Journey
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/fids` | Public | Live Flight Information Display System schedule with search/filters |
| `GET` | `/api/journey/departure/{flight_num}` | Public | Calculates complete door-to-gate milestones, transit, and leave-home time |
| `GET` | `/api/journey/arrival/{flight_num}` | Public | Baggage reclaim timeline, belt tracking, and arrival milestones |
| `POST` | `/api/flights/{id}/delay` | Staff | Injects an operational flight schedule delay and notifies passengers |

### 5. Terminal Congestion & Baggage Reclaim
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/congestion/zones` | Public | Real-time passenger queue counts, densities, and Erlang-C wait times |
| `GET` | `/api/baggage/assignments` | Staff | Live carousel allocations with AI aircraft sizing classifications |
| `GET` | `/api/baggage/assignments/{id}/ai-recommendation` | Staff | Returns AI sizing rationale and recommended belt for a flight |
| `POST` | `/api/baggage/assignments/{id}/reassign` | Staff | Reassigns a flight to a specified target carousel belt |
| `WS` | `/api/ws/live` | Public | Full-duplex WebSocket operations broadcast (15-second tick) |

---

##  Security Hardening & Privacy

AeroFlow adheres to enterprise defense-in-depth security standards:
- **Zero-Secret Exposure Policy**: No API keys, passwords, or database credentials are committed to version control. All secrets are loaded exclusively via environment variables and audited regularly.
- **Anti-Phishing Email Engine**: Every outgoing transactional email is filtered against credential-harvesting phrases, unauthorized form tags, URL shorteners, and deceptive anchor text.
- **Fernet Database Encryption**: Personal identifiable information (contact numbers and verification tokens) is symmetrically encrypted at rest with Fernet (`cryptography.fernet`).
- **Dynamic CORS Middleware**: Origin validation strictly permits whitelisted production domains and local development environments with secure credential forwarding.
- **Brute-Force & Denial-of-Service Defense**: Endpoints are rate-limited via SlowAPI, and repeated failed 2FA verification attempts trigger automatic temporary lockouts.

---

##  Automated Testing & Quality Verification

AeroFlow includes an automated testing suite covering queuing theory mathematics, carousel sizing algorithms, anti-phishing filters, RAG vector retrieval, computer vision CCTV streams, and authentication:

```bash
# Run backend test suite
cd backend
python -m pytest tests/ -v

# Run frontend production build verification
cd frontend
npm run build
```

---

