# MIYAHI — IoT Water Meter Monitoring Platform

> A production-grade microservices platform for real-time water meter monitoring, anomaly detection, consumption forecasting, and billing estimation.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        React Dashboard (5173)                       │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    ┌───────────▼──────────┐
                    │   API Gateway (8080)  │
                    │   JWT + Rate Limiting │
                    └──────────┬───────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼────────┐    ┌───────▼─────────┐    ┌───────▼──────────┐
│  Java Services │    │ Python Services  │    │    Simulator     │
│  (Spring Boot) │    │   (FastAPI)      │    │    (Python)      │
├────────────────┤    ├─────────────────┤    ├──────────────────┤
│ Ingestion 8081 │    │ Anomaly    8090 │    │ 5 Virtual Meters │
│ Meter Reg 8082 │    │ Forecast   8091 │    │  → MQTT Publish  │
│ Alerts    8083 │    │ Weather    8092 │    └──────────────────┘
│ Billing   8084 │    └─────────────────┘
│ Eureka    8761 │
│ Config    8888 │
└────────────────┘
        │                      │
┌───────▼──────────────────────▼──────────────────────────────────────┐
│                        Data Layer                                    │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│ TimescaleDB  │  PostgreSQL  │    Redis     │      Mosquitto         │
│ (5433)       │  (5432)      │   (6379)     │      MQTT (1883)       │
│ Time-series  │  Relational  │  Streams +   │      IoT messages      │
│  readings    │  Users/Meters│  Pub/Sub     │      Auth enabled      │
└──────────────┴──────────────┴──────────────┴────────────────────────┘
        │
┌───────▼─────────────────────────────────────────────────────────────┐
│                     Observability Stack                               │
├────────────────┬────────────────┬────────────────┬──────────────────┤
│   Prometheus   │     Grafana    │      Loki      │    Promtail      │
│   (9090)       │    (3000)      │    (3100)      │   Log collector  │
│   Metrics      │   Dashboards   │  Log storage   │   Docker logs    │
└────────────────┴────────────────┴────────────────┴──────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **API Gateway** | Spring Cloud Gateway | Routing, CORS, JWT auth |
| **Core Services** | Java 17 + Spring Boot 3 | CRUD, ingestion, alerting, billing |
| **Analytics** | Python 3.11 + FastAPI | Anomaly detection, forecasting, weather |
| **Frontend** | React 18 + TypeScript + Vite | Interactive dashboard |
| **Time-Series DB** | TimescaleDB (PostgreSQL ext.) | Meter readings, anomaly flags, forecasts |
| **Relational DB** | PostgreSQL 16 | Users, meters, zones, alerts, billing |
| **Message Broker** | Mosquitto MQTT | IoT telemetry transport |
| **Event Bus** | Redis Streams + Pub/Sub | Inter-service communication |
| **Monitoring** | Prometheus + Grafana + Loki | Metrics, dashboards, centralized logs |

---

## Quick Start

### Prerequisites

- **Docker Desktop** (with Compose v2)
- **Java 17+** (for local development)
- **Python 3.11+** (for local development)
- **Node.js 20 LTS** (for frontend development)

### 1. Clone & Configure

```bash
git clone <repository-url> miyahi
cd miyahi
cp .env.example .env
# Edit .env with your API keys and passwords (optional — defaults work for dev)
```

### 2. Start Infrastructure

```bash
# Start databases, brokers, and monitoring stack
docker-compose up -d
```

This starts: Mosquitto, TimescaleDB, PostgreSQL, Redis, Grafana, Prometheus, Loki, Promtail.

### 3. Start All Services

```bash
# Start everything — infrastructure + Java + Python services
docker-compose --profile all up -d
```

Or start selectively:

```bash
docker-compose --profile java up -d      # Infrastructure + Java services only
docker-compose --profile python up -d    # Infrastructure + Python services only
```

### 4. Run the Simulator

```bash
docker-compose --profile simulator up -d
```

The simulator starts 5 virtual water meters, each publishing readings every 5 seconds to the MQTT broker.

### 5. Open the Dashboard

- **Frontend:** http://localhost:5173
- **Grafana:** http://localhost:3000 (credentials in `.env`)
- **Eureka:** http://localhost:8761

---

## Service Ports

| Service | Port | URL |
|---|---|---|
| **Mosquitto MQTT** | 1883 | `tcp://localhost:1883` |
| **TimescaleDB** | 5433 | `localhost:5433` |
| **PostgreSQL** | 5432 | `localhost:5432` |
| **Redis** | 6379 | `localhost:6379` |
| **Grafana** | 3000 | http://localhost:3000 |
| **Prometheus** | 9090 | http://localhost:9090 |
| **Loki** | 3100 | http://localhost:3100 |
| **Eureka Dashboard** | 8761 | http://localhost:8761 |
| **Config Server** | 8888 | http://localhost:8888 |
| **API Gateway** | 8080 | http://localhost:8080 |
| **Ingestion Service** | 8081 | http://localhost:8081 |
| **Meter Registry** | 8082 | http://localhost:8082 |
| **Alert Service** | 8083 | http://localhost:8083 |
| **Billing Service** | 8084 | http://localhost:8084 |
| **Anomaly Detection** | 8090 | http://localhost:8090/docs |
| **Forecasting** | 8091 | http://localhost:8091/docs |
| **Weather Service** | 8092 | http://localhost:8092/docs |
| **React Frontend** | 5173 | http://localhost:5173 |

---

## API Documentation

### Python Services (FastAPI — Auto-Generated)

Interactive OpenAPI docs available at `http://localhost:<PORT>/docs`:

- **Anomaly Detection:** http://localhost:8090/docs
- **Forecasting:** http://localhost:8091/docs
- **Weather Service:** http://localhost:8092/docs

### Java Services (Spring Boot Actuator)

Health and metrics endpoints:

- `GET /actuator/health` — Service health status
- `GET /actuator/prometheus` — Prometheus metrics

### REST API Routes (via Gateway at :8080)

| Route | Service | Method | Description |
|---|---|---|---|
| `/api/meters` | Meter Registry | GET/POST | List or register meters |
| `/api/meters/{id}` | Meter Registry | GET/PUT/DELETE | Meter CRUD |
| `/api/zones` | Meter Registry | GET/POST | Zone management |
| `/api/readings/**` | Ingestion | GET | Time-series readings |
| `/api/alerts` | Alert Service | GET | List alerts |
| `/api/alerts/{id}/acknowledge` | Alert Service | PUT | Acknowledge alert |
| `/api/alert-rules` | Alert Service | GET/POST | Alert rule management |
| `/api/billing/{meterId}/estimate` | Billing | GET | Monthly bill projection |
| `/api/billing/{meterId}/history` | Billing | GET | Historical bills |
| `/api/goals` | Billing | GET/POST | Conservation goals |
| `/api/anomalies/{meterId}` | Anomaly Detection | GET | Anomaly flags |
| `/api/forecast/{meterId}` | Forecasting | GET | Consumption forecast |
| `/api/weather/correlation/{meterId}` | Weather | GET | Weather vs usage |

---

## Monitoring & Observability

### Grafana Dashboards

Three pre-provisioned dashboards are auto-loaded on first start:

1. **System Metrics** — Service health status (UP/DOWN), JVM heap memory, CPU usage, live threads, GC pauses, HTTP request rates, response times, HikariCP connection pool stats
2. **IoT Water Pipeline** — Active meters, reading counts, flow rate by meter, pressure, volume, temperature, anomaly event timeline, anomaly breakdown
3. **Logs Explorer** — Live log streams from all services, error/warning filtering, log volume charts, per-service log panels (Ingestion, Anomaly Detection, API Gateway, Mosquitto)

### Prometheus Metrics

All services expose metrics:

- **Java (Micrometer):** `GET /actuator/prometheus` — JVM metrics, HTTP server requests, HikariCP pool, custom counters
- **Python (FastAPI Instrumentator):** `GET /metrics` — HTTP request counts, durations, in-progress requests

### Centralized Logging (Loki)

- **Promtail** automatically collects Docker container logs
- **Loki** stores and indexes logs, queryable via Grafana
- All containers prefixed with `miyahi-` for easy filtering

---

## Security

### MQTT Authentication

Mosquitto is configured with username/password authentication (`allow_anonymous false`):

- **Username:** `miyahi_backend`
- **Password:** Set in `.env` file

The password file (`infrastructure/mosquitto/config/pwfile`) is pre-generated. To update:

```bash
docker exec -it miyahi-mosquitto mosquitto_passwd -b /mosquitto/config/pwfile miyahi_backend <new_password>
docker restart miyahi-mosquitto
```

### API Gateway JWT Authentication

The API Gateway uses JWT Bearer token authentication. Public endpoints (login, register, Eureka) bypass auth.

### Grafana Credentials

Configured via environment variables (default: `admin` / `miyahi_grafana_2026`).

---

## Error Handling

### Dead-Letter Stream

Malformed or unparseable MQTT messages are routed to a Redis `dead-letter-stream` instead of being silently dropped. Each entry includes:

- `original_topic` — The MQTT topic the message arrived on
- `payload` — The raw message payload
- `error_reason` — Why the message failed processing
- `timestamp` — When the failure occurred

Inspect dead-letter entries:

```bash
docker exec miyahi-redis redis-cli XRANGE dead-letter-stream - +
```

### Retry Policies

- **Database writes:** 3 retries with exponential backoff (500ms, 1000ms, 1500ms)
- **Redis publishes:** Non-blocking; failures logged but don't halt the pipeline
- **MQTT reconnection:** Automatic with max 10s delay

---

## Project Structure

```
miyahi/
├── docker-compose.yml              # All services orchestration
├── .env / .env.example             # Environment variables
├── README.md                       # This file
│
├── infrastructure/
│   ├── mosquitto/config/           # MQTT broker config + password file
│   ├── timescaledb/init.sql        # Hypertable creation scripts
│   ├── postgres/init.sql           # Relational schema
│   ├── prometheus/prometheus.yml   # Scrape targets
│   ├── promtail/config.yml         # Log collection config
│   └── grafana/provisioning/
│       ├── datasources/            # TimescaleDB, PostgreSQL, Prometheus, Loki
│       └── dashboards/             # Pre-built JSON dashboards
│
├── services/
│   ├── eureka-server/              # Service Discovery (Java)
│   ├── config-server/              # Centralized Config (Java)
│   ├── api-gateway/                # API Gateway + JWT Auth (Java)
│   ├── ingestion-service/          # MQTT → TimescaleDB + Redis (Java)
│   ├── meter-registry-service/     # Device CRUD (Java)
│   ├── alert-service/              # Alerting + Notifications (Java)
│   ├── billing-service/            # Bill Estimation (Java)
│   ├── anomaly-detection/          # Z-Score + Isolation Forest (Python)
│   ├── forecasting/                # Prophet Forecasting (Python)
│   ├── weather-service/            # Weather Correlation (Python)
│   └── simulator/                  # 5 Virtual IoT Meters (Python)
│
└── frontend/                       # React + TypeScript Dashboard
    └── src/
        ├── components/dashboard/   # 9 dashboard widgets
        ├── services/               # API client layer
        ├── hooks/                  # Custom React hooks
        └── types/                  # TypeScript type definitions
```

---

## Development

### Running Services Locally (without Docker)

**Java services:**
```bash
cd services/<service-name>
mvn spring-boot:run
```

**Python services:**
```bash
cd services/<service-name>
pip install -r requirements.txt
python -m app.main
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Adding a New Simulated Meter

1. Edit `services/simulator/app/config.py`
2. Add a new entry to `METER_PROFILES` with a unique `meter_id`
3. Restart the simulator

### Environment Variables

See `.env.example` for all available configuration options including database passwords, API keys, and Grafana credentials.

---

## License

Private — MIYAHI
