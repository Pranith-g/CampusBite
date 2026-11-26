import { useEffect, useRef, useState } from 'react';
import { IconBarbell, IconCamera, IconClock, IconFlame, IconPlus, IconSearch, IconStar, IconStarFilled, IconX } from '@tabler/icons-react';
import DishPhoto from '../components/DishPhoto.jsx';
import Stepper from '../components/Stepper.jsx';
import { LOW_STOCK, rupees } from '../format.js';
import { flyToCart } from '../fly.js';

// Dishes with at least this many grams of protein count as high protein.
const HIGH_PROTEIN = 15;
const COMBOS = 'Combos';
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function filterText(count, protein, onlyFav) {
  if (onlyFav && protein) return `${count} of your favourites ${count === 1 ? 'has' : 'have'} ${HIGH_PROTEIN} g of protein or more.`;
  if (onlyFav) return count ? `Your ${count} favourite ${count === 1 ? 'dish' : 'dishes'}.` : 'No favourites yet. Tap the star on a dish to keep it here.';
  return `${count} ${count === 1 ? 'dish has' : 'dishes have'} ${HIGH_PROTEIN} g of protein or more.`;
}

function Badges({ m }) {
  return (
    <>
      <span className="veg" aria-label="Vegetarian" role="img" />
      {m.bestseller && <span className="badge best">Bestseller</span>}
      {m.protein >= HIGH_PROTEIN && <span className="hp">High protein</span>}
    </>
  );
}

// Add, or the + / − stepper once it is in the cart.
function AddControl({ m, q, max, cart, big = false }) {
  if (m.soldOut) return <span className="gone">Out of stock</span>;
  if (q > 0) return <Stepper name={m.name} qty={q} max={max} onChange={(d) => cart.change(m.id, d, max)} />;
  return (
    <button className={`btn add ${big ? 'big' : ''}`} aria-label={`Add ${m.name}`}
            onClick={(e) => { flyToCart(e.currentTarget, m.photo); cart.change(m.id, 1, max); }}>
      <IconPlus size={18} aria-hidden="true" /> Add{big ? ` · ${rupees(m.price)}` : ''}
    </button>
  );
}

function DishCard({ m, menu, cart, fav, onFavourite, onOpen }) {
  const q = cart.qty[m.id] || 0;
  const max = Math.min(menu.maxQty, m.left);
  return (
    <li className={`${q ? 'picked' : ''} ${m.soldOut ? 'out' : ''}`}>
      <button type="button" className="dish-open" onClick={() => onOpen(m)} aria-label={`More about ${m.name}`} />
      <div className="info">
        <div className="marks">
          <Badges m={m} />
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
        <div className="meta num">{m.prepMin} min{m.kcal != null && ` · ${m.kcal} kcal`}{m.protein >= HIGH_PROTEIN && ` · ${m.protein} g protein`}</div>
        {!m.soldOut && m.left <= LOW_STOCK && <div className="low num">Only {m.left} left</div>}
      </div>
      <div className="shot">
        <DishPhoto photo={m.photo} />
        <div className="act"><AddControl m={m} q={q} max={max} cart={cart} /></div>
      </div>
    </li>
  );
}

function ComboCard({ c, onAdd }) {
  return (
    <li className={c.available ? '' : 'out'}>
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
        <button className="btn add" aria-label={`Add the ${c.name} combo`} onClick={(e) => onAdd(c, e.currentTarget)}>
          <IconPlus size={18} aria-hidden="true" /> Add combo
        </button>
      ) : <span className="gone">Not available</span>}
    </li>
  );
}

// The full view of one dish, like a food app's dish page. A real <dialog>, so
// Esc closes it and the keyboard stays inside it.
function DishSheet({ dish, menu, cart, combos, onAddCombo, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (dish && d && !d.open) d.showModal();
    if (!dish && d?.open) d.close();
  }, [dish]);
  const m = dish && (menu.items.find((x) => x.id === dish.id) ?? dish);
  const q = m ? cart.qty[m.id] || 0 : 0;
  const max = m ? Math.min(menu.maxQty, m.left) : 0;
  const pairs = m ? combos.filter((c) => c.available && c.items.some((i) => i.id === m.id)) : [];

  return (
    <dialog ref={ref} className="sheet" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}
            aria-labelledby="sheet-title">
      {m && (
        <div className="sheet-body">
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Close"><IconX size={20} aria-hidden="true" /></button>
          <DishPhoto photo={m.photo} size="big" />
          <div className="sheet-text">
            <div className="marks"><Badges m={m} /></div>
            <h2 id="sheet-title">{m.name}</h2>
            <div className="price num">{rupees(m.price)}</div>
            {m.about && <p className="about">{m.about}</p>}
            <dl className="facts num">
              <div><dt><IconClock size={16} aria-hidden="true" /> Ready in</dt><dd>{m.prepMin} min</dd></div>
              {m.kcal != null && <div><dt><IconFlame size={16} aria-hidden="true" /> Energy</dt><dd>{m.kcal} kcal</dd></div>}
              {m.protein >= HIGH_PROTEIN && <div><dt><IconBarbell size={16} aria-hidden="true" /> Protein</dt><dd>{m.protein} g</dd></div>}
            </dl>
            {!m.soldOut && m.left <= LOW_STOCK && <p className="low num">Only {m.left} left today</p>}
            {pairs.map((c) => {
              const others = c.items.filter((i) => i.id !== m.id).map((i) => i.name).join(' + ');
              return (
                <div key={c.id} className="pair">
                  <p><b>Make it a combo:</b> add {others} and pay {rupees(c.price)} for both. You save {rupees(c.saving)}.</p>
                  <button className="btn" onClick={(e) => onAddCombo(c, e.currentTarget)}>Add the {c.name}</button>
                </div>
              );
            })}
            <div className="sheet-act"><AddControl m={m} q={q} max={max} cart={cart} big /></div>
          </div>
        </div>
      )}
    </dialog>
  );
}

export default function Menu({ menu, cart, favourites = [], onFavourite }) {
  const combos = menu.combos ?? [];
  const sections = [...new Set(menu.items.map((m) => m.section)), ...(combos.length ? [COMBOS] : [])];
  const [active, setActive] = useState(sections[0]);
  const [search, setSearch] = useState('');
  const [protein, setProtein] = useState(false);   // the High protein filter
  const [onlyFav, setOnlyFav] = useState(false);   // the Favourites filter
  const [open, setOpen] = useState(null);          // the dish shown in full
  const favs = new Set(favourites);
  const byId = new Map(menu.items.map((m) => [m.id, m]));
  const words = search.trim().toLowerCase();
  const filtering = Boolean(words) || protein || onlyFav;
  const found = menu.items.filter((m) => (!words || `${m.name} ${m.about ?? ''} ${m.section}`.toLowerCase().includes(words))
    && (!protein || m.protein >= HIGH_PROTEIN) && (!onlyFav || favs.has(m.id)));
  const ahead = Math.ceil(menu.load / menu.cooks);

  // A combo puts each of its dishes in the cart. The saving comes off at checkout.
  const addCombo = (combo, from) => {
    flyToCart(from, combo.items[0]?.photo);
    for (const i of combo.items) cart.change(i.id, i.qty, Math.min(menu.maxQty, byId.get(i.id)?.left ?? 0));
  };

  // The section chip follows the scroll: the last heading that has passed the top.
  useEffect(() => {
    if (filtering) return undefined;
    const onScroll = () => {
      // The line just under the sticky section chips.
      const line = (document.querySelector('.section-bar')?.getBoundingClientRect().bottom ?? 140) + 24;
      let now = sections[0];
      for (const s of sections) {
        const el = document.getElementById(`sec-${slug(s)}`);
        if (el && el.getBoundingClientRect().top <= line) now = s;
      }
      setActive(now);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [filtering, sections.join()]);

  const jump = (s) => {
    setActive(s);
    document.getElementById(`sec-${slug(s)}`)?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  const card = (m) => (
    <DishCard key={m.id} m={m} menu={menu} cart={cart} fav={favs.has(m.id)} onFavourite={onFavourite} onOpen={setOpen} />
  );

  return (
    <section aria-labelledby="menu-title" className="menu">
      <h1 id="menu-title">Today&rsquo;s menu</h1>
      <p className="lead">
        {ahead ? `Orders already in the kitchen add about ${ahead} min to yours.` : 'The kitchen is free right now.'}
      </p>

      <label className="search">
        <IconSearch size={18} aria-hidden="true" />
        <span className="sr-only">Search the menu</span>
        <input type="search" placeholder="Search dosa, chai, biryani…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>

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
        <>
          <p className="filter-note num">
            {words ? (found.length ? `${found.length} ${found.length === 1 ? 'dish' : 'dishes'} for “${search.trim()}”.` : `Nothing on today’s menu matches “${search.trim()}”.`)
              : filterText(found.length, protein, onlyFav)}{' '}
            <button type="button" className="link" onClick={() => { setSearch(''); setProtein(false); setOnlyFav(false); }}>Show the full menu</button>
          </p>
          <ul className="dishes">{found.map(card)}</ul>
        </>
      ) : (
        <>
          <nav className="section-bar" aria-label="Jump to a section">
            {sections.map((s) => (
              <button key={s} type="button" aria-current={active === s ? 'true' : undefined} onClick={() => jump(s)}>{s}</button>
            ))}
          </nav>
          {sections.map((s) => (
            <section key={s} className="menu-section" aria-labelledby={`sec-${slug(s)}`}>
              <h2 id={`sec-${slug(s)}`}>
                {s} <span className="num">{s === COMBOS ? combos.length : menu.items.filter((m) => m.section === s).length}</span>
              </h2>
              {s === COMBOS ? (
                <>
                  <ul className="combos">{combos.map((c) => <ComboCard key={c.id} c={c} onAdd={addCombo} />)}</ul>
                  <p className="filter-note">The saving comes off at checkout whenever your cart has all the dishes of a combo.</p>
                </>
              ) : (
                <ul className="dishes">{menu.items.filter((m) => m.section === s).map(card)}</ul>
              )}
            </section>
          ))}
        </>
      )}

      <footer className="menu-foot">
        <IconCamera size={16} aria-hidden="true" />
        <span>Food photos from Unsplash and Pexels, shown for illustration. <a href="#/credits">Who took them</a></span>
      </footer>

      <DishSheet dish={open} menu={menu} cart={cart} combos={combos} onAddCombo={addCombo} onClose={() => setOpen(null)} />
    </section>
  );
}
