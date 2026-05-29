/* ── MIYAHI API Client ── */
import axios from 'axios';
import type {
  MeterReading, Meter, Zone, Alert, BillingResult, BillingConfig,
  AnomalyFlag, ForecastResult, WeatherData, WeatherCorrelation,
  ReadingsStats, ConservationGoal
} from '../types';

// All requests go through the API Gateway which proxies to all services
// In Docker, VITE_API_URL is set at build time to point to the gateway
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api' });

/* ── Meters & Zones ── */
export const getMeters = () => api.get<Meter[]>('/meters').then(r => r.data);
export const getZones = () => api.get<Zone[]>('/zones').then(r => r.data);

/* ── Readings ── */
export const getReadingsStats = () => api.get<ReadingsStats>('/readings/stats').then(r => r.data);
export const getReadings = (meterId: string, range = '1h') =>
  api.get<MeterReading[]>(`/readings/${meterId}`, { params: { range } }).then(r => r.data);
export const getLatestReading = (meterId: string) =>
  api.get<MeterReading>(`/readings/${meterId}/latest`).then(r => r.data);

/* ── Alerts ── */
export const getAlerts = () => api.get<Alert[]>('/alerts').then(r => r.data);
export const acknowledgeAlert = (id: string) => api.put(`/alerts/${id}/acknowledge`);

/* ── Billing ── */
export const getBillingConfig = () => api.get<BillingConfig[]>('/billing/config').then(r => r.data);
export const calculateBill = (region: string, volumeM3: number) =>
  api.get<BillingResult>('/billing/calculate', { params: { region, volumeM3 } }).then(r => r.data);

/* ── Conservation Goals ── */
export const getGoals = () => api.get<ConservationGoal[]>('/goals').then(r => r.data);

/* ── Anomaly Detection (Python via Gateway) ── */
export const getAnomalies = (meterId: string, range = '24h') =>
  api.get<AnomalyFlag[]>(`/anomalies/${meterId}`, { params: { range } }).then(r => r.data);
export const getAnomalyStats = () =>
  api.get<{ readings_processed: number; anomalies_detected: number }>('/anomalies/stats').then(r => r.data);

/* ── Forecasting (Python via Gateway) ── */
export const getForecast = (meterId: string, days = 7) =>
  api.get<ForecastResult>(`/forecast/${meterId}`, { params: { days } }).then(r => r.data);

/* ── Weather (Python via Gateway) ── */
export const getCurrentWeather = () =>
  api.get<WeatherData>('/weather/current').then(r => r.data);
export const getWeatherHistory = (hours = 24) =>
  api.get<WeatherData[]>('/weather/history', { params: { hours } }).then(r => r.data);
export const getWeatherCorrelation = (meterId: string, range = '7d') =>
  api.get<WeatherCorrelation>(`/weather/correlation/${meterId}`, { params: { range } }).then(r => r.data);

/* ── Chatbot ── */
export interface ChatMessage { role: 'user' | 'assistant'; content: string; }
export interface ChatRequest { message: string; meter_id?: string; history?: ChatMessage[]; }
export interface ChatResponse { reply: string; sources?: string[]; suggestions?: string[]; }

export const sendChatMessage = (req: ChatRequest) =>
  api.post<ChatResponse>('/chat', req).then(r => r.data);

