# AeroFlow — Complete Developer & Production Setup Guide

This guide provides exhaustive, step-by-step instructions for installing, configuring, developing, testing, and deploying the **AeroFlow** Airport Operations & Passenger Intelligence Platform across all environments.

---

## 📑 Table of Contents
1. [System Prerequisites](#1-system-prerequisites)
2. [Environment Configuration Reference](#2-environment-configuration-reference)
3. [Local Development Setup (Step-by-Step)](#3-local-development-setup-step-by-step)
   - [MongoDB Database Setup](#step-1-mongodb-database-setup)
   - [Backend Service Setup (FastAPI)](#step-2-backend-service-setup-fastapi)
   - [Database Seeding & Master Schedules](#step-3-database-seeding--master-schedules)
   - [Frontend Web Application (React 18)](#step-4-frontend-web-application-react-18)
4. [Docker & Containerized Execution](#4-docker--containerized-execution)
5. [Kubernetes Production Deployment](#5-kubernetes-production-deployment)
6. [Cloud Platform Deployment (Vercel + Render + MongoDB Atlas)](#6-cloud-platform-deployment)
7. [Running the Automated Test Suite](#7-running-the-automated-test-suite)
8. [Role-Based Access Control (RBAC) & Testing Accounts](#8-role-based-access-control-rbac--testing-accounts)
9. [Troubleshooting & FAQ](#9-troubleshooting--faq)

---

## 1. System Prerequisites

Ensure the following runtimes and utilities are installed on your host machine:

| Component | Minimum Version | Recommended | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` | `20.x` LTS | Required for React 18 frontend and npm dependencies |
| **Python** | `>= 3.11.0` | `3.11.x` / `3.12.x` | Required for FastAPI backend and Scikit-learn models |
| **MongoDB** | `>= 6.0.0` | `7.0.x` Community | Local standalone daemon or MongoDB Atlas cloud cluster |
| **Git** | `>= 2.30.0` | Latest | Version control |
| **Docker** | `>= 24.0.0` | Latest | *(Optional)* Multi-container local execution |
| **kubectl** | `>= 1.28.0` | Latest | *(Optional)* Kubernetes cluster deployments |

---

## 2. Environment Configuration Reference

Configuration is managed via `.env` files. **Never commit actual `.env` files to git**. Copy from the provided `.env.example` templates.

### Backend Environment Configuration (`backend/.env`)

Create `backend/.env` with the following variables:

```ini
# ==============================================================================
# DATABASE CONFIGURATION
# ==============================================================================
# Option 1: Local MongoDB Daemon (Default)
MONGO_URL=mongodb://localhost:27017

# Option 2: MongoDB Atlas Cloud Cluster
# MONGO_URL=mongodb+srv://<username>:<password>@cluster0.mongodb.net/aeroflow?retryWrites=true&w=majority

DB_NAME=aeroflow

# ==============================================================================
# AUTHENTICATION & SECURITY
# ==============================================================================
# 64-character secret string for signing JWT bearer tokens
JWT_SECRET=super-secure-random-jwt-secret-key-change-in-production-12345
JWT_ALGORITHM=HS256

# Initial bootstrap Administrator Account (auto-created on startup)
ADMIN_EMAIL=admin@aeroflow.com
ADMIN_PASSWORD=AeroFlowAdmin@2026

# Staff Role Invite Codes (colon-separated format: "ROLE:CODE")
STAFF_INVITE_CODES=ops_manager:OPS2026,security_lead:SEC2026,baggage_ops:BAG2026,ground_staff:STAFF2026

# ==============================================================================
# CORS & NETWORKING
# ==============================================================================
# Allowed frontend origin (must match your frontend URL, no trailing slash)
FRONTEND_URL=http://localhost:3000

# Server execution port (default: 8000)
PORT=8000

# ==============================================================================
# NOTIFICATION SERVICES (OPTIONAL / EXTENSIBLE)
# ==============================================================================
# Resend Email Integration (https://resend.com)
RESEND_API_KEY=
RESEND_FROM_ADDRESS=onboarding@resend.dev
EMAIL_FROM_NAME=AeroFlow Operations

# Gmail SMTP Integration (Alternative)
GMAIL_ENABLED=false
GMAIL_EMAIL=your_email@gmail.com
GMAIL_APP_PASSWORD=your_google_app_password

# Twilio SMS Integration (Optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Meta WhatsApp Cloud API (Optional)
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_API_VERSION=v19.0

# ==============================================================================
# ROUTING & MAPS (FREE OPENSTREETMAP / OSRM)
# ==============================================================================
# Uses public OpenStreetMap OSRM servers. No API keys required.
# Airport reference: Indira Gandhi International Airport, Terminal 3 (28.5562° N, 77.1000° E)
```

---

### Frontend Environment Configuration (`frontend/.env`)

Create `frontend/.env` with the following variables:

```ini
# Base URL for Backend REST API & WebSocket Connections
REACT_APP_BACKEND_URL=http://localhost:8000

# Optional Feature Flags
ENABLE_HEALTH_CHECK=true
```

---

## 3. Local Development Setup (Step-by-Step)

### Step 1: MongoDB Database Setup

#### Option A: Local MongoDB Community Service
- **Windows**: Start MongoDB via Services or run:
  ```powershell
  net start MongoDB
  ```
- **macOS (Homebrew)**:
  ```bash
  brew services start mongodb-community@7.0
  ```
- **Linux (Ubuntu/Debian)**:
  ```bash
  sudo systemctl start mongod
  ```

#### Option B: Standalone Docker MongoDB Container
```bash
docker run -d --name aeroflow-mongo -p 27017:27017 -v aeroflow_data:/data/db mongo:7.0
```

---

### Step 2: Backend Service Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate

   # Windows (PowerShell)
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   ```

3. Install all required dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Create your `.env` configuration:
   ```bash
   cp .env.example .env
   ```

---

### Step 3: Database Seeding & Master Schedules

AeroFlow includes an automated seeding engine that generates rolling flight schedules (Domestic & International), checkpoint topologies, airport carousels, and baggage models.

Run the seed script:
```bash
python seed_from_master.py
```

Expected output:
```text
Loaded 14 carousels into database.
Seeded 4 checkpoint zones (Check-in, Security, Immigration, Gates).
Generated 864 flight schedules for rolling 7-day window.
Computed baggage duration models and initial carousel assignments.
```

---

### Step 4: Run the Backend Engine

Start the FastAPI development server with auto-reloading:
```bash
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Verify backend health:
- **API Status**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### Step 5: Frontend Web Application (React 18)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Create the frontend environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Start the React development server:
   ```bash
   npm start
   ```

The application will automatically launch at [http://localhost:3000](http://localhost:3000).

---

## 4. Docker & Containerized Execution

To spin up the entire multi-tier stack (MongoDB, Backend, and Frontend) in an isolated container network:

```bash
# Build and run all services in the background
docker compose up --build -d
```

### Container Endpoints:
- **Frontend Web Portal**: [http://localhost:3000](http://localhost:3000)
- **Backend API & Swagger**: [http://localhost:8001/docs](http://localhost:8001/docs)
- **MongoDB Instance**: `localhost:27018`

### Manage Docker Containers:
```bash
# View live container logs
docker compose logs -f

# Stop all containers
docker compose down
```

---

## 5. Kubernetes Production Deployment

AeroFlow includes production Kubernetes manifests located in `k8s/aeroflow.yaml`, configured with:
- **MongoDB StatefulSet** with persistent volume claims.
- **Backend Deployment** with Horizontal Pod Autoscaler (3 to 12 replicas).
- **Frontend Nginx Deployment**.
- **Ingress Controller** configuration.

Deploy to your Kubernetes cluster:
```bash
kubectl apply -f k8s/aeroflow.yaml
```

Check cluster status:
```bash
kubectl get pods,svc,hpa -n aeroflow
```

---

## 6. Cloud Platform Deployment

### Deploying Backend to Render
1. Create a **Web Service** on [Render.com](https://render.com).
2. Connect your GitHub repository.
3. Configure settings:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python -m uvicorn server:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variables:
   - `MONGO_URL`: Your MongoDB Atlas connection URI.
   - `FRONTEND_URL`: `https://your-frontend.vercel.app`
   - `JWT_SECRET`: A secure random string.
   - `ADMIN_EMAIL` & `ADMIN_PASSWORD`: Your desired admin credentials.

### Deploying Frontend to Vercel
1. Import your GitHub repository into [Vercel.com](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Framework Preset: `Create React App`.
4. Add Environment Variable:
   - `REACT_APP_BACKEND_URL`: `https://your-backend.onrender.com`
5. Deploy.

---

## 7. Running the Automated Test Suite

AeroFlow contains a full automated testing suite covering queueing models, carousel operational rules, authentication security, and baggage duration predictions.

Run all tests:
```bash
cd backend
python -m pytest tests/ -v
```

Run specific test modules:
```bash
# Test AI Carousel Allocation & Operational Rules
python -m pytest tests/test_carousel_operational_rules.py -v

# Test Future Dates, Analytics & Delay Features
python -m pytest tests/test_future_dates_and_analytics.py -v
```

---

## 8. Role-Based Access Control (RBAC) & Testing Accounts

| Role | Access Level | Description |
| :--- | :--- | :--- |
| **Admin** | Full Cluster Access | Configure airport parameters, manage user accounts, inspect server telemetry |
| **Ops Manager** | Operations Console | Real-time congestion heatmap, flight delays, counter staffing overrides |
| **Security Lead** | Security Checkpoints | Security lane throughput optimization and queue mitigation |
| **Baggage Ops** | Baggage Management | Carousel allocation, AI sizing reassignments, conveyor status |
| **Passenger** | Public Portal | Flight discovery, live baggage tracker, door-to-gate itinerary |

---

## 9. Troubleshooting & FAQ

### Q: Why do I see a CORS error in the browser console?
**A**: Ensure `FRONTEND_URL` in `backend/.env` exactly matches your frontend domain (e.g. `http://localhost:3000` with no trailing slash). In production, ensure both Vercel and custom domains are permitted.

### Q: Why are flights showing "TBD" on baggage carousels?
**A**: By airport operational standard, flights arriving in **> 180 minutes** are marked as "Yet to be decided" (`TBD`) to keep conveyor belts flexible. Flights within 180 minutes are assigned automatically by the AI sizing engine.

### Q: How do I reset or re-seed the flight database?
**A**: Run `python backend/seed_from_master.py` from the project root. It will regenerate a fresh 7-day schedule.
