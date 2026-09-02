# AeroFlow — Docker & Kubernetes Deployment Guide

This guide covers container image compilation, multi-container local orchestration via Docker Compose, and scalable Kubernetes cluster deployment with Horizontal Pod Autoscaling (HPA).

---

## 1. Architecture Overview

```
                        +---------------------------------+
                        |      Ingress / Nginx Proxy      |
                        |         (Port 80 / 443)         |
                        +----------------+----------------+
                                         |
                 +-----------------------+-----------------------+
                 |                                               |
                 v                                               v
       +-------------------+                           +-------------------+
       | Frontend (React)  |                           | Backend (FastAPI) |
       | Nginx Alpine      |                           | Python 3.11 Slim  |
       | (Port 80)         |                           | (Port 8001)       |
       +-------------------+                           +---------+---------+
                                                                 |
                                                                 v
                                                       +-------------------+
                                                       | MongoDB (v7.0)    |
                                                       | (Port 27017)      |
                                                       +-------------------+
```

---

## 2. Local Multi-Container Orchestration (Docker Compose)

### Build and Start All Services
```bash
docker compose up --build -d
```

### Inspect Container Status
```bash
docker compose ps
```

All 3 containers should report healthy statuses:
- `aeroflow-frontend` on `http://localhost:3000`
- `aeroflow-backend` on `http://localhost:8001` (API & Swagger docs at `http://localhost:8001/docs`)
- `aeroflow-mongodb` on `localhost:27018`

### Stream Logs
```bash
# View combined logs
docker compose logs -f

# View backend logs specifically
docker compose logs -f backend
```

### Shutdown and Clean Up
```bash
# Stop containers
docker compose down

# Stop containers and wipe database volumes
docker compose down -v
```

---

## 3. Kubernetes Production Deployment

### 1. Build and Tag Container Images

```bash
# Build Backend
docker build -t aeroflow/backend:latest ./backend

# Build Frontend
docker build -t aeroflow/frontend:latest ./frontend
```

---

### 2. Apply Manifests to Cluster

```bash
kubectl apply -f k8s/aeroflow.yaml
```

The manifest provisions:
1. **Namespace**: `aeroflow`
2. **ConfigMap & Secret**: Database URL, JWT secrets, and admin configurations
3. **MongoDB StatefulSet**: 10Gi persistent volume for database storage
4. **Backend Deployment & ClusterIP Service**: 3 baseline replicas with `/health` probes
5. **Horizontal Pod Autoscaler (HPA)**: Automatically scales backend between 3 and 12 pods based on CPU (65%) and Memory (75%) utilization
6. **Frontend Deployment & ClusterIP Service**: 2 replicas serving the React SPA via Nginx
7. **Ingress**: Configured for WebSocket upgrades (`/api/ws/live`) and path routing

---

### 3. Verify Kubernetes Deployment

```bash
# Inspect all resources in namespace
kubectl get all -n aeroflow

# Inspect autoscaler status
kubectl get hpa -n aeroflow

# Tail backend pod logs
kubectl logs -n aeroflow -l app=aeroflow-backend -f
```

---

### 4. Service Access via Port-Forwarding

```bash
# Frontend Web UI (Port 3000)
kubectl port-forward -n aeroflow svc/aeroflow-frontend-svc 3000:80

# Backend Core API (Port 8001)
kubectl port-forward -n aeroflow svc/aeroflow-backend-svc 8001:80
```
