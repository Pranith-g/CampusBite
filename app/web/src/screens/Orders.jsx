import { STATUS, clockTime, itemText, rupees } from '../format.js';

export default function Orders({ orders, error }) {
  return (
    <section aria-labelledby="orders-title">
      <h1 id="orders-title">My orders</h1>
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
                <span>{itemText(o.items)}</span>
                <span className="num">{rupees(o.total)} · ordered {clockTime(o.placedAt)}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
