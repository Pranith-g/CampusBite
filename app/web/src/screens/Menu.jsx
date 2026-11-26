import { useState } from 'react';
import { IconBarbell, IconPlus, IconStar, IconStarFilled } from '@tabler/icons-react';
import DishPhoto from '../components/DishPhoto.jsx';
import Stepper from '../components/Stepper.jsx';
import { LOW_STOCK, rupees } from '../format.js';

// Dishes with at least this many grams of protein count as high protein.
const HIGH_PROTEIN = 15;
const COMBOS = 'Combos';

function filterText(count, protein, onlyFav) {
  if (onlyFav && protein) return `${count} of your favourites ${count === 1 ? 'has' : 'have'} ${HIGH_PROTEIN} g of protein or more.`;
  if (onlyFav) return count ? `Your ${count} favourite ${count === 1 ? 'dish' : 'dishes'}.` : 'No favourites yet. Tap the star on a dish to keep it here.';
  return `${count} ${count === 1 ? 'dish has' : 'dishes have'} ${HIGH_PROTEIN} g of protein or more.`;
}

export default function Menu({ menu, cart, favourites = [], onFavourite }) {
  const combos = menu.combos ?? [];
  const sections = [...new Set(menu.items.map((m) => m.section)), ...(combos.length ? [COMBOS] : [])];
  const [section, setSection] = useState(sections[0]);
  const [protein, setProtein] = useState(false);   // the High protein filter
  const [onlyFav, setOnlyFav] = useState(false);   // the Favourites filter
  const favs = new Set(favourites);
  const byId = new Map(menu.items.map((m) => [m.id, m]));
  const filtering = protein || onlyFav;
  const shown = filtering
    ? menu.items.filter((m) => (!protein || m.protein >= HIGH_PROTEIN) && (!onlyFav || favs.has(m.id)))
    : menu.items.filter((m) => m.section === section);
  const ahead = Math.ceil(menu.load / menu.cooks);

  // A combo puts each of its dishes in the cart. The saving comes off at checkout.
  const addCombo = (combo) => {
    for (const i of combo.items) cart.change(i.id, i.qty, Math.min(menu.maxQty, byId.get(i.id)?.left ?? 0));
  };

  return (
    <section aria-labelledby="menu-title">
      <h1 id="menu-title">Today&rsquo;s menu</h1>
      <p className="lead">
        {ahead
          ? `Orders already in the kitchen add about ${ahead} min to yours.`
          : 'The kitchen is free right now.'}
      </p>
      <div className="filters">
        <p className="pure"><span className="veg" aria-hidden="true" /> Pure vegetarian canteen</p>
        <div className="chips">
          <button type="button" className="chip" aria-pressed={protein} onClick={() => setProtein(!protein)}>
            <IconBarbell size={18} aria-hidden="true" /> High protein
          </button>
          <button type="button" className="chip" aria-pressed={onlyFav} onClick={() => setOnlyFav(!onlyFav)}>
            <IconStar size={18} aria-hidden="true" /> Favourites
          </button>
        </div>
      </div>
      {filtering ? (
        <p className="filter-note num">
          {filterText(shown.length, protein, onlyFav)}{' '}
          <button type="button" className="link" onClick={() => { setProtein(false); setOnlyFav(false); }}>Show the full menu</button>
        </p>
      ) : (
        <div className="seg" role="group" aria-label="Menu section">
          {sections.map((s) => (
            <button key={s} type="button" aria-pressed={section === s} onClick={() => setSection(s)}>{s}</button>
          ))}
        </div>
      )}

      {!filtering && section === COMBOS ? (
        <>
          <ul className="combos">
            {combos.map((c) => (
              <li key={c.id} className={c.available ? '' : 'out'}>
                <div className="combo-photos" aria-hidden="true">
                  {c.items.map((i) => <DishPhoto key={i.id} photo={i.photo} />)}
                </div>
                <div className="combo-info">
                  <div className="name">{c.name}</div>
                  <div className="meta">{c.items.map((i) => `${i.qty} × ${i.name}`).join(' + ')}</div>
                  <div className="combo-price num">
                    <b>{rupees(c.price)}</b> <s aria-label={`instead of ${rupees(c.full)}`}>{rupees(c.full)}</s>
                    <span className="save">Save {rupees(c.saving)}</span>
                  </div>
                </div>
                {c.available ? (
                  <button className="btn add" aria-label={`Add the ${c.name} combo`} onClick={() => addCombo(c)}>
                    <IconPlus size={18} aria-hidden="true" /> Add combo
                  </button>
                ) : <span className="gone">Not available</span>}
              </li>
            ))}
          </ul>
          <p className="filter-note">The saving comes off at checkout whenever your cart has all the dishes of a combo.</p>
        </>
      ) : (
        <ul className="dishes">
          {shown.map((m) => {
            const q = cart.qty[m.id] || 0;
            const max = Math.min(menu.maxQty, m.left);
            const fav = favs.has(m.id);
            return (
              <li key={m.id} className={`${q ? 'picked' : ''} ${m.soldOut ? 'out' : ''}`}>
                <div className="info">
                  <div className="marks">
                    <span className="veg" aria-hidden="true" />
                    {m.protein >= HIGH_PROTEIN && <span className="hp">High protein</span>}
                    {onFavourite && (
                      <button type="button" className="star" aria-pressed={fav} onClick={() => onFavourite(m.id, !fav)}
                              aria-label={fav ? `Remove ${m.name} from favourites` : `Add ${m.name} to favourites`}>
                        {fav ? <IconStarFilled size={18} aria-hidden="true" /> : <IconStar size={18} aria-hidden="true" />}
                      </button>
                    )}
                  </div>
                  <div className="name">{m.name}</div>
                  <div className="price num">{rupees(m.price)}</div>
                  {m.about && <p className="about">{m.about}</p>}
                  <div className="meta num">{m.prepMin} min to make</div>
                  {m.kcal != null && (
                    <div className="meta num">{m.kcal} kcal{m.protein >= HIGH_PROTEIN && ` · ${m.protein} g protein`}</div>
                  )}
                  {!m.soldOut && m.left <= LOW_STOCK && <div className="low num">Only {m.left} left</div>}
                </div>
                <div className="shot">
                  <DishPhoto photo={m.photo} />
                  <div className="act">
                    {m.soldOut && <span className="gone">Out of stock</span>}
                    {!m.soldOut && q > 0 && (
                      <Stepper name={m.name} qty={q} max={max} onChange={(d) => cart.change(m.id, d, max)} />
                    )}
                    {!m.soldOut && !q && (
                      <button className="btn add" aria-label={`Add ${m.name}`} onClick={() => cart.change(m.id, 1, max)}>
                        <IconPlus size={18} aria-hidden="true" /> Add
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="credits-link"><a href="#/credits">Photo credits</a></p>
    </section>
  );
}
