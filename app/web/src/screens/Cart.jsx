import { useCallback, useEffect, useState } from 'react';
import { IconAlertCircle } from '@tabler/icons-react';
import DishPhoto from '../components/DishPhoto.jsx';
import Stepper from '../components/Stepper.jsx';
import { api } from '../api.js';
import { go, usePolled } from '../hooks.js';
import { PAY_METHODS, rupees } from '../format.js';

// Why a line cannot be paid for right now, or '' if it can.
const shortage = (line) => {
  if (line.soldOut) return 'Out of stock';
  return line.qty > line.left ? `Only ${line.left} left` : '';
};

export default function Cart({ lines, total, subtotal = total, saving, cart, maxQty, onError, onStale, onPaid, wallet = 0 }) {
  const [method, setMethod] = useState('upi');
  const walletShort = wallet < total;
  // The wallet stops being a choice once the cart costs more than it holds.
  useEffect(() => { if (method === 'wallet' && walletShort) setMethod('upi'); }, [method, walletShort]);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  // Ask the server for the estimated time, and keep it fresh.
  const wanted = JSON.stringify(lines.map(({ id, qty }) => ({ id, qty })));
  const loadQuote = useCallback(
    () => (wanted === '[]' ? Promise.resolve(null) : api.quote(JSON.parse(wanted))),
    [wanted],
  );
  const { data: quote } = usePolled(loadQuote, 10000, onError);
  // An old "payment failed" message no longer applies once the cart, or what
  // is in stock for it, changes.
  const stockNow = lines.map(shortage).join();
  useEffect(() => setError(''), [wanted, stockNow]);

  const pay = async () => {
    setPaying(true);
    setError('');
    try {
      const { order } = await api.placeOrder({
        items: JSON.parse(wanted), payMethod: method, requestId: cart.requestId, expectedTotal: total,
      });
      cart.clear();
      onPaid();
      go(`orders/${order.id}`);
    } catch (err) {
      onError(err);
      if (err.status === 400 || err.status === 409) onStale();
      setError(err.message);
    } finally {
      setPaying(false);
    }
  };

  const full = quote?.kitchenFull;
  const short = lines.some(shortage);

  if (!lines.length) {
    return (
      <section className="cart" aria-labelledby="cart-title">
        <h2 id="cart-title">Your cart</h2>
        <p className="empty">Your cart is empty. Tap Add on anything in the menu.</p>
      </section>
    );
  }

  return (
    <section className="cart" aria-labelledby="cart-title">
      <h2 id="cart-title">Your cart</h2>
      <ul className="items">
        {lines.map((l) => {
          const max = Math.min(maxQty, l.left);
          return (
            <li key={l.id}>
              <DishPhoto photo={l.photo} size="small" />
              <div>
                <div className="name">{l.name}</div>
                <div className="meta num">{l.qty} × {rupees(l.price)} = <b>{rupees(l.price * l.qty)}</b></div>
                {shortage(l) && <div className="short num" role="alert">{shortage(l)}</div>}
              </div>
              {l.soldOut ? (
                <button className="btn" aria-label={`Remove ${l.name}`} disabled={paying}
                        onClick={() => cart.change(l.id, -l.qty, 0)}>Remove</button>
              ) : (
                <Stepper name={l.name} qty={l.qty} max={max} disabled={paying}
                         onChange={(d) => cart.change(l.id, d, max)} />
              )}
            </li>
          );
        })}
      </ul>

      <dl className="sum num">
        {saving?.discount > 0 && (
          <>
            <div><dt>Dishes</dt><dd>{rupees(subtotal)}</dd></div>
            {saving.applied.map((c) => (
              <div key={c.name} className="saved"><dt>{c.name} combo{c.times > 1 ? ` × ${c.times}` : ''}</dt><dd>−{rupees(c.saving)}</dd></div>
            ))}
          </>
        )}
        <div className="total"><dt>Total</dt><dd>{rupees(total)}</dd></div>
        <div><dt>Estimated time</dt><dd>{quote ? `about ${quote.etaMin} min` : 'checking…'}</dd></div>
      </dl>

      <fieldset className="methods" disabled={paying}>
        <legend>Pay with</legend>
        {Object.entries(PAY_METHODS).filter(([id]) => id !== 'wallet' || wallet > 0).map(([id, label]) => (
          <label key={id} className={id === 'wallet' ? 'wallet' : undefined}>
            <input type="radio" name="method" value={id} checked={method === id} onChange={() => setMethod(id)}
                   disabled={id === 'wallet' && walletShort} />
            <span>{id === 'wallet' ? <>Wallet <b className="num">{rupees(wallet)}</b></> : label}</span>
          </label>
        ))}
      </fieldset>
      {wallet > 0 && walletShort && (
        <p className="fine">Your canteen wallet has {rupees(wallet)}, not enough for this order.</p>
      )}

      {error && (
        <p className="msg" role="alert"><IconAlertCircle size={18} aria-hidden="true" /> <span>{error}</span></p>
      )}
      {full && (
        <p className="msg" role="alert"><IconAlertCircle size={18} aria-hidden="true" /> <span>Every kitchen slot is taken. Try again in a few minutes.</span></p>
      )}
      <button className="btn primary pay" disabled={paying || full || short} onClick={pay}>
        {short ? 'Fix your cart to pay' : full ? 'Kitchen is full' : paying ? 'Paying…' : `Pay ${rupees(total)}`}
      </button>
      <p className="fine">This is a demo payment. No real money is taken.</p>
    </section>
  );
}
