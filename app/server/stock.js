// Stock: how many of each dish the canteen has.
//   start_qty  how many the owner started with
//   left_qty   how many can still be ordered
//   sold_out   the owner's "out of stock" switch
// A dish is out of stock when the switch is on or nothing is left.
import { AppError } from './errors.js';

export const MAX_STOCK = 999;

export function listStock(db) {
  return db.prepare(`
    SELECT id, name, section, photo, start_qty AS start, left_qty AS "left", sold_out AS switchedOff
    FROM menu_items ORDER BY id`)
    .all()
    .map((row) => ({ ...row, switchedOff: Boolean(row.switchedOff) }));
}

export const outOfStockCount = (db) =>
  db.prepare('SELECT COUNT(*) AS n FROM menu_items WHERE sold_out = 1 OR left_qty = 0').get().n;

const isQuantity = (n) => Number.isInteger(n) && n >= 0 && n <= MAX_STOCK;

// Change one dish. Only the fields that are sent are changed.
export function updateStock(db, body) {
  const { id, start, left, switchedOff } = body ?? {};
  const changes = [];
  const values = [];
  for (const [column, value] of [['start_qty', start], ['left_qty', left]]) {
    if (value === undefined) continue;
    if (!isQuantity(value)) throw new AppError(400, `Enter a whole number from 0 to ${MAX_STOCK}.`);
    changes.push(`${column} = ?`);
    values.push(value);
  }
  if (switchedOff !== undefined) {
    if (typeof switchedOff !== 'boolean') throw new AppError(400, 'That change could not be read.');
    changes.push('sold_out = ?');
    values.push(switchedOff ? 1 : 0);
  }
  if (!Number.isInteger(id) || !changes.length) throw new AppError(400, 'That change could not be read.');
  const result = db.prepare(`UPDATE menu_items SET ${changes.join(', ')} WHERE id = ?`).run(...values, id);
  if (!result.changes) throw new AppError(404, 'That dish is not on the menu.');
}

// Reserve the dishes of an order. Call inside a transaction: if one dish is
// short, nothing is taken and the order is not saved.
export function takeStock(db, lines) {
  const find = db.prepare('SELECT left_qty AS "left", sold_out AS off FROM menu_items WHERE id = ?');
  const take = db.prepare('UPDATE menu_items SET left_qty = left_qty - ? WHERE id = ?');
  for (const line of lines) {
    const { left, off } = find.get(line.id);
    if (off || left === 0) throw new AppError(409, `${line.name} is out of stock. Remove it from your cart.`);
    if (left < line.qty) throw new AppError(409, `Only ${left} ${line.name} left. Lower the quantity.`);
    take.run(line.qty, line.id);
  }
}
