import { useState, useEffect } from 'react';
import { Droplet, RefreshCw, MapPin } from 'lucide-react';
import SensorHero from './components/dashboard/SensorHero';
import VelocityChart from './components/dashboard/VelocityChart';
import FlowChart from './components/dashboard/FlowChart';
import ReadingsTable from './components/dashboard/ReadingsTable';
import MapPanel from './components/dashboard/MapPanel';
import AlertFeed from './components/dashboard/AlertFeed';
import WeatherPanel from './components/dashboard/WeatherPanel';
import BillingCard from './components/dashboard/BillingCard';
import AnomalyPanel from './components/dashboard/AnomalyPanel';
import ChatWidget from './components/dashboard/ChatWidget';

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
        {/* Row 1: Sensor Image + Live Metrics + Cumulative + Consumption Chart */}
        <SensorHero meterId={selectedMeter} />

        {/* Row 2: Velocity & Flow Charts */}
        <div className="dashboard-grid">
          <VelocityChart meterId={selectedMeter} />
          <FlowChart meterId={selectedMeter} />
        </div>

        {/* Row 3: Data Table + Map/Meter Details */}
        <div className="bottom-section">
          <ReadingsTable meterId={selectedMeter} />
          <MapPanel meterId={selectedMeter} meterLabel={meterLabel} />
        </div>

        {/* Row 4: Alerts, Weather, Billing, Anomaly */}
        <div className="secondary-grid" style={{ marginTop: 20 }}>
          <AlertFeed />
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
