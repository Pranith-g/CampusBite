// The token system. The kitchen is a circular queue with 50 slots, the same
// idea as the C project:
//   a new order takes the slot after REAR:   (rear + 1) % 50
//   the order at FRONT is the next one to be marked ready
// An order that is "preparing" occupies its slot. Orders stay side by side
// from FRONT to REAR, so the slot after REAR is free unless all 50 are used.
// Ready orders wait on the pickup shelf (20 places) until handed over.
// A cancelled order leaves from the middle. Like queue_remove_token in the C
// project, every order behind it moves one slot toward the front, so the
// orders stay side by side and REAR steps back by one.
import { transaction } from './db.js';
import { AppError } from './errors.js';
import { outOfStockCount } from './stock.js';

export const KITCHEN_SLOTS = 50;
export const SHELF_SLOTS = 20;

const countWith = (db, status) => db.prepare('SELECT COUNT(*) AS n FROM orders WHERE status = ?').get(status).n;

export const kitchenFull = (db) => countWith(db, 'preparing') >= KITCHEN_SLOTS;

// The newest order that took a slot. Its slot is REAR.
const newest = (db) => db.prepare("SELECT slot, number FROM orders WHERE status != 'cancelled' ORDER BY id DESC LIMIT 1").get();

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

// Take an order out of the middle of the kitchen queue (it was cancelled).
// Call inside a transaction.
export function removeFromKitchen(db, orderId) {
  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ? AND status = 'preparing'").run(orderId);
  db.prepare(`UPDATE orders SET slot = (slot + ${KITCHEN_SLOTS - 1}) % ${KITCHEN_SLOTS} WHERE status = 'preparing' AND id > ?`).run(orderId);
}

export function handOver(db, token) {
  if (!Number.isInteger(token)) throw new AppError(400, 'Which token?');
  const { changes } = db.prepare("UPDATE orders SET status = 'collected', collected_at = ? WHERE number = ? AND status = 'ready'")
    .run(Date.now(), token);
  if (!changes) throw new AppError(409, `Token ${token} is not waiting on the pickup shelf.`);
}

function ordersWith(db, status, sort) {
  const items = db.prepare('SELECT item_id AS id, name, qty, ran_out AS ranOut FROM order_items WHERE order_id = ? ORDER BY rowid');
  return db.prepare(`
    SELECT o.id, o.number AS token, o.slot, o.placed_at AS placedAt, o.ready_at AS readyAt,
           COALESCE(o.label, s.name) AS name
    FROM orders o JOIN students s ON s.id = o.student_id
    WHERE o.status = ? ORDER BY ${sort}`)
    .all(status)
    .map((o) => ({ ...o, items: items.all(o.id).map((i) => ({ ...i, ranOut: Boolean(i.ranOut) })) }));
}

// FRONT, REAR and COUNT of the kitchen queue for a list of cooking orders.
function queueOf(db, orders) {
  const last = newest(db);
  const rear = last ? last.slot : -1;
  const front = orders.length ? orders[0].slot : (rear + 1) % KITCHEN_SLOTS;
  return { capacity: KITCHEN_SLOTS, count: orders.length, front, rear, orders };
}

// Everything the owner screen shows.
export function ownerState(db) {
  const kitchen = ordersWith(db, 'preparing', 'o.id');
  const shelf = ordersWith(db, 'ready', 'o.ready_at, o.id');
  const today = new Date().setHours(0, 0, 0, 0);
  return {
    kitchen: queueOf(db, kitchen),
    shelf: { capacity: SHELF_SLOTS, count: shelf.length, orders: shelf },
    collectedToday: db.prepare('SELECT COUNT(*) AS n FROM orders WHERE collected_at >= ?').get(today).n,
    // Takings today, less what was refunded.
    paidToday: db.prepare('SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE placed_at >= ?').get(today).n
      - db.prepare('SELECT COALESCE(SUM(amount), 0) AS n FROM refunds WHERE created_at >= ?').get(today).n,
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
    // The queue for the round dial: token numbers and slots, never names.
    kitchen: queueOf(db, db.prepare("SELECT number AS token, slot FROM orders WHERE status = 'preparing' ORDER BY id").all()),
  };
}
