// Small display helpers shared by the screens.
export const rupees = (n) => '₹' + Number(n).toLocaleString('en-IN');
export const clockTime = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
export const itemText = (items) => items.map((i) => `${i.qty} × ${i.name}`).join(', ');
export const PAY_METHODS = { upi: 'UPI', card: 'Card', wallet: 'Canteen wallet' };
// How much the combos take off a cart ({ id: qty }). The server works it
// out the same way and has the final say.
export function comboSaving(qty, combos = []) {
  const have = new Map(Object.entries(qty).map(([id, q]) => [Number(id), q]));
  const applied = [];
  let discount = 0;
  for (const c of combos) {
    const times = Math.min(...c.items.map((i) => Math.floor((have.get(i.id) ?? 0) / i.qty)));
    if (times < 1) continue;
    for (const i of c.items) have.set(i.id, have.get(i.id) - i.qty * times);
    discount += c.saving * times;
    applied.push({ name: c.name, times, saving: c.saving * times });
  }
  return { discount, applied };
}
export const LOW_STOCK = 5;   // show "Only 3 left" from here down
export const STATUS = { preparing: 'Preparing', ready: 'Ready to collect', collected: 'Collected', cancelled: 'Cancelled' };
export const dayText = (ms) => new Date(ms).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
export const waitedText = (ms) => (ms >= 60000 ? `waiting ${Math.floor(ms / 60000)} min` : 'just placed');
export const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
// 1 digit, 2 letters, 2 digits, 2 letters, 3 digits.
export const USN_PATTERN = /^\d[A-Z]{2}\d{2}[A-Z]{2}\d{3}$/;
