import { api } from '../api.js';
import { usePolled } from '../hooks.js';

const TILES = 12;

// The live token board: big numbers, newest ready token called at the top.
export default function Board({ orders, onError }) {
  const { data, error } = usePolled(api.board, 2000, onError);
  if (!data) {
    return <p className="quiet" role={error ? 'alert' : undefined}>{error ? error.message : 'Loading the board…'}</p>;
  }

  const mine = new Set(orders.filter((o) => o.status !== 'collected').map((o) => o.number));
  const calling = data.ready[0];
  const room = data.preparing.length > TILES ? TILES - 1 : TILES;
  // Your own tokens always stay on screen, however long the queue is.
  const shown = data.preparing.filter((n, i) => i < room || mine.has(n));
  const hidden = data.preparing.length - shown.length;
  const yours = (n) => mine.has(n) && <small>Yours</small>;

  return (
    <section aria-label="Token board">
      <div className={`calling ${calling ? '' : 'idle'}`} aria-live="polite">
        <h1>
          {calling ? 'Now ready' : 'No orders ready yet'}
          <span>{calling ? 'Collect it at the counter' : 'Watch for your token number here'}</span>
        </h1>
        {calling && <div className="t cond num">{calling}</div>}
      </div>
      {error && <p className="msg" role="alert">{error.message}</p>}

      <h2>Preparing <span className="num">{data.preparing.length} of {data.capacity} slots</span></h2>
      <ul className="tiles prep cond num">
        {shown.map((n) => (
          <li key={n} className={`${n === data.preparing[0] ? 'next' : ''} ${mine.has(n) ? 'mine' : ''}`}>
            {n}{yours(n)}
          </li>
        ))}
        {hidden > 0 && <li className="more">+{hidden} more</li>}
        {!data.preparing.length && <li className="none">No orders in the kitchen right now.</li>}
      </ul>

      <h2>Ready to collect <span className="num">{data.ready.length} waiting</span></h2>
      <ul className="tiles ready cond num">
        {data.ready.map((n) => <li key={n} className={mine.has(n) ? 'mine' : ''}>{n}{yours(n)}</li>)}
        {!data.ready.length && <li className="none">Nothing ready yet.</li>}
      </ul>
    </section>
  );
}
