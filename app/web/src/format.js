// Small display helpers shared by the screens.
export const rupees = (n) => '₹' + Number(n).toLocaleString('en-IN');
export const clockTime = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
export const itemText = (items) => items.map((i) => `${i.qty} × ${i.name}`).join(', ');
export const PAY_METHODS = { upi: 'UPI', card: 'Card' };
export const LOW_STOCK = 5;   // show "Only 3 left" from here down
export const STATUS = { preparing: 'Preparing', ready: 'Ready to collect', collected: 'Collected' };
export const waitedText = (ms) => (ms >= 60000 ? `waiting ${Math.floor(ms / 60000)} min` : 'just placed');
export const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
// 1 digit, 2 letters, 2 digits, 2 letters, 3 digits.
export const USN_PATTERN = /^\d[A-Z]{2}\d{2}[A-Z]{2}\d{3}$/;
