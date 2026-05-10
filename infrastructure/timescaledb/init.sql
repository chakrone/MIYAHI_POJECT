-- TimescaleDB Initialization Script for MIYAHI IoT Water Monitoring Platform
-- This script creates all hypertables for time-series data storage.

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ============================================================
-- Hypertable: meter_readings
-- Stores raw telemetry data from IoT water meters
-- ============================================================
CREATE TABLE meter_readings (
    time         TIMESTAMPTZ NOT NULL,
    meter_id     TEXT        NOT NULL,
    flow_rate    DOUBLE PRECISION,
    pressure     DOUBLE PRECISION,
    volume       DOUBLE PRECISION,
    temperature  DOUBLE PRECISION,
    status       TEXT DEFAULT 'ok'
);
SELECT create_hypertable('meter_readings', 'time');

-- Index for fast per-meter queries
CREATE INDEX idx_meter_readings_meter_id ON meter_readings (meter_id, time DESC);

-- ============================================================
-- Hypertable: anomaly_flags
-- Stores detected anomalies from the anomaly detection service
-- ============================================================
CREATE TABLE anomaly_flags (
    time         TIMESTAMPTZ NOT NULL,
    meter_id     TEXT        NOT NULL,
    anomaly_type TEXT,
    severity     TEXT,
    score        DOUBLE PRECISION,
    description  TEXT
);
SELECT create_hypertable('anomaly_flags', 'time');

CREATE INDEX idx_anomaly_flags_meter_id ON anomaly_flags (meter_id, time DESC);

-- ============================================================
-- Hypertable: forecasts
-- Stores consumption predictions from the forecasting service
-- ============================================================
CREATE TABLE forecasts (
    time            TIMESTAMPTZ NOT NULL,
    meter_id        TEXT        NOT NULL,
    predicted_value DOUBLE PRECISION,
    lower_bound     DOUBLE PRECISION,
    upper_bound     DOUBLE PRECISION,
    generated_at    TIMESTAMPTZ
);
SELECT create_hypertable('forecasts', 'time');

CREATE INDEX idx_forecasts_meter_id ON forecasts (meter_id, time DESC);

-- ============================================================
-- Hypertable: weather_data
-- Stores weather observations from OpenWeatherMap
-- ============================================================
CREATE TABLE weather_data (
    time         TIMESTAMPTZ NOT NULL,
    location     TEXT,
    temperature  DOUBLE PRECISION,
    rainfall_mm  DOUBLE PRECISION,
    humidity     DOUBLE PRECISION
);
SELECT create_hypertable('weather_data', 'time');

-- ============================================================
-- Continuous aggregates for common dashboard queries
-- ============================================================

-- Hourly aggregates for consumption charts
CREATE MATERIALIZED VIEW meter_readings_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    meter_id,
    AVG(flow_rate)   AS avg_flow_rate,
    MAX(flow_rate)   AS max_flow_rate,
    MIN(flow_rate)   AS min_flow_rate,
    AVG(pressure)    AS avg_pressure,
    MAX(volume)      AS max_volume,
    MIN(volume)      AS min_volume,
    AVG(temperature) AS avg_temperature
FROM meter_readings
GROUP BY bucket, meter_id
WITH NO DATA;

-- Daily aggregates for billing and history
CREATE MATERIALIZED VIEW meter_readings_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS bucket,
    meter_id,
    AVG(flow_rate)   AS avg_flow_rate,
    MAX(flow_rate)   AS max_flow_rate,
    MIN(flow_rate)   AS min_flow_rate,
    AVG(pressure)    AS avg_pressure,
    MAX(volume)      AS max_volume,
    MIN(volume)      AS min_volume,
    AVG(temperature) AS avg_temperature
FROM meter_readings
GROUP BY bucket, meter_id
WITH NO DATA;

-- Refresh policies: automatically maintain aggregates
SELECT add_continuous_aggregate_policy('meter_readings_hourly',
    start_offset    => INTERVAL '3 hours',
    end_offset      => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

SELECT add_continuous_aggregate_policy('meter_readings_daily',
    start_offset    => INTERVAL '3 days',
    end_offset      => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day');

-- Retention policy: keep raw data for 90 days
SELECT add_retention_policy('meter_readings', INTERVAL '90 days');
