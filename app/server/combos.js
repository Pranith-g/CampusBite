// Meal combos: dishes that cost less when bought together. A combo is not a
// separate dish. When the cart holds every dish of a combo, the combo's saving
// comes off the total, as many times as the combo fits.
import { COMBOS } from './seed.js';

// The combos with their dishes looked up on today's menu.
export function listCombos(db) {
  const find = db.prepare(`SELECT id, name, price, photo, left_qty AS "left", (sold_out = 1 OR left_qty = 0) AS soldOut
                           FROM menu_items WHERE name = ?`);
  return COMBOS.map((combo, k) => {
    const items = combo.items.map(([name, qty]) => ({ ...find.get(name), qty }));
    if (items.some((i) => !i.id)) return null;          // a dish was taken off the menu
    const full = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    return {
      id: k + 1,
      name: combo.name,
      items: items.map(({ id, name, qty, photo, price }) => ({ id, name, qty, photo, price })),
      full,
      price: combo.price,
      saving: full - combo.price,
      available: items.every((i) => !i.soldOut && i.left >= i.qty),
    };
  }).filter(Boolean);
}

// How much the combos take off for these lines: [{ id, qty }].
export function comboDiscount(db, lines) {
  const have = new Map(lines.map((l) => [l.id, l.qty]));
  const applied = [];
  let discount = 0;
  for (const combo of listCombos(db)) {
    const times = Math.min(...combo.items.map((i) => Math.floor((have.get(i.id) ?? 0) / i.qty)));
    if (times < 1) continue;
    for (const i of combo.items) have.set(i.id, have.get(i.id) - i.qty * times);
    discount += combo.saving * times;
    applied.push({ name: combo.name, times, saving: combo.saving * times });
  }
  return { discount, applied };
}
