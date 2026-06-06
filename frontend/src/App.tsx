import { useState, useEffect } from 'react';
import { Droplet, RefreshCw, MapPin } from 'lucide-react';
import SensorHero from './components/dashboard/SensorHero';

import ReadingsTable from './components/dashboard/ReadingsTable';
import MapPanel from './components/dashboard/MapPanel';
import AlertFeed from './components/dashboard/AlertFeed';
import WeatherPanel from './components/dashboard/WeatherPanel';
import BillingCard from './components/dashboard/BillingCard';
import AnomalyPanel from './components/dashboard/AnomalyPanel';
import ChatWidget from './components/dashboard/ChatWidget';
import UsageForecastWeatherChart from './components/dashboard/UsageForecastWeatherChart';
import ConsumptionComparison from './components/dashboard/ConsumptionComparison';
import ZoneBreakdownChart from './components/dashboard/ZoneBreakdownChart';

function App() {
  const [selectedMeter, setSelectedMeter] = useState('meter_001');
  const [lastSync, setLastSync] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setLastSync(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const handleSync = () => setLastSync(new Date());

  const meterLabel = selectedMeter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <>
      {/* ── Dark Green Top Header ── */}
      <header className="top-header">
        <div className="top-header__brand">
          <Droplet size={22} />
          <span>MIYAHI</span>
          <span className="top-header__title">Watermeter Monitoring</span>
        </div>

        <div className="top-header__actions">
          <select
            className="meter-select"
            value={selectedMeter}
            onChange={e => setSelectedMeter(e.target.value)}
            id="meter-selector"
          >
            {['meter_001', 'meter_002', 'meter_003', 'meter_004', 'meter_005'].map(m => (
              <option key={m} value={m}>
                {m.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>

          <button className="sync-btn" onClick={handleSync}>
            <RefreshCw size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            SYNC
          </button>

          <div className="header-info">
            <MapPin size={13} />
            <span>Location: <strong>{meterLabel}</strong></span>
          </div>

          <div className="header-info">
            <span className="status-dot" />
            <span>FM Status: <span className="status-active">Active</span></span>
            <span style={{ opacity: .7 }}>
              ({lastSync.toLocaleDateString()} {lastSync.toLocaleTimeString()})
            </span>
          </div>
        </div>
      </header>

      {/* ── Dashboard Body ── */}
      <main className="dashboard-main">
        {/* Row 1: Consumption Comparison | Live Metrics | Hourly Consumption */}
        <div className="row-1-grid" style={{ marginBottom: 20 }}>
          <ConsumptionComparison meterId={selectedMeter} />
          <SensorHero meterId={selectedMeter} />
        </div>

        {/* Row 2: Usage Forecast + Weather | Zone Breakdown */}
        <div className="forecast-row" style={{ marginBottom: 20 }}>
          <UsageForecastWeatherChart meterId={selectedMeter} />
          <ZoneBreakdownChart meterId={selectedMeter} />
        </div>

        {/* Row 3: Sensor Readings Table | Meter Details */}
        <div className="bottom-section">
          <ReadingsTable meterId={selectedMeter} />
          <MapPanel meterId={selectedMeter} meterLabel={meterLabel} />
        </div>

        {/* Row 4: Alerts, Weather, Billing, Anomaly */}
        <div className="secondary-grid" style={{ marginTop: 20 }}>
          <AlertFeed meterId={selectedMeter} />
          <WeatherPanel meterId={selectedMeter} />
          <BillingCard />
          <AnomalyPanel meterId={selectedMeter} />
        </div>
      </main>

      {/* Floating Chat Assistant */}
      <ChatWidget meterId={selectedMeter} />
    </>
  );
}

export default App;

/* trigger reload */
