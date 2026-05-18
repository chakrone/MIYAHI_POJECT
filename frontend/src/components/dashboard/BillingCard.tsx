import { useCallback } from 'react';
import { usePolling } from '../../hooks/usePolling';
import { calculateBill } from '../../services/api';

export default function BillingCard() {
  const fetchBill = useCallback(() => calculateBill('Morocco', 25), []);
  const { data: bill, loading } = usePolling(fetchBill, 30000);

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">Estimated Bill</span>
      </div>
      {loading || !bill ? (
        <div className="loading"><div className="loading-spinner" /> Calculating...</div>
      ) : (
        <>
          <div className="billing-total">{bill.total.toFixed(2)}</div>
          <div className="billing-currency">{bill.currency} · {bill.volume_m3} m³</div>
          {bill.breakdown?.map((t, i) => (
            <div className="billing-tier" key={i}>
              <span className="billing-tier__name">{t.tier}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{t.volume_m3}m³ × {t.rate_per_m3}</span>
              <span className="billing-tier__amount">{t.cost.toFixed(2)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
