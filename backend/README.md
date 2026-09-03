# AeroFlow — Backend Core Engine & API Services

The core backend service for the **AeroFlow Airport Operations & Passenger Intelligence Platform**, built with **Python 3.11+**, **FastAPI**, **Motor (Async MongoDB)**, **Scikit-Learn**, and real-time WebSocket telemetry broadcasting.

---

## 🏛 Architecture & Component Layout

```
backend/
├── api.py                    # RESTful endpoints for flights, baggage, congestion, alerts, and AI sizing
├── auth.py                   # JWT security, role-based access control (RBAC), and multi-channel OTP (Email/SMS/WhatsApp)
├── engines.py                # Mathematical simulation models (Poisson arrival curves, M/M/c queues, AI carousel sizing)
├── server.py                 # FastAPI application lifecycle, WebSocket broadast loop, dynamic CORS middleware
├── database.py               # Motor async MongoDB connector, connection pooling, and indexing
├── baggage_model.py          # Machine learning GBR duration prediction model loader & feature extractor
├── maps_service.py           # OSRM & OpenStreetMap geocoding and live transit route calculator
├── email_service.py          # Resend & Gmail SMTP notification dispatch engine
├── sms_service.py            # SMS communication handler (Twilio)
├── whatsapp_service.py       # WhatsApp Business Cloud API communication handler
├── seed_from_master.py       # Rolling 7-day schedule generator and master database seeder
├── requirements.txt          # Python dependency specifications
├── Dockerfile                # Production container specification
└── tests/                    # Automated pytest test suites
```

---

## ⚙️ Core Engines & Algorithms

### 1. Queueing & Congestion Simulation (`engines.py`)
- Simulates passenger arrival waves using non-homogeneous Poisson processes calibrated against flight schedule departure times and seat capacities.
- Evaluates multi-server $M/M/c$ queueing dynamics across terminal checkpoints (Check-in, Security, Immigration, Gates) to calculate predicted wait times ($W_q$) and queue lengths ($L_q$).

### 2. AI Carousel Sizing & Allocation Engine (`engines.py`)
- Analyzes aircraft category (**Wide-Body** vs. **Narrow-Body**), seat capacity, and international vs. domestic luggage ratios.
- Optimally assigns **105-meter high-capacity carousels** (`AC-01`, `AC-07`, `AC-08`, `AC-13`, `AC-14`) to heavy wide-body arrivals and **88-meter standard carousels** to narrow-body flights.
- Provides real-time sizing mismatch detection and 1-click AI reassignment recommendations.

### 3. Gradient Boosting Baggage Predictor (`baggage_model.py`)
- Predicts First Bag and Last Bag delivery times ($P_{10}, P_{50}, P_{90}$) based on passenger load, total baggage weight, hour of arrival, route category, and ground handler historical performance.

### 4. WebSocket Telemetry Broadcaster (`server.py`)
- Runs an asynchronous 15-second simulation background loop pushing live updates to all connected operations consoles and passenger boards.

---

## 🚀 Local Execution

```bash
# 1. Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env

# 4. Seed database
python seed_from_master.py

# 5. Start API server
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

- **API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 🧪 Testing

```bash
python -m pytest tests/ -v
```
