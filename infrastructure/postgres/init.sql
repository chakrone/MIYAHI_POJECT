-- PostgreSQL Initialization Script for MIYAHI IoT Water Monitoring Platform
-- This script creates all relational tables for users, meters, alerts, billing, etc.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Table: users
-- Platform users who own meters and receive alerts
-- ============================================================
CREATE TABLE users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      TEXT UNIQUE NOT NULL,
    name       TEXT,
    phone      TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Table: zones
-- Logical groupings for meters (Kitchen, Garden, Pool, etc.)
-- ============================================================
CREATE TABLE zones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Table: meters
-- Registered IoT water meters
-- ============================================================
CREATE TABLE meters (
    id        TEXT PRIMARY KEY,
    user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    zone_id   UUID REFERENCES zones(id) ON DELETE SET NULL,
    label     TEXT,
    location  TEXT,
    status    TEXT DEFAULT 'active',
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_meters_user_id ON meters (user_id);
CREATE INDEX idx_meters_zone_id ON meters (zone_id);
CREATE INDEX idx_meters_status ON meters (status);

-- ============================================================
-- Table: alerts
-- Generated alerts from anomaly detection and rule engine
-- ============================================================
CREATE TABLE alerts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meter_id     TEXT REFERENCES meters(id) ON DELETE CASCADE,
    type         TEXT NOT NULL,
    severity     TEXT NOT NULL DEFAULT 'info',
    message      TEXT,
    acknowledged BOOLEAN DEFAULT false,
    created_at   TIMESTAMPTZ DEFAULT now(),
    acknowledged_at TIMESTAMPTZ
);

CREATE INDEX idx_alerts_meter_id ON alerts (meter_id);
CREATE INDEX idx_alerts_severity ON alerts (severity);
CREATE INDEX idx_alerts_acknowledged ON alerts (acknowledged);
CREATE INDEX idx_alerts_created_at ON alerts (created_at DESC);

-- ============================================================
-- Table: alert_rules
-- Configurable threshold rules per meter
-- ============================================================
CREATE TABLE alert_rules (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meter_id  TEXT REFERENCES meters(id) ON DELETE CASCADE,
    metric    TEXT NOT NULL,
    operator  TEXT NOT NULL,
    threshold DOUBLE PRECISION NOT NULL,
    enabled   BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_alert_rules_meter_id ON alert_rules (meter_id);

-- ============================================================
-- Table: billing_config
-- Tiered water pricing configuration per region
-- ============================================================
CREATE TABLE billing_config (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region       TEXT NOT NULL,
    tier_name    TEXT NOT NULL,
    min_m3       DOUBLE PRECISION NOT NULL,
    max_m3       DOUBLE PRECISION,
    price_per_m3 DOUBLE PRECISION NOT NULL,
    effective_from DATE DEFAULT CURRENT_DATE,
    created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Table: billing_history
-- Stored monthly bill calculations
-- ============================================================
CREATE TABLE billing_history (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meter_id     TEXT REFERENCES meters(id) ON DELETE CASCADE,
    month        DATE NOT NULL,
    total_volume DOUBLE PRECISION,
    total_amount DOUBLE PRECISION,
    tier_breakdown JSONB,
    created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_billing_history_meter ON billing_history (meter_id, month DESC);

-- ============================================================
-- Table: conservation_goals
-- User-defined water savings targets
-- ============================================================
CREATE TABLE conservation_goals (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
    target_percent DOUBLE PRECISION NOT NULL,
    baseline_month DATE NOT NULL,
    active         BOOLEAN DEFAULT true,
    created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conservation_goals_user ON conservation_goals (user_id);

-- ============================================================
-- Seed data: Default billing tiers for Morocco (ONEE rates)
-- ============================================================
INSERT INTO billing_config (region, tier_name, min_m3, max_m3, price_per_m3) VALUES
    ('Morocco', 'Tranche 1', 0,    6,    2.54),
    ('Morocco', 'Tranche 2', 6,    12,   5.08),
    ('Morocco', 'Tranche 3', 12,   20,   7.62),
    ('Morocco', 'Tranche 4', 20,   35,   10.98),
    ('Morocco', 'Tranche 5', 35,   NULL, 14.00);

-- ============================================================
-- Seed data: Demo user and meters
-- ============================================================
INSERT INTO users (id, email, name, phone) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'demo@miyahi.ma', 'Demo User', '+212600000000');

INSERT INTO zones (id, user_id, name, description) VALUES
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Kitchen', 'Kitchen water supply'),
    ('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Garden', 'Garden irrigation system'),
    ('b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Bathroom', 'Main bathroom'),
    ('b4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Pool', 'Swimming pool'),
    ('b5eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'General', 'Main water meter');

INSERT INTO meters (id, user_id, zone_id, label, location, status) VALUES
    ('meter_001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b5eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Main Meter', 'Entry point', 'active'),
    ('meter_002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Kitchen Meter', 'Kitchen', 'active'),
    ('meter_003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Garden Meter', 'Garden', 'active'),
    ('meter_004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Bathroom Meter', 'Bathroom', 'active'),
    ('meter_005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Pool Meter', 'Pool area', 'active');
