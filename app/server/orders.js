// Menu, estimated time and orders.
// The server works out every price and total itself from the menu in the
// database. Prices sent by the browser are never used.
import { AppError } from './errors.js';
import { transaction } from './db.js';
import { kitchenFull, nextSlot } from './kitchen.js';
import { comboDiscount } from './combos.js';
import { refundsFor, walletBalance } from './refunds.js';
import { takeStock } from './stock.js';

export const COOKS = 3;             // orders the kitchen can work on at once
export const MAX_QTY = 10;          // most of one item in one order
export const FIRST_NUMBER = 101;   // first token number
export const NOTE_MAX = 80;       // longest note for the kitchen
export const BESTSELLER_DAYS = 7; // a bestseller is among the most ordered over this many days
export const PAY_METHODS = ['upi', 'card', 'wallet'];   // all pretend payments

// The three dishes ordered most in the last week, if each sold at least 3 plates.
function bestsellers(db) {
  const since = Date.now() - BESTSELLER_DAYS * 24 * 60 * 60 * 1000;
  return new Set(db.prepare(`
    SELECT i.item_id AS id, SUM(i.qty) AS plates FROM order_items i JOIN orders o ON o.id = i.order_id
    WHERE o.placed_at >= ? AND i.ran_out = 0
    GROUP BY i.item_id HAVING plates >= 3 ORDER BY plates DESC, i.item_id LIMIT 3`).all(since).map((r) => r.id));
}

export function listMenu(db) {
  const top = bestsellers(db);
  return db.prepare(`
    SELECT id, name, section, price, prep_min AS prepMin, photo, about, kcal, protein_g AS protein, left_qty AS "left",
           (sold_out = 1 OR left_qty = 0) AS soldOut
    FROM menu_items ORDER BY id`)
    .all()
    .map((item) => ({ ...item, soldOut: Boolean(item.soldOut), bestseller: top.has(item.id) }));
}

// Minutes of cooking already waiting in the kitchen.
export function kitchenLoad(db) {
  return db.prepare(`
    SELECT COALESCE(SUM(i.prep_min * i.qty), 0) AS minutes
    FROM order_items i JOIN orders o ON o.id = i.order_id
    WHERE o.status = 'preparing' AND i.ran_out = 0`).get().minutes;
}

// Estimated time = the work already ahead, shared between the cooks,
// plus the slowest item in your own order.
export function estimateMinutes(db, lines) {
  const own = Math.max(0, ...lines.map((l) => l.prepMin));
  return Math.ceil(kitchenLoad(db) / COOKS) + own;
}

// Turn [{ id, qty }] from the browser into checked order lines.
function readLines(db, items) {
  if (!Array.isArray(items) || items.length === 0) throw new AppError(400, 'Your cart is empty.');
  const find = db.prepare('SELECT id, name, price, prep_min AS prepMin FROM menu_items WHERE id = ?');
  const seen = new Set();
  return items.map((line) => {
    const { id, qty } = line ?? {};
    if (!Number.isInteger(id) || !Number.isInteger(qty)) throw new AppError(400, 'That order could not be read.');
    if (qty < 1 || qty > MAX_QTY) throw new AppError(400, `You can order 1 to ${MAX_QTY} of each item.`);
    if (seen.has(id)) throw new AppError(400, 'The same item appears twice in the order.');
    seen.add(id);
    const item = find.get(id);
    if (!item) throw new AppError(400, 'An item in your cart is no longer on the menu.');
    return { ...item, qty };
  });
}

const subtotal = (lines) => lines.reduce((sum, l) => sum + l.price * l.qty, 0);

// The price of a cart: the dishes, less any combo savings.
function price(db, lines) {
  const sum = subtotal(lines);
  const { discount, applied } = comboDiscount(db, lines);
  return { subtotal: sum, discount, combos: applied, total: sum - discount };
}

// Price and time for a cart, before paying.
export function quote(db, items) {
  const lines = readLines(db, items);
  return { ...price(db, lines), etaMin: estimateMinutes(db, lines), kitchenFull: kitchenFull(db) };
}

// Take the (pretend) payment and create the order.
// requestId is made by the browser once per checkout, so tapping Pay twice,
// or retrying after a bad connection, gives back the same order.
export function placeOrder(db, student, body, label = null) {
  const { items, payMethod, requestId, expectedTotal } = body ?? {};
  if (!PAY_METHODS.includes(payMethod)) throw new AppError(400, 'Choose how you want to pay.');
  if (body.note !== undefined && body.note !== null && typeof body.note !== 'string') throw new AppError(400, 'That note could not be read.');
  const note = String(body.note ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (note.length > NOTE_MAX) throw new AppError(400, `Keep the note for the kitchen under ${NOTE_MAX} characters.`);
  if (typeof requestId !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(requestId)) {
    throw new AppError(400, 'That order could not be read.');
  }
  return transaction(db, () => {
    const earlier = db.prepare('SELECT id FROM orders WHERE student_id = ? AND request_id = ?').get(student.id, requestId);
    if (earlier) return getOrder(db, student, earlier.id);

    const lines = readLines(db, items);
    const { total: amount, discount } = price(db, lines);
    if (expectedTotal !== undefined && expectedTotal !== amount) {
      throw new AppError(409, 'Prices changed. Check the new total and pay again.');
    }
    if (payMethod === 'wallet') {
      const balance = walletBalance(db, student.id);
      if (balance < amount) throw new AppError(409, `Your canteen wallet has only ₹${balance}. Pay by UPI or card.`);
    }
    const slot = nextSlot(db);
    takeStock(db, lines);
    const eta = estimateMinutes(db, lines);
    const number = db.prepare('SELECT COALESCE(MAX(number), ?) + 1 AS n FROM orders').get(FIRST_NUMBER - 1).n;
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO orders (number, student_id, request_id, total, pay_method, eta_min, placed_at, slot, label, discount, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(number, student.id, requestId, amount, payMethod, eta, Date.now(), slot, label, discount, note || null);
    const add = db.prepare('INSERT INTO order_items (order_id, item_id, name, price, prep_min, qty) VALUES (?, ?, ?, ?, ?, ?)');
    for (const l of lines) add.run(lastInsertRowid, l.id, l.name, l.price, l.prepMin, l.qty);
    return getOrder(db, student, Number(lastInsertRowid));
  });
}

const ORDER_COLUMNS = 'id, number, status, total, discount, pay_method AS payMethod, eta_min AS etaMin, placed_at AS placedAt, ready_at AS readyAt, collected_at AS collectedAt, note';

function withItems(db, order) {
  const items = db.prepare('SELECT item_id AS id, name, price, qty, ran_out AS ranOut FROM order_items WHERE order_id = ? ORDER BY rowid')
    .all(order.id).map((i) => ({ ...i, ranOut: Boolean(i.ranOut) }));
  // How many orders are in front of this one in the kitchen queue.
  const ahead = order.status === 'preparing'
    ? db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'preparing' AND id < ?").get(order.id).n
    : 0;
  return { ...order, ahead, ageMs: Date.now() - order.placedAt, items, refunds: refundsFor(db, order.id) };
}

// A student can only ever read their own orders.
export function getOrder(db, student, id) {
  const order = db.prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = ? AND student_id = ?`).get(id, student.id);
  if (!order) throw new AppError(404, 'Order not found.');
  return withItems(db, order);
}

export function listOrders(db, student) {
  return db.prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE student_id = ? ORDER BY id DESC LIMIT 20`)
    .all(student.id)
    .map((o) => withItems(db, o));
}
