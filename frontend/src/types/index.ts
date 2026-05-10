/* ── MIYAHI Dashboard Types ── */

export interface MeterReading {
  time: string;
  meter_id: string;
  flow_rate: number;
  pressure: number;
  volume: number;
  temperature: number;
  status: string;
}

export interface Meter {
  id: string;
  label: string;
  location: string;
  status: string;
  zone: { id: string; name: string; description: string };
}

export interface Zone {
  id: string;
  name: string;
  description: string;
}

export interface Alert {
  id: string;
  meter_id: string;
  type: string;
  severity: string;
  message: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
}

export interface AlertRule {
  id: string;
  meter_id: string;
  metric: string;
  operator: string;
  threshold: number;
  enabled: boolean;
}

export interface BillingTier {
  tier: string;
  volume_m3: number;
  rate_per_m3: number;
  cost: number;
}

export interface BillingResult {
  volume_m3: number;
  total: number;
  currency: string;
  breakdown?: BillingTier[];
  note?: string;
}

export interface BillingConfig {
  id: string;
  region: string;
  tierName: string;
  minM3: number;
  maxM3: number | null;
  pricePerM3: number;
  effectiveFrom: string;
}

export interface AnomalyFlag {
  time: string;
  meter_id: string;
  anomaly_type: string;
  severity: string;
  score: number;
  description: string;
}

export interface ForecastPoint {
  time: string;
  predicted_value: number;
  lower_bound: number;
  upper_bound: number;
  generated_at: string;
}

export interface ForecastResult {
  meter_id: string;
  forecast_hours: number;
  predictions: ForecastPoint[];
}

export interface WeatherData {
  time: string;
  location?: string;
  temperature: number;
  rainfall_mm: number;
  humidity: number;
}

export interface WeatherCorrelation {
  meter_id: string;
  period_days: number;
  data_points: number;
  correlations: Record<string, number>;
  interpretation: Record<string, string>;
}

export interface ReadingsStats {
  messages_processed: number;
  messages_dropped: number;
  active_meters: number;
}

export interface ConservationGoal {
  id: string;
  targetPercent: number;
  baselineMonth: string;
  active: boolean;
}
