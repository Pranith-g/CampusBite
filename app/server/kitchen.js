// The token system. The kitchen is a circular queue with 50 slots, the same
// idea as the C project:
//   a new order takes the slot after REAR:   (rear + 1) % 50
//   the order at FRONT is the next one to be marked ready
// An order that is "preparing" occupies its slot. Because orders leave only
// from the front, the slot after REAR is always free unless all 50 are used.
// Ready orders wait on the pickup shelf (20 places) until handed over.
import { transaction } from './db.js';
import { AppError } from './errors.js';
import { outOfStockCount } from './stock.js';

export const KITCHEN_SLOTS = 50;
export const SHELF_SLOTS = 20;

const countWith = (db, status) => db.prepare('SELECT COUNT(*) AS n FROM orders WHERE status = ?').get(status).n;

export const kitchenFull = (db) => countWith(db, 'preparing') >= KITCHEN_SLOTS;

const newest = (db) => db.prepare('SELECT slot, number FROM orders ORDER BY id DESC LIMIT 1').get();

// The slot for a new order.
export function nextSlot(db) {
  if (kitchenFull(db)) throw new AppError(409, 'The kitchen is full right now. Try again in a few minutes.');
  const last = newest(db);
  return last ? (last.slot + 1) % KITCHEN_SLOTS : 0;
}

// Move the front order from the kitchen to the pickup shelf. The screen says
// which token it saw at the front, so a double click cannot move two orders.
export function markReady(db, token) {
  transaction(db, () => {
    const front = db.prepare("SELECT id, number FROM orders WHERE status = 'preparing' ORDER BY id LIMIT 1").get();
    if (!front) throw new AppError(409, 'There are no orders in the kitchen.');
    if (front.number !== token) throw new AppError(409, 'The front order has already moved on.');
    if (countWith(db, 'ready') >= SHELF_SLOTS) {
      throw new AppError(409, 'The pickup shelf is full. Hand over a ready order first.');
    }
    db.prepare("UPDATE orders SET status = 'ready', ready_at = ? WHERE id = ?").run(Date.now(), front.id);
  });
}

export function handOver(db, token) {
  if (!Number.isInteger(token)) throw new AppError(400, 'Which token?');
  const { changes } = db.prepare("UPDATE orders SET status = 'collected', collected_at = ? WHERE number = ? AND status = 'ready'")
    .run(Date.now(), token);
  if (!changes) throw new AppError(409, `Token ${token} is not waiting on the pickup shelf.`);
}

function ordersWith(db, status, sort) {
  const items = db.prepare('SELECT name, qty FROM order_items WHERE order_id = ? ORDER BY rowid');
  return db.prepare(`
    SELECT o.id, o.number AS token, o.slot, o.placed_at AS placedAt, o.ready_at AS readyAt,
           COALESCE(o.label, s.name) AS name
    FROM orders o JOIN students s ON s.id = o.student_id
    WHERE o.status = ? ORDER BY ${sort}`)
    .all(status)
    .map((o) => ({ ...o, items: items.all(o.id) }));
}

// Everything the owner screen shows.
export function ownerState(db) {
  const kitchen = ordersWith(db, 'preparing', 'o.id');
  const shelf = ordersWith(db, 'ready', 'o.ready_at, o.id');
  const last = newest(db);
  const rear = last ? last.slot : -1;
  const front = kitchen.length ? kitchen[0].slot : (rear + 1) % KITCHEN_SLOTS;
  const today = new Date().setHours(0, 0, 0, 0);
  return {
    kitchen: { capacity: KITCHEN_SLOTS, count: kitchen.length, front, rear, orders: kitchen },
    shelf: { capacity: SHELF_SLOTS, count: shelf.length, orders: shelf },
    collectedToday: db.prepare('SELECT COUNT(*) AS n FROM orders WHERE collected_at >= ?').get(today).n,
    paidToday: db.prepare('SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE placed_at >= ?').get(today).n,
    outOfStock: outOfStockCount(db),
    now: Date.now(),
  };
}

// The public token board: token numbers only, never names.
export function board(db) {
  const numbers = (status, sort) =>
    db.prepare(`SELECT number FROM orders WHERE status = ? ORDER BY ${sort}`).all(status).map((r) => r.number);
  return {
    preparing: numbers('preparing', 'id'),
    ready: numbers('ready', 'ready_at DESC, id DESC'),   // newest first
    capacity: KITCHEN_SLOTS,
  };
}
