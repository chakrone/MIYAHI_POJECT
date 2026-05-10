import { useState, useEffect } from 'react';
import { Sun, Moon, Wifi } from 'lucide-react';
import KPICards from './components/dashboard/KPICards';
import ConsumptionChart from './components/dashboard/ConsumptionChart';
import ZoneBreakdown from './components/dashboard/ZoneBreakdown';
import ForecastChart from './components/dashboard/ForecastChart';
import AlertFeed from './components/dashboard/AlertFeed';
import WeatherPanel from './components/dashboard/WeatherPanel';
import BillingCard from './components/dashboard/BillingCard';
import TankGauge from './components/dashboard/TankGauge';
import AnomalyPanel from './components/dashboard/AnomalyPanel';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem('miyahi-theme') as 'light' | 'dark') || 'dark'
  );
  const [selectedMeter, setSelectedMeter] = useState('meter_001');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('miyahi-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-header__brand">
          <div className="app-header__logo">M</div>
          <div>
            <div className="app-header__title">MIYAHI</div>
            <div className="app-header__subtitle">IoT Water Intelligence Platform</div>
          </div>
        </div>
        <div className="app-header__actions">
          <select
            className="meter-select"
            value={selectedMeter}
            onChange={e => setSelectedMeter(e.target.value)}
            id="meter-selector"
          >
            {['meter_001', 'meter_002', 'meter_003', 'meter_004', 'meter_005'].map(m => (
              <option key={m} value={m}>{m.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
            ))}
          </select>
          <div className="status-badge">
            <div className="status-badge__dot" />
            <Wifi size={14} />
            <span>Live</span>
          </div>
          <button className="theme-toggle" onClick={toggleTheme} id="theme-toggle" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Row 1: KPI Cards */}
        <KPICards />

        {/* Row 2: Charts */}
        <ConsumptionChart meterId={selectedMeter} />
        <ZoneBreakdown />

        {/* Row 3: Forecast + Alerts */}
        <ForecastChart meterId={selectedMeter} />
        <AlertFeed />

        {/* Row 4: Weather, Billing, Gauge, Anomaly */}
        <WeatherPanel meterId={selectedMeter} />
        <BillingCard />
        <TankGauge value={14.2} max={30} label="Flow Rate" />
        <AnomalyPanel meterId={selectedMeter} />
      </div>
    </div>
  );
}

export default App;
