# MIYAHI — IoT Water Meter Monitoring Platform

A microservices-based IoT platform for real-time water meter monitoring, anomaly detection, consumption forecasting, and billing estimation.

## Architecture

- **Core Services (Java 17 + Spring Boot 3):** API Gateway, Ingestion, Meter Registry, Alerts, Billing
- **Analytics Services (Python 3.11 + FastAPI):** Anomaly Detection, Forecasting, Weather Correlation
- **Infrastructure:** Mosquitto MQTT, TimescaleDB, PostgreSQL, Redis, Grafana
- **Frontend:** React + TypeScript + Vite + Recharts + shadcn/ui

## Quick Start

### Prerequisites
- Docker Desktop (with Compose v2)
- Java 17+ (for local development)
- Python 3.11+ (for local development)
- Node.js 20 LTS (for frontend development)

### 1. Start Infrastructure

```bash
# Copy environment file
cp .env.example .env

# Start infrastructure containers (Mosquitto, TimescaleDB, PostgreSQL, Redis, Grafana)
docker-compose up -d
```

### 2. Start Java Services

```bash
docker-compose --profile java up -d
```

### 3. Start Everything

```bash
docker-compose --profile all up -d
```

### 4. Run the Simulator

```bash
docker-compose --profile simulator up -d
```

## Service Ports

| Service | Port | URL |
|---|---|---|
| MQTT Broker | 1883 | `tcp://localhost:1883` |
| TimescaleDB | 5433 | `localhost:5433` |
| PostgreSQL | 5432 | `localhost:5432` |
| Redis | 6379 | `localhost:6379` |
| Grafana | 3000 | http://localhost:3000 |
| Eureka Dashboard | 8761 | http://localhost:8761 |
| Config Server | 8888 | http://localhost:8888 |
| API Gateway | 8080 | http://localhost:8080 |
| Frontend | 5173 | http://localhost:5173 |

## Project Structure

```
miyahi/
├── docker-compose.yml          # All services orchestration
├── .env                        # Environment variables
├── infrastructure/             # Database init scripts, broker config
│   ├── mosquitto/config/
│   ├── timescaledb/
│   ├── postgres/
│   └── grafana/provisioning/
├── services/
│   ├── eureka-server/          # Service Discovery (Java)
│   ├── config-server/          # Centralized Config (Java)
│   ├── api-gateway/            # API Gateway (Java)
│   ├── ingestion-service/      # MQTT → TimescaleDB (Java)
│   ├── meter-registry-service/ # Device CRUD (Java)
│   ├── alert-service/          # Alerting (Java)
│   ├── billing-service/        # Bill Estimation (Java)
│   ├── anomaly-detection/      # Anomaly Detection (Python)
│   ├── forecasting/            # Forecasting (Python)
│   ├── weather-service/        # Weather Data (Python)
│   └── simulator/              # IoT Data Simulator (Python)
└── frontend/                   # React Dashboard
```

## License

Private — MIYAHI
