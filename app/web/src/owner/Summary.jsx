import { useCallback } from 'react';
import { api } from '../api.js';
import { usePolled } from '../hooks.js';
import { PAY_METHODS, rupees } from '../format.js';

// A ranked list with one-colour bars. The numbers are written out beside each
// bar, so nothing depends on reading the bar length alone.
function Bars({ rows, label, value, title }) {
  const top = Math.max(1, ...rows.map(value));
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={label(r)} title={title(r)}>
          <span className="bar-label">{label(r)}</span>
          <span className="bar-track"><span className="bar" style={{ width: `${(value(r) / top) * 100}%` }} /></span>
          <span className="bar-value num">{title(r)}</span>
        </li>
      ))}
    </ul>
  );
}

const hourText = (h) => `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;

// The owner's Today tab: the end-of-day summary, kept up to date.
export default function Summary({ onError }) {
  const load = useCallback(() => api.ownerSummary(), []);
  const { data, error } = usePolled(load, 5000, onError);

  if (!data) return <main className="today"><p className="quiet">{error ? error.message : 'Adding up today…'}</p></main>;

  const tiles = [
    ['Orders', data.orders],
    ['Takings', rupees(data.takings)],
    ['Refunded', rupees(data.refunds)],
    ['Kept after refunds', rupees(data.net)],
    ['Average order', rupees(data.average)],
  ];
  const statuses = [['Cooking', data.byStatus.preparing], ['On the shelf', data.byStatus.ready], ['Collected', data.byStatus.collected], ['Cancelled', data.byStatus.cancelled]];

  return (
    <main className="today">
      <section className="panel" aria-label="Today in numbers">
        <div className="panel-h"><h2>Today</h2><span>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
        <dl className="tiles-today num">
          {tiles.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        <dl className="today-split num">
          {statuses.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
      </section>

      <section className="panel" aria-labelledby="top-title">
        <div className="panel-h"><h2 id="top-title">Top dishes</h2><span>by plates sold</span></div>
        {data.topDishes.length
          ? <Bars rows={data.topDishes} label={(d) => d.name} value={(d) => d.qty} title={(d) => `${d.qty} · ${rupees(d.revenue)}`} />
          : <p className="none">No dishes sold yet today.</p>}
      </section>

      <section className="panel" aria-labelledby="hours-title">
        <div className="panel-h"><h2 id="hours-title">Orders by hour</h2><span>busy times</span></div>
        {data.hours.length
          ? <Bars rows={data.hours} label={(h) => hourText(h.hour)} value={(h) => h.orders} title={(h) => `${h.orders}`} />
          : <p className="none">No orders yet today.</p>}
      </section>

      <section className="panel" aria-labelledby="money-title">
        <div className="panel-h"><h2 id="money-title">How students paid</h2></div>
        <dl className="today-split num">
          {Object.entries(data.byPayment).map(([m, v]) => <div key={m}><dt>{PAY_METHODS[m]}</dt><dd>{rupees(v)}</dd></div>)}
        </dl>
        <p className="note num">Combo savings given today: {rupees(data.comboSavings)}</p>
        {data.ranOut.length > 0 && (
          <p className="note">Ran out after paying: {data.ranOut.map((d) => `${d.qty} × ${d.name}`).join(', ')}</p>
        )}
      </section>
    </main>
  );
}
