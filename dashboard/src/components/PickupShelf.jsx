import { itemText, ordinal } from '../format.js';

// The pickup shelf is a FIFO queue too, so only its front order can be handed over.
export default function PickupShelf({ shelf, menu, run, pending }) {
  const full = shelf.count === shelf.capacity;
  return (
    <section className="panel" aria-label="Pickup shelf">
      <div className="panel-h">
        <h2>Pickup shelf</h2>
        <span className={`num ${full ? 'full' : ''}`}>{full ? `${shelf.capacity} of ${shelf.capacity} · full` : `${shelf.count} of ${shelf.capacity}`}</span>
      </div>
      <ul className="shelf">
        {shelf.orders.map((o, k) => (
          <li key={o.token} className={k === 0 ? 'first' : ''}>
            <div className="t cond num">{o.token}</div>
            <div>
              <div className="n">{o.name}</div>
              <div className="meta">{itemText(o.items, menu)}</div>
            </div>
            {k === 0
              ? <button className="btn go" type="button" onClick={() => run('HANDOVER')} disabled={pending}>Hand over</button>
              : <span className="pos num">{ordinal(k + 1)} in line</span>}
          </li>
        ))}
        {!shelf.count && <li className="empty-row">Nothing on the shelf. Orders appear here when the kitchen marks them ready.</li>}
      </ul>
    </section>
  );
}
