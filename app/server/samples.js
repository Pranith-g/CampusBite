// "Add sample orders": made-up orders that fill the kitchen for a demo.
import { randomInt, randomUUID } from 'node:crypto';
import { KITCHEN_SLOTS } from './kitchen.js';
import { AppError } from './errors.js';
import { listMenu, placeOrder } from './orders.js';
import { SAMPLE_NAMES, SAMPLE_USN } from './seed.js';

const HOW_MANY = 8;

export function addSampleOrders(db) {
  const account = db.prepare('SELECT id FROM students WHERE usn = ?').get(SAMPLE_USN);
  const used = db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'preparing'").get().n;
  const count = Math.min(HOW_MANY, KITCHEN_SLOTS - used);
  if (count <= 0) throw new AppError(409, 'The kitchen is full. Mark an order ready first.');

  let added = 0;
  for (; added < count; added++) {
    // Sample orders use real stock, so pick only from what is still available.
    const menu = listMenu(db).filter((m) => !m.soldOut);
    if (!menu.length) break;
    const first = randomInt(menu.length);
    const chosen = [menu[first]];
    const second = menu[(first + 5) % menu.length];
    if (second !== chosen[0] && randomInt(2)) chosen.push(second);
    const items = chosen.map((m) => ({ id: m.id, qty: Math.min(m.left, randomInt(1, 3)) }));
    placeOrder(db, account, { items, payMethod: 'upi', requestId: randomUUID() },
      `${SAMPLE_NAMES[randomInt(SAMPLE_NAMES.length)]} (sample)`);
  }
  if (!added) throw new AppError(409, 'Everything is out of stock. Add stock first.');
  return added;
}
