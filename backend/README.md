# AeroFlow — Backend Core Engine & API

The core backend service for the AeroFlow Airport Operations Platform, built with **Python 3.11**, **FastAPI**, **Motor (Async MongoDB)**, and predictive simulation models.

---

## 1. Module Structure

```
backend/
├── api.py                    # RESTful endpoints for flights, baggage, preferences, and zones
├── auth.py                   # JWT authentication, RBAC, password hashing, and OTP services
├── engines.py                # Mathematical models for passenger queues and baggage retrieval
├── server.py                 # FastAPI application lifecycle, WebSockets, background simulation
├── database.py               # Async MongoDB connection proxy and helper utilities
├── baggage_model.py          # Machine learning baggage arrival prediction models
├── seed_from_master.py       # Rolling 7-day flight schedule generation engine
└── Dockerfile                # Production multi-worker container configuration
```

---

## 2. Core Engines & Mathematical Modeling

1. **Queueing & Wait-Time Engine (`engines.py`)**:
   - Computes dynamic arrival curves based on scheduled departures/arrivals, aircraft seat capacities, and check-in cutoff thresholds.
   - Calculates real-time service rates and predicts checkpoint wait times using M/M/c queue approximations.

2. **Baggage Carousel Allocation (`engines.py`)**:
   - Dynamically balances conveyor belt capacity against flight arrival times and international vs. domestic passenger volumes to eliminate terminal bottlenecks.

3. **Real-Time WebSocket Broadcaster (`server.py`)**:
   - Maintains an asynchronous simulation tick every 15 seconds, pushing live telemetry updates to connected ops consoles.

---

## 3. Local Execution

```bash
# Install dependencies
pip install -r requirements.txt

# Seed initial flight data
python seed_from_master.py

# Start the API server
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

---

## 4. Testing

Execute automated unit and integration tests:

```bash
python -m pytest tests/ -v
```
