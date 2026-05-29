import { useCallback } from 'react';
import { usePolling } from '../../hooks/usePolling';
import { calculateBill, getReadings } from '../../services/api';

export default function BillingCard() {
  // Fetch the last 24h of readings for meter_001 to compute daily consumption
  const fetchReadings = useCallback(
    () => getReadings('meter_001', '24h').catch(() => []),
    []
  );
  const { data: readings } = usePolling(fetchReadings, 2000);

  // Daily consumption = latest volume − earliest volume in the window
  // Falls back to 0 when there is no data yet.
  let consumedM3 = 0;
  if (readings && readings.length >= 2) {
    const sorted = [...readings].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    const earliest = sorted[0].volume;
    const latest = sorted[sorted.length - 1].volume;
    consumedM3 = Math.max(0, latest - earliest);
  }

  const fetchBill = useCallback(
    () => (consumedM3 > 0 ? calculateBill('Morocco', consumedM3) : Promise.resolve(null)),
    [consumedM3]
  );
  const { data: bill, loading } = usePolling(fetchBill, 2000);

  if (consumedM3 === 0) {
    return (
      <div className="card">
        <div className="card__header">
          <span className="card__title">Estimated Daily Bill</span>
        </div>
        <div className="billing-total">0.00</div>
        <div className="billing-currency">MAD · No consumption recorded today</div>
        <div className="empty-state" style={{ marginTop: 8 }}>No consumption data</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">Estimated Daily Bill</span>
      </div>
      {loading || !bill ? (
        <div className="loading"><div className="loading-spinner" /> Calculating...</div>
      ) : (
        <>
          <div className="billing-total">{bill.total.toFixed(2)}</div>
          <div className="billing-currency">{bill.currency} · Today's consumption: {consumedM3.toFixed(3)} m³</div>
          {bill.breakdown?.map((t, i) => (
            <div className="billing-tier" key={i}>
              <span className="billing-tier__name">{t.tier}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{t.volume_m3.toFixed(3)}m³ × {t.rate_per_m3}</span>
              <span className="billing-tier__amount">{t.cost.toFixed(2)}</span>
            </div>
          ))}
          {bill.note && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>{bill.note}</div>
          )}
        </>
      )}
    </div>
  );
}
