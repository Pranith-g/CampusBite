// Refunds and the canteen wallet.
// When a dish runs out after a student has paid, the owner marks it on the
// order. The student is refunded for that dish and chooses where the money
// goes: the canteen wallet (instant, spent only at this canteen) or back to
// the original UPI or card (a pretend transfer that takes 2-3 days).
// If nothing in the order can be made, the order is cancelled and leaves the
// kitchen queue.
import { transaction } from './db.js';
import { AppError } from './errors.js';
import { comboDiscount } from './combos.js';
import { removeFromKitchen } from './kitchen.js';

export const REFUND_DAYS = 3;   // the latest a pretend refund to UPI or card arrives
const DAY = 24 * 60 * 60 * 1000;
export const REFUND_METHODS = ['wallet', 'original'];

// Money in the wallet = refunds put into it minus orders paid from it.
export function walletBalance(db, studentId) {
  const added = db.prepare("SELECT COALESCE(SUM(amount), 0) AS n FROM refunds WHERE student_id = ? AND method = 'wallet'")
    .get(studentId).n;
  const spent = db.prepare("SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE student_id = ? AND pay_method = 'wallet'")
    .get(studentId).n;
  return added - spent;
}

// The owner says one dish in a paid order cannot be made.
export function markRanOut(db, body) {
  const { token, itemId } = body ?? {};
  if (!Number.isInteger(token) || !Number.isInteger(itemId)) throw new AppError(400, 'Which order and which dish?');
  return transaction(db, () => {
    const order = db.prepare('SELECT id, student_id AS studentId, status, total, pay_method AS payMethod FROM orders WHERE number = ?').get(token);
    if (!order) throw new AppError(404, `There is no token ${token}.`);
    if (order.status !== 'preparing') throw new AppError(409, `Token ${token} has already left the kitchen.`);
    const line = db.prepare('SELECT rowid, name, price, qty, ran_out AS ranOut FROM order_items WHERE order_id = ? AND item_id = ?')
      .get(order.id, itemId);
    if (!line) throw new AppError(404, `That dish is not in token ${token}.`);
    if (line.ranOut) throw new AppError(409, `${line.name} is already marked as run out for token ${token}.`);

    db.prepare('UPDATE order_items SET ran_out = 1 WHERE rowid = ?').run(line.rowid);
    // It has run out for everyone, so new orders cannot pick it.
    db.prepare('UPDATE menu_items SET left_qty = 0 WHERE id = ?').run(itemId);

    // Refund what was paid for this dish. If it was part of a combo, the combo
    // saving is lost too, so the refund is the paid amount minus what the
    // dishes still being made are worth on their own.
    const remaining = db.prepare('SELECT item_id AS id, qty, price FROM order_items WHERE order_id = ? AND ran_out = 0').all(order.id);
    const stillWorth = remaining.reduce((sum, l) => sum + l.price * l.qty, 0) - comboDiscount(db, remaining).discount;
    const refunded = db.prepare('SELECT COALESCE(SUM(amount), 0) AS n FROM refunds WHERE order_id = ?').get(order.id).n;
    const amount = Math.max(0, order.total - refunded - stillWorth);
    const what = `${line.qty} × ${line.name}`;
    const now = Date.now();
    // Money paid from the wallet goes straight back to it. Otherwise the
    // student chooses, and two dishes from one order make one refund.
    const open = db.prepare('SELECT id FROM refunds WHERE order_id = ? AND method IS NULL').get(order.id);
    if (order.payMethod === 'wallet') {
      db.prepare(`INSERT INTO refunds (order_id, student_id, amount, items, created_at, method, chosen_at)
                  VALUES (?, ?, ?, ?, ?, 'wallet', ?)`).run(order.id, order.studentId, amount, what, now, now);
    } else if (open) {
      db.prepare("UPDATE refunds SET amount = amount + ?, items = items || ', ' || ? WHERE id = ?").run(amount, what, open.id);
    } else {
      db.prepare('INSERT INTO refunds (order_id, student_id, amount, items, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(order.id, order.studentId, amount, what, now);
    }

    const left = db.prepare('SELECT COUNT(*) AS n FROM order_items WHERE order_id = ? AND ran_out = 0').get(order.id).n;
    if (left === 0) removeFromKitchen(db, order.id);
    return { token, dish: line.name, amount, cancelled: left === 0 };
  });
}

// The student chooses where a refund goes. Choosing the same place again
// (a double tap) is fine; changing it afterwards is not.
export function chooseRefund(db, student, id, method) {
  if (!REFUND_METHODS.includes(method)) throw new AppError(400, 'Choose where the refund should go.');
  const refund = db.prepare('SELECT method FROM refunds WHERE id = ? AND student_id = ?').get(id, student.id);
  if (!refund) throw new AppError(404, 'Refund not found.');
  if (refund.method === method) return;
  if (refund.method) throw new AppError(409, 'You have already chosen where this refund goes.');
  db.prepare('UPDATE refunds SET method = ?, chosen_at = ? WHERE id = ? AND method IS NULL').run(method, Date.now(), id);
}

export function refundsFor(db, orderId) {
  return db.prepare(`
    SELECT id, amount, items, created_at AS createdAt, method, chosen_at AS chosenAt
    FROM refunds WHERE order_id = ? ORDER BY id`)
    .all(orderId)
    .map((r) => ({ ...r, arrivesBy: r.method === 'original' ? r.chosenAt + REFUND_DAYS * DAY : null }));
}
