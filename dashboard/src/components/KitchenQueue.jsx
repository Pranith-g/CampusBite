import { useState } from 'react';
import { IconRotate } from '@tabler/icons-react';
import KitchenDial from './KitchenDial.jsx';
import { itemText, waitText } from '../format.js';

export default function KitchenQueue({ kitchen, shelf, menu, run, pending }) {
  const [tool, setTool] = useState(null);        // null | 'cancel'
  const [token, setToken] = useState('');
  const [toolMsg, setToolMsg] = useState(null);
  const [readyMsg, setReadyMsg] = useState('');
  const [confirmDay, setConfirmDay] = useState(false);

  const full = kitchen.count === kitchen.capacity;
  const shelfFull = shelf.count === shelf.capacity;
  const next = kitchen.orders[0];

  const markReady = async () => {
    const reply = await run('READY');
    setReadyMsg(reply.ok ? '' : reply.message);
  };

  const cancel = async (e) => {
    e.preventDefault();
    if (!token.trim()) return;
    const reply = await run('CANCEL', [token.trim()]);
    setToolMsg(reply);
    if (reply.ok) setToken('');
  };

  const newDay = async () => {
    if (!confirmDay) { setConfirmDay(true); return; }
    setConfirmDay(false);
    await run('NEWDAY');
  };

  return (
    <section className="panel" aria-label="Kitchen queue">
      <div className="panel-h">
        <h2>Kitchen queue</h2>
        <span className={`num ${full ? 'full' : ''}`}>{full ? `${kitchen.capacity} of ${kitchen.capacity} slots · full` : `${kitchen.count} of ${kitchen.capacity} slots`}</span>
      </div>

      <div className="dial-wrap">
        <KitchenDial queue={kitchen} />
        <div className="dial-center">
          <div className={`tok cond num ${next ? '' : 'none'}`}>{next ? `#${next.token}` : 'Empty'}</div>
          <div className="who">
            {next ? `Next up: ${next.name} · ${itemText(next.items, menu)} · ${waitText(next.waitingMin)}` : 'No orders in the kitchen. Issue a token to start.'}
          </div>
          <button className="btn go" type="button" onClick={markReady} disabled={!next || shelfFull || pending}>
            Mark ready
          </button>
          {next && shelfFull && <div className="msg"><span>Pickup shelf full. Hand over the front order first.</span></div>}
          {readyMsg && !shelfFull && <div className="msg"><span>{readyMsg}</span></div>}
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
        {!kitchen.count && <div className="chip more wide">The queue is empty: count is 0.</div>}
      </div>

      {tool === 'cancel' && (
        <form className="tool-form" onSubmit={cancel}>
          <label className="sr" htmlFor="cancel-token">Token to cancel</label>
          <input id="cancel-token" type="text" inputMode="numeric" placeholder="Token number" value={token}
                 onChange={(e) => { setToken(e.target.value.replace(/\D/g, '')); setToolMsg(null); }} autoFocus />
          <button className="btn danger" type="submit" disabled={!token || pending}>Cancel this token</button>
          <button className="btn ghost" type="button" onClick={() => { setTool(null); setToolMsg(null); }}>Close</button>
          {toolMsg && (
            <div className={`msg ${toolMsg.ok ? 'good' : ''}`} role="status">
              <span>{toolMsg.message}</span>
            </div>
          )}
        </form>
      )}

      <div className="tools">
        <button className="btn danger" type="button" onClick={() => setTool(tool === 'cancel' ? null : 'cancel')}>
          Cancel token
        </button>
        <span className="spacer" />
        <button className="btn ghost" type="button" onClick={() => run('RUSH')} disabled={pending}>Rush hour</button>
        <button className="btn ghost" type="button" onClick={() => run('SUMMARY')} disabled={pending}>End of day</button>
        <button className={`btn ghost ${confirmDay ? 'confirm' : ''}`} type="button" onClick={newDay} onBlur={() => setConfirmDay(false)}
                aria-label={confirmDay ? 'Click again to clear everything' : 'Start a new day'} title="Start a new day">
          <IconRotate size={17} aria-hidden="true" />{confirmDay && 'Clear everything?'}
        </button>
      </div>
    </section>
  );
}
