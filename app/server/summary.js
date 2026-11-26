// The owner's "Today" summary, like the end-of-day summary in the C project.
import { PAY_METHODS } from './orders.js';

export function ownerSummary(db, now = Date.now()) {
  const today = new Date(now).setHours(0, 0, 0, 0);
  const one = (sql, ...args) => db.prepare(sql).get(today, ...args).n;

  const orders = one('SELECT COUNT(*) AS n FROM orders WHERE placed_at >= ?');
  const takings = one('SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE placed_at >= ?');
  const refunds = one('SELECT COALESCE(SUM(amount), 0) AS n FROM refunds WHERE created_at >= ?');
  const savings = one('SELECT COALESCE(SUM(discount), 0) AS n FROM orders WHERE placed_at >= ?');

  const byStatus = Object.fromEntries(['preparing', 'ready', 'collected', 'cancelled'].map((s) =>
    [s, one('SELECT COUNT(*) AS n FROM orders WHERE placed_at >= ? AND status = ?', s)]));
  const byPayment = Object.fromEntries(PAY_METHODS.map((m) =>
    [m, one('SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE placed_at >= ? AND pay_method = ?', m)]));

  // Dishes actually made: lines that ran out are left out.
  const topDishes = db.prepare(`
    SELECT i.name, SUM(i.qty) AS qty, SUM(i.qty * i.price) AS revenue
    FROM order_items i JOIN orders o ON o.id = i.order_id
    WHERE o.placed_at >= ? AND i.ran_out = 0
    GROUP BY i.item_id ORDER BY qty DESC, revenue DESC LIMIT 5`).all(today);

  const hours = db.prepare(`
    SELECT CAST(strftime('%H', placed_at / 1000, 'unixepoch', 'localtime') AS INTEGER) AS hour, COUNT(*) AS orders
    FROM orders WHERE placed_at >= ? GROUP BY hour ORDER BY hour`).all(today);

  const ranOut = db.prepare(`
    SELECT i.name, SUM(i.qty) AS qty FROM order_items i JOIN orders o ON o.id = i.order_id
    WHERE o.placed_at >= ? AND i.ran_out = 1 GROUP BY i.item_id ORDER BY qty DESC`).all(today);

  return {
    orders,
    takings,
    refunds,
    net: takings - refunds,
    average: orders ? Math.round(takings / orders) : 0,
    comboSavings: savings,
    byStatus,
    byPayment,
    topDishes,
    hours,
    ranOut,
  };
}
