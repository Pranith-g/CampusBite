// The screen students watch while they wait. Big numbers, nothing to click.
const PREP_TILES = 12;

export default function StudentBoard({ state }) {
  const { kitchen, shelf } = state;
  const calling = shelf.orders[0];
  const full = kitchen.count === kitchen.capacity;
  const shown = kitchen.count > PREP_TILES ? PREP_TILES - 1 : kitchen.count;

  return (
    <div className="board">
      <div className={`calling ${calling ? '' : 'idle'}`} aria-live="polite">
        <h2>
          {calling ? `${calling.name}, please collect` : 'No orders ready yet'}
          <span>{calling ? `Token ${calling.token} is ready at the counter` : 'Watch for your token number here'}</span>
        </h2>
        <div className="t cond num">{calling ? calling.token : '—'}</div>
      </div>

      <div className="cols2">
        <div className="panel">
          <h3>Preparing <span className={`num ${full ? 'full' : ''}`}>{kitchen.count} {kitchen.count === 1 ? 'order' : 'orders'}{full ? ' · kitchen full' : ''}</span></h3>
          <div className="bignums prep cond num">
            {kitchen.orders.slice(0, shown).map((o, k) => (
              <div key={o.token}>{k === 0 && <small>Next</small>}{o.token}</div>
            ))}
            {kitchen.count > PREP_TILES && <div className="more">+{kitchen.count - shown} more</div>}
            {!kitchen.count && <div className="none">No orders in the kitchen right now.</div>}
          </div>
        </div>
        <div className="panel">
          <h3>Ready to collect <span className="num">{shelf.count} on the shelf</span></h3>
          <div className="bignums ready cond num">
            {shelf.orders.map((o) => <div key={o.token}>{o.token}</div>)}
            {!shelf.count && <div className="none">Nothing ready yet.</div>}
          </div>
        </div>
      </div>

      <div className="board-foot">
        <span>Keep your token slip ready. Tokens are served in order.</span>
        <span className="num">Kitchen {kitchen.count} of {kitchen.capacity}</span>
      </div>
    </div>
  );
}
