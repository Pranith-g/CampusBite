import { useState } from 'react';
import { IconBarbell, IconPlus } from '@tabler/icons-react';
import DishPhoto from '../components/DishPhoto.jsx';
import Stepper from '../components/Stepper.jsx';
import { LOW_STOCK, rupees } from '../format.js';

// Dishes with at least this many grams of protein count as high protein.
const HIGH_PROTEIN = 15;

export default function Menu({ menu, cart }) {
  const sections = [...new Set(menu.items.map((m) => m.section))];
  const [section, setSection] = useState(sections[0]);
  const [protein, setProtein] = useState(false);   // the High protein filter
  const shown = protein
    ? menu.items.filter((m) => m.protein >= HIGH_PROTEIN)
    : menu.items.filter((m) => m.section === section);
  const ahead = Math.ceil(menu.load / menu.cooks);

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
        <button type="button" className="chip" aria-pressed={protein} onClick={() => setProtein(!protein)}>
          <IconBarbell size={18} aria-hidden="true" /> High protein
        </button>
      </div>
      {protein ? (
        <p className="filter-note num">
          {shown.length} {shown.length === 1 ? 'dish has' : 'dishes have'} {HIGH_PROTEIN} g of protein or more.{' '}
          <button type="button" className="link" onClick={() => setProtein(false)}>Show the full menu</button>
        </p>
      ) : (
        <div className="seg" role="group" aria-label="Menu section">
          {sections.map((s) => (
            <button key={s} type="button" aria-pressed={section === s} onClick={() => setSection(s)}>{s}</button>
          ))}
        </div>
      )}
      <ul className="dishes">
        {shown.map((m) => {
          const q = cart.qty[m.id] || 0;
          const max = Math.min(menu.maxQty, m.left);
          return (
            <li key={m.id} className={`${q ? 'picked' : ''} ${m.soldOut ? 'out' : ''}`}>
              <div className="info">
                <div className="marks">
                  <span className="veg" aria-hidden="true" />
                  {m.protein >= HIGH_PROTEIN && <span className="hp">High protein</span>}
                </div>
                <div className="name">{m.name}</div>
                <div className="price num">{rupees(m.price)}</div>
                {m.about && <p className="about">{m.about}</p>}
                <div className="meta num">{m.prepMin} min to make</div>
                {m.kcal != null && <div className="meta num">{m.kcal} kcal · {m.protein} g protein</div>}
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
      <p className="credits-link"><a href="#/credits">Photo credits</a></p>
    </section>
  );
}
