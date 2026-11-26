import { useCallback } from 'react';
import { api } from '../api.js';
import { usePolled } from '../hooks.js';
import KitchenDial from '../owner/KitchenDial.jsx';
import DishPhoto from './DishPhoto.jsx';
import { rupees } from '../format.js';

// The kitchen queue as it is right now, for the sign-in page. Uses only the
// public token board and menu: token numbers, never names.
export default function LiveKitchen() {
  const load = useCallback(() => Promise.all([api.board(), api.menu()]), []);
  const { data } = usePolled(load, 4000);
  const [board, menu] = data ?? [];
  const kitchen = board?.kitchen ?? { capacity: 50, count: 0, front: 0, rear: -1, orders: [] };
  const next = kitchen.orders[0];
  const available = menu ? menu.items.filter((m) => !m.soldOut) : [];
  const dishes = menu ? available.length : null;
  // A taste of the menu: the first dish of each section that is in stock.
  const firsts = available.filter((m, k) => available.findIndex((x) => x.section === m.section) === k);
  const picks = [...firsts, ...available.filter((m) => !firsts.includes(m))].slice(0, 4);

  return (
    <section className="live" aria-labelledby="live-title">
      <p className="live-label" id="live-title"><span className="pulse" aria-hidden="true" /> Live from the kitchen</p>
      <div className="dial-wrap">
        <KitchenDial queue={kitchen} />
        <div className="dial-center">
          <div className={`tok cond num ${next ? '' : 'none'}`}>{next ? next.token : 'Free'}</div>
          <div className="who">{next ? 'Being cooked next' : 'No orders waiting'}</div>
        </div>
      </div>
      <dl className="live-stats num">
        <div><dt>Cooking</dt><dd>{board ? board.preparing.length : '–'}</dd></div>
        <div><dt>Ready to collect</dt><dd>{board ? board.ready.length : '–'}</dd></div>
        <div><dt>Dishes today</dt><dd>{dishes ?? '–'}</dd></div>
      </dl>
      {board?.ready.length > 0 && (
        <p className="live-ready num">Collect now: {board.ready.slice(0, 6).map((t) => <b key={t}>{t}</b>)}</p>
      )}
      {picks.length > 0 && (
        <ul className="live-dishes" aria-label="On the menu today">
          {picks.map((m) => (
            <li key={m.id}><DishPhoto photo={m.photo} /><span>{m.name}</span><b className="num">{rupees(m.price)}</b></li>
          ))}
        </ul>
      )}
      <p className="live-note">
        Every order takes the next slot round the circle, and the kitchen cooks from the front.{' '}
        <a href="#/how">How it works</a>
      </p>
    </section>
  );
}
