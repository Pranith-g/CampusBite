import { useCallback, useRef, useState } from 'react';
import { IconLogout, IconToolsKitchen2 } from '@tabler/icons-react';
import { api } from '../api.js';
import { usePolled, useRoute } from '../hooks.js';
import { itemText, ordinal, rupees, waitedText } from '../format.js';

// The items in an order, with the ones that ran out struck through.
const Items = ({ items }) => items.map((i, k) => (
  <span key={i.id}>{k > 0 && ', '}{i.ranOut ? <s>{i.qty} × {i.name}</s> : `${i.qty} × ${i.name}`}</span>
));
import KitchenDial from './KitchenDial.jsx';
import Stock from './Stock.jsx';

// ink below 60% full, turmeric from 60%, chilli when full
const level = (q) => (q.count === q.capacity ? 'full' : q.count >= q.capacity * 0.6 ? 'busy' : '');

export default function Dashboard({ onSignedOut }) {
  const onError = useCallback((err) => {
    if (err.status === 401) onSignedOut();
  }, [onSignedOut]);
  const { data, error, refresh } = usePolled(api.ownerState, 2000, onError);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [askToken, setAskToken] = useState(null);   // the order whose "Ran out?" list is open
  const stockTab = useRoute() === 'owner/stock';
  const last = useRef({ key: '', at: 0 });

  // Run one action. A repeat within half a second is a double click, so a
  // second order never moves by accident.
  const act = async (key, work) => {
    if (pending || (key === last.current.key && Date.now() - last.current.at < 500)) return;
    last.current = { key, at: Date.now() };
    setPending(true);
    setMessage('');
    setNotice('');
    try {
      await work();
    } catch (err) {
      onError(err);
      setMessage(err.message);
    }
    await refresh();
    setPending(false);
  };

  // A dish in a waiting order cannot be made: refund it to the student.
  const ranOut = (order, item) => act(`out-${order.token}-${item.id}`, async () => {
    const { done } = await api.ranOut(order.token, item.id);
    setAskToken(null);
    setNotice(done.cancelled
      ? `Token ${done.token} cancelled: nothing in it can be made. ${order.name} gets a ${rupees(done.amount)} refund for ${done.dish}.`
      : `${done.dish} ran out for token ${done.token}. ${order.name} gets a ${rupees(done.amount)} refund. ${done.dish} is now out of stock.`);
  });

  const signOut = async () => {
    try {
      await api.ownerSignOut();
      onSignedOut();
    } catch (err) {
      setMessage(err.message);
    }
  };

  if (!data) {
    return <main className="center"><p>{error ? error.message : 'Loading the kitchen…'}</p></main>;
  }

  const { kitchen, shelf, now } = data;
  const next = kitchen.orders[0];
  const full = kitchen.count === kitchen.capacity;
  const shelfFull = shelf.count === shelf.capacity;

  return (
    <>
      <header className="owner-bar">
        <div className="brand"><IconToolsKitchen2 size={20} aria-hidden="true" /> CampusBite</div>
        <nav className="owner-tabs" aria-label="Owner screens">
          <a href="#/owner" aria-current={stockTab ? undefined : 'page'}>Orders</a>
          <a href="#/owner/stock" aria-current={stockTab ? 'page' : undefined}>
            Stock{data.outOfStock > 0 && <span className="num">{data.outOfStock} out</span>}
          </a>
        </nav>
        <div className="readouts">
          <div className={level(kitchen)}>Kitchen<b className="num">{kitchen.count} / {kitchen.capacity}</b></div>
          <div className={level(shelf)}>Shelf<b className="num">{shelf.count} / {shelf.capacity}</b></div>
          <div>Collected today<b className="num">{data.collectedToday}</b></div>
          <div>Paid today<b className="num">{rupees(data.paidToday)}</b></div>
        </div>
        <button className="btn ghost" onClick={signOut}><IconLogout size={18} aria-hidden="true" /> Sign out</button>
      </header>

      {(error || message) && <div className="banner" role="alert"><span>{message || error.message}</span></div>}
      {notice && !message && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button className="btn ghost" onClick={() => setNotice('')}>OK</button>
        </div>
      )}

      {stockTab ? <Stock onError={onError} onSaved={refresh} /> : (
      <main className="counter">
        <section className="panel incoming" aria-label="Incoming orders">
          <div className="panel-h"><h2>Incoming orders</h2><span className="num">{kitchen.count} waiting</span></div>
          <ul className="rows">
            {kitchen.orders.map((o, k) => (
              <li key={o.token} className={k === 0 ? 'front' : ''}>
                <div className="t cond num">{o.token}</div>
                <div>
                  <div className="n">{o.name}</div>
                  <div className="meta"><Items items={o.items} /></div>
                  <div className="meta num">{k === 0 ? 'Next' : `${ordinal(k + 1)} in line`} · {waitedText(now - o.placedAt)}</div>
                </div>
                <button className="btn small" aria-expanded={askToken === o.token} disabled={pending}
                        aria-label={`Something ran out in token ${o.token}`}
                        onClick={() => setAskToken(askToken === o.token ? null : o.token)}>
                  Ran out?
                </button>
                {askToken === o.token && (
                  <div className="ran-out">
                    <p>Which dish can&rsquo;t be made? {o.name} is refunded for it.</p>
                    {o.items.filter((i) => !i.ranOut).map((i) => (
                      <button key={i.id} className="btn" disabled={pending} onClick={() => ranOut(o, i)}>
                        {i.qty} × {i.name} ran out
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
            {!kitchen.count && <li className="none">No orders waiting. New orders from students appear here by themselves.</li>}
          </ul>
        </section>

        <section className="panel dial-panel" aria-label="Kitchen queue">
          <div className="panel-h">
            <h2>Kitchen queue</h2>
            <span className={`num ${full ? 'full' : ''}`}>{kitchen.count} of {kitchen.capacity} slots{full ? ' · full' : ''}</span>
          </div>
          <div className="dial-wrap">
            <KitchenDial queue={kitchen} />
            <div className="dial-center">
              <div className={`tok cond num ${next ? '' : 'none'}`}>{next ? next.token : 'Empty'}</div>
              <div className="who">{next ? `Next up: ${next.name}` : 'Waiting for orders.'}</div>
              <button className="btn go" disabled={!next || shelfFull || pending}
                      onClick={() => act('ready', () => api.markReady(next.token))}>
                Mark ready
              </button>
              {next && shelfFull && <div className="msg"><span>Pickup shelf full. Hand one over first.</span></div>}
            </div>
          </div>

          <div className="strip-h">
            <span>Front to rear</span>
            <span className="num">front <b>{kitchen.front}</b> · rear <b>{kitchen.count ? kitchen.rear : '–'}</b> · count <b>{kitchen.count}</b></span>
          </div>
          <div className="strip">
            {kitchen.orders.slice(0, 6).map((o, k) => (
              <div key={o.token} className={`chip ${k === 0 ? 'front' : ''}`}>
                <div className="ix num">slot {o.slot}</div>
                <div className="t cond num">{o.token}</div>
                <div className="n">{o.name}</div>
              </div>
            ))}
            {kitchen.count > 6 && <div className="chip more num">+{kitchen.count - 6} more</div>}
            {!kitchen.count && <div className="chip more wide">The queue is empty.</div>}
          </div>

          <div className="tools">
            <span>For a demo: fill the kitchen with made-up orders.</span>
            <button className="btn" disabled={full || pending} onClick={() => act('samples', api.sampleOrders)}>Add sample orders</button>
          </div>
        </section>

        <section className="panel" aria-label="Pickup shelf">
          <div className="panel-h">
            <h2>Pickup shelf</h2>
            <span className={`num ${shelfFull ? 'full' : ''}`}>{shelf.count} of {shelf.capacity}{shelfFull ? ' · full' : ''}</span>
          </div>
          <ul className="rows shelf">
            {shelf.orders.map((o) => (
              <li key={o.token}>
                <div className="t cond num">{o.token}</div>
                <div>
                  <div className="n">{o.name}</div>
                  <div className="meta">{itemText(o.items)}</div>
                </div>
                <button className="btn go" disabled={pending} aria-label={`Hand over token ${o.token}`}
                        onClick={() => act(`hand-${o.token}`, () => api.handOver(o.token))}>
                  Hand over
                </button>
              </li>
            ))}
            {!shelf.count && <li className="none">Nothing on the shelf. Orders appear here when you mark them ready.</li>}
          </ul>
        </section>
      </main>
      )}
    </>
  );
}
