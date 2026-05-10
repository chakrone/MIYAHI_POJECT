import { Gauge } from 'lucide-react';

interface Props { value: number; max: number; label: string; }

export default function TankGauge({ value, max, label }: Props) {
  const pct = Math.min((value / max) * 100, 100);
  const angle = (pct / 100) * 180;
  const rad = (angle * Math.PI) / 180;
  const r = 70;
  const cx = 80, cy = 80;
  const x = cx + r * Math.cos(Math.PI - rad);
  const y = cy - r * Math.sin(Math.PI - rad);

  const color = pct > 80 ? '#f43f5e' : pct > 50 ? '#f59e0b' : '#14b8a6';

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">{label}</span>
        <div className="card__icon icon-teal"><Gauge size={18} /></div>
      </div>
      <div className="gauge-container">
        <svg width="160" height="100" viewBox="0 0 160 100">
          <path d="M10,80 A70,70 0 0,1 150,80" fill="none" stroke="var(--bg-tertiary)" strokeWidth="12" strokeLinecap="round" />
          <path d={`M10,80 A70,70 0 ${angle > 180 ? 1 : 0},1 ${x},${y}`} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" />
        </svg>
        <div className="gauge-value" style={{ color }}>{pct.toFixed(0)}%</div>
        <div className="gauge-label">{value.toFixed(1)} / {max} L/min</div>
      </div>
    </div>
  );
}
