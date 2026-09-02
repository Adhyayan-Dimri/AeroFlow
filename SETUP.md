# AeroFlow — Development Environment & Deployment Setup

This document outlines instructions for configuring, developing, testing, and deploying the AeroFlow platform across local environments, containerized setups, Kubernetes clusters, and cloud infrastructure.

---

## 1. System Prerequisites

| Component | Minimum Version | Purpose |
| :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` (LTS) | Frontend React development and production build toolchain |
| **Python** | `>= 3.11` | Backend FastAPI engine and mathematical simulation models |
| **MongoDB** | `>= 6.0` | Primary document database |
| **Docker & Docker Compose** | *(Optional)* | Multi-container local execution |
| **Kubernetes & Kubectl** | *(Optional)* | Cluster orchestration and scaling |

---

## 2. Environment Variables

Configuration is externalized through `.env` files located in the `backend/` and `frontend/` subdirectories.

### Backend Configuration (`backend/.env`)

```ini
# Database Connection
MONGO_URL=mongodb://localhost:27017
DB_NAME=aeroflow

# Authentication & Security
JWT_SECRET=your-secure-64-char-hex-secret-key
ENCRYPTION_KEY=dGhpcy1pcy1hLTMyLWJ5dGUtZW5jcnlwdGlvbi1rZXk=

# Initial Administrator Credentials
ADMIN_EMAIL=admin@aeroflow.local
ADMIN_PASSWORD=your_secure_password

# Frontend Origin for CORS
FRONTEND_URL=http://localhost:3000

# Operational Thresholds
MODE_CUTOFF_HOURS=2
EMAIL_FROM_NAME=AeroFlow Operations

# External Integrations (Optional)
EMERGENT_EMAIL_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

### Frontend Configuration (`frontend/.env`)

```ini
# Backend API Base URL
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## 3. Step-by-Step Local Setup

### Step 1: Initialize the Database
Ensure MongoDB is running locally or provide a connection string to MongoDB Atlas:
```bash
# Windows
net start MongoDB

# Linux / macOS
sudo systemctl start mongod
```

### Step 2: Install Backend Dependencies & Seed Flight Data
```bash
cd backend

# Create and activate virtual environment (optional)
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed master flight schedules and airport topologies
python seed_from_master.py
```

### Step 3: Run the Backend Engine
```bash
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```
API documentation is hosted at `http://localhost:8001/docs`.

### Step 4: Install and Run Frontend
```bash
cd ../frontend

# Install dependencies
npm install

# Start local development server
npm start
```
The application interface will be accessible at `http://localhost:3000`.

---

## 4. Container & Cluster Deployment

### Running with Docker Compose
```bash
# Build and start all services in detached mode
docker compose up --build -d

# Inspect live container logs
docker compose logs -f

# Terminate containers
docker compose down
```

### Deploying to Kubernetes
```bash
# Apply complete cluster manifests
kubectl apply -f k8s/aeroflow.yaml

# Verify pod and autoscaler health
kubectl get all -n aeroflow
kubectl get hpa -n aeroflow
```

---

## 5. Automated Testing Suite

Execute the test suite covering queueing models, authentication rules, and carousel allocation algorithms:

```bash
cd backend
python -m pytest tests/ -v
```

---

## 6. Role-Based Access Control (RBAC) Specifications

| Role | Provisioning Method | Assigned Capabilities |
| :--- | :--- | :--- |
| **Admin** | Configured via `ADMIN_EMAIL` and `ADMIN_PASSWORD` | Full administration console, invite code management, zone topology configuration |
| **Ops Manager** | Provisioned via `STAFF_INVITE_CODES` (`ops_manager`) | Real-time congestion adjustments, carousel manual override, flight delay logging |
| **Security Lead** | Provisioned via `STAFF_INVITE_CODES` (`security_lead`) | Security checkpoint telemetry analysis and counter throughput allocation |
| **Baggage Ops** | Provisioned via `STAFF_INVITE_CODES` (`baggage_ops`) | Baggage carousel monitoring, conveyor throughput alerts, offload routing |
| **Passenger** | Self-service registration via `/register` | Flight search, baggage tracker, dynamic journey timeline, user preferences |

---

## 7. Troubleshooting

1. **Port Conflicts**:
   - Backend defaults to port `8001`. If occupied, specify `--port <PORT>` in the uvicorn command and update `REACT_APP_BACKEND_URL` in `frontend/.env`.
2. **Database Connection Refusal**:
   - Verify MongoDB service status and ensure port `27017` is accessible.
3. **CORS Rejections**:
   - Ensure `FRONTEND_URL` in `backend/.env` strictly matches the frontend origin (including protocol and port).
