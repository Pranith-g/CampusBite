import { useCallback } from 'react';
import { api } from '../api.js';
import { usePolled } from '../hooks.js';
import { PAY_METHODS, STATUS, clockTime, rupees } from '../format.js';
import RefundCard from '../components/RefundCard.jsx';

const queueText = (ahead) => {
  if (!ahead) return 'Yours is next in the kitchen.';
  return `${ahead} ${ahead === 1 ? 'order is' : 'orders are'} ahead of yours.`;
};

export default function OrderStatus({ id, onError, onChosen, onOrderAgain }) {
  const load = useCallback(() => api.order(id), [id]);
  const { data, error, refresh } = usePolled(load, 3000, onError);
  const chosen = async () => { await refresh(); onChosen?.(); };

  if (!data) {
    return (
      <section>
        <p className="quiet" role={error ? 'alert' : undefined}>{error ? error.message : 'Loading your order…'}</p>
        {error && <a className="btn" href="#/orders">See my orders</a>}
      </section>
    );
  }

  const { order } = data;
  const left = Math.ceil((order.etaMin * 60000 - order.ageMs) / 60000);
  const refunded = order.refunds.reduce((sum, r) => sum + r.amount, 0);

  return (
    <section className="status" aria-labelledby="status-title">
      <div className={`ticket ${order.status}`} aria-live="polite">
        <h1 id="status-title">{STATUS[order.status]}</h1>
        <div className="number cond num">{order.number}</div>
        {order.status === 'preparing' && (
          <>
            <p>Your token number. {queueText(order.ahead)}</p>
            <p className="eta num">
              {left > 0 ? `Ready in about ${left} min` : 'Should be ready any moment now'}
              <span>Estimated for {clockTime(order.placedAt + order.etaMin * 60000)}</span>
            </p>
          </>
        )}
        {order.status === 'ready' && <p>Show this token at the counter to collect your food.</p>}
        {order.status === 'collected' && <p>You have collected this order. Enjoy your food.</p>}
        {order.status === 'cancelled' && <p>Sorry, nothing in this order could be made, so it left the kitchen queue.</p>}
      </div>
      {error && <p className="msg" role="alert">{error.message}</p>}
      {order.refunds.map((r) => <RefundCard key={r.id} refund={r} payMethod={order.payMethod} onChosen={chosen} />)}

      <h2>What you ordered</h2>
      <dl className="sum num">
        {order.items.map((i) => (
          <div key={i.id} className={i.ranOut ? 'gone' : undefined}>
            <dt>{i.qty} × {i.name}{i.ranOut && <span className="tag">Ran out</span>}</dt><dd>{rupees(i.price * i.qty)}</dd>
          </div>
        ))}
        {order.discount > 0 && <div className="saved"><dt>Combo saving</dt><dd>−{rupees(order.discount)}</dd></div>}
        <div className="total"><dt>Paid by {PAY_METHODS[order.payMethod]}</dt><dd>{rupees(order.total)}</dd></div>
        {refunded > 0 && <div className="refunded"><dt>Refunded</dt><dd>−{rupees(refunded)}</dd></div>}
      </dl>
      {onOrderAgain && <button className="btn" onClick={() => onOrderAgain(order.items)}>Order this again</button>}
      <a className="btn" href="#/tokens">See the token board</a>
      <a className="btn ghost" href="#/menu">Back to the menu</a>
    </section>
  );
}
