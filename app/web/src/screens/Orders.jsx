import { STATUS, clockTime, itemText, rupees } from '../format.js';

export default function Orders({ orders, error, wallet = 0, onOrderAgain }) {
  return (
    <section aria-labelledby="orders-title">
      <h1 id="orders-title">My orders</h1>
      {wallet > 0 && (
        <p className="wallet-note num">Canteen wallet: <b>{rupees(wallet)}</b>. Choose it as the way to pay in your cart.</p>
      )}
      {error && <p className="msg" role="alert">{error.message}</p>}
      {!orders && !error && <p className="quiet">Loading your orders…</p>}
      {orders && !orders.length && (
        <p className="empty">No orders yet. <a href="#/menu">Pick something from the menu</a> and it will show up here.</p>
      )}
      <ul className="orders">
        {orders?.map((o) => (
          <li key={o.id}>
            <a href={`#/orders/${o.id}`} className={o.status}>
              <span className="number cond num">{o.number}</span>
              <span className="what">
                <b>{STATUS[o.status]}</b>
                <span>{itemText(o.items.filter((i) => !i.ranOut)) || itemText(o.items)}</span>
                {o.refunds.some((r) => r.method) && (
                  <span className="refunded num">{o.items.filter((i) => i.ranOut).map((i) => i.name).join(', ')} ran out · refunded {rupees(o.refunds.filter((r) => r.method).reduce((s, r) => s + r.amount, 0))}</span>
                )}
                {o.refunds.some((r) => !r.method) && <span className="owed">A dish ran out. Choose where your refund goes.</span>}
                <span className="num">{rupees(o.total)} · ordered {clockTime(o.placedAt)}</span>
              </span>
            </a>
            {onOrderAgain && (
              <button className="btn ghost again" onClick={() => onOrderAgain(o.items)} aria-label={`Order token ${o.number} again`}>
                Order again
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
