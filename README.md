# AeroFlow — Intelligent Airport Operations & Passenger Experience Platform

AeroFlow is an enterprise-grade airport operations platform that unifies real-time passenger flow analytics, predictive terminal congestion modeling, dynamic baggage carousel allocation, and personalized passenger journey tracking into a distributed, high-throughput system.

---

## 1. System Overview

AeroFlow addresses critical operational bottlenecks in modern airport terminals by processing real-time flight schedules, passenger load projections, and physical checkpoint telemetry to automate resource allocation and passenger guidance.

### Key Capabilities

#### Operations Management Console
- **Predictive Terminal Congestion Modeling**: Continuous load forecasting across terminal checkpoints (Check-in Islands, Security Screening, Immigration, and Boarding Concourses) using Poisson arrival distributions and M/M/c queueing approximations.
- **Dynamic Baggage Carousel Allocation**: Automated scheduling and conveyor belt capacity optimization based on flight category (Domestic vs. International), passenger volume, and aircraft baggage retrieval curves.
- **Automated Incident Dispatch**: Real-time event generation and alert triggers for understaffed checkpoints, conveyor overcrowding, schedule deviations, and SLA breaches.

#### Passenger Journey Experience
- **Flight & Baggage Telemetry**: Live luggage status tracking, carousel assignments, and arrival countdowns.
- **Terminal Journey Routing**: Personalized step-by-step navigation calculating dynamic checkpoint wait times and physical walking distances.
- **Flight Discovery & Subscriptions**: Search engine supporting flight subscriptions, recent history, and real-time status notifications.

#### Security & Access Control
- **Role-Based Access Control (RBAC)**: Strict role boundaries across `admin`, `ops_manager`, `security_lead`, `baggage_ops`, `ground_staff`, and `passenger`.
- **Two-Factor Authentication**: OTP verification with cryptographic token hashing, rate-limiting, and brute-force lockout safeguards.
- **Data Encryption**: Fernet symmetric encryption for sensitive passenger records and operational logs at rest.

---

## 2. Architecture & Data Flow

```
                           +-------------------------------------+
                           |         Client Applications         |
                           |   React 18 SPA (Nginx / Vercel Edge)|
                           +------------------+------------------+
                                              |
                                              | HTTPS / WSS
                                              v
                           +-------------------------------------+
                           |        API Gateway / Ingress        |
                           |    (Reverse Proxy & SSL Offload)    |
                           +------------------+------------------+
                                              |
                                              v
+-----------------------------------------------------------------------------------+
|                               AeroFlow Core Engine                                |
|                              FastAPI / Python 3.11                                |
|                                                                                   |
|  +---------------------------+  +----------------------------+  +--------------+  |
|  | Congestion Engine         |  | Baggage Allocation Engine  |  | WebSocket    |  |
|  | - Poisson Arrival Queues  |  | - Retrieval Curve Analysis |  | Broadcaster  |  |
|  | - Service-Rate Predictor  |  | - Belt Capacity Optimizer  |  | - Live Ticks |  |
|  +---------------------------+  +----------------------------+  +--------------+  |
+------------------------------------------+----------------------------------------+
                                           |
                                           | Async I/O (Motor Driver)
                                           v
                           +-------------------------------------+
                           |          MongoDB Database           |
                           | (Flight Schedules, Checkpoints, RBAC|
                           +-------------------------------------+
```

---

## 3. Technology Stack

| Layer | Technology | Specification / Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | React 18, Tailwind CSS | Single-Page Application (SPA), Radix UI primitives, Recharts, Framer Motion |
| **Backend Core** | Python 3.11, FastAPI | Asynchronous RESTful API, Pydantic v2 validation, SlowAPI rate-limiting |
| **Database** | MongoDB 7.0 | Document store with Motor async driver, index optimization, and persistence |
| **Telemetry & Stream** | WebSockets | Full-duplex persistent connections for live operations broadcasting |
| **Containerization** | Docker | Multi-stage slim images, non-privileged execution, optimized layer caching |
| **Orchestration** | Kubernetes | Deployments, StatefulSets, Horizontal Pod Autoscaler (3–12 Replicas), Ingress |

---

## 4. Getting Started

### Option A: Local Docker Compose (Recommended)
Spins up MongoDB, the FastAPI backend, and the React frontend on an isolated bridge network:

```bash
docker compose up --build -d
```

- **Web Application**: `http://localhost:3000`
- **API Documentation (Swagger UI)**: `http://localhost:8001/docs`
- **Database Instance**: `localhost:27018`

---

### Option B: Kubernetes Deployment
Deploy the full microservice topology to a Kubernetes cluster:

```bash
kubectl apply -f k8s/aeroflow.yaml
```

Verify deployment health:
```bash
kubectl get all -n aeroflow
```

Forward ports for local testing:
```bash
# Frontend UI
kubectl port-forward -n aeroflow svc/aeroflow-frontend-svc 3000:80

# Backend Core API
kubectl port-forward -n aeroflow svc/aeroflow-backend-svc 8001:80
```

---

### Option C: Native Development Environment

1. **Database Setup**: Ensure a MongoDB instance is active on port `27017`.
2. **Backend Engine**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python seed_from_master.py
   python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```
3. **Frontend Application**:
   ```bash
   cd frontend
   npm install
   npm start
   ```

---

## 5. Repository Structure

```
AeroFlow/
├── backend/                  # FastAPI Python application
│   ├── api.py                # REST endpoints (flights, baggage, congestion, alerts)
│   ├── auth.py               # Authentication, RBAC, JWT, and OTP handlers
│   ├── engines.py            # Mathematical simulation and queueing models
│   ├── server.py             # Server lifecycle, WebSocket broadast, simulation loop
│   ├── seed_from_master.py   # Schedule generator and master database seeder
│   ├── Dockerfile            # Container build specification
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React 18 web application
│   ├── src/
│   │   ├── components/       # Domain components (ops, passenger, layout, ui)
│   │   ├── pages/            # Application routes (OpsConsole, PassengerPortal, Auth)
│   │   └── App.js            # Router configuration and state providers
│   ├── nginx.conf            # Nginx reverse proxy and SPA routing rules
│   └── Dockerfile            # Multi-stage production container specification
├── k8s/                      # Production Kubernetes manifests
│   └── aeroflow.yaml         # Complete cluster spec (StatefulSet, HPA, Deployments, Ingress)
├── docker-compose.yml        # Multi-container orchestration definition
├── DOCKER_K8S_GUIDE.md       # Production deployment and infrastructure guide
├── SETUP.md                  # Comprehensive environment configuration instructions
└── vercel.json               # Cloud edge deployment configuration
```

---

## 6. Authentication & Configuration

All system configurations and credentials are managed through environment variables:
- **Administrator Account**: Configured via `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`.
- **Staff Access Codes**: Managed via `STAFF_INVITE_CODES` in `backend/.env`.
- **Security Secret**: Configured via `JWT_SECRET` and `ENCRYPTION_KEY`.

Refer to `.env.example` and [SETUP.md](SETUP.md) for full configuration details.

---

## 7. License
Proprietary software for enterprise airport operations management.
