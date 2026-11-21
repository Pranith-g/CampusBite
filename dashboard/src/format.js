// Small display helpers shared by the components.

export const rupees = (n) => '₹' + Number(n).toLocaleString('en-IN');

export function itemText(items, menu) {
  return items
    .map(({ id, qty }) => {
      const name = menu?.[id]?.name?.toLowerCase() ?? `item ${id}`;
      return qty > 1 ? `${qty} ${name}` : name;
    })
    .join(', ');
}

export const waitText = (min) => (min > 0 ? `waiting ${min} min` : 'just placed');

export const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// Same rule as canteen_valid_usn() in C: 1 digit, 2 letters, 2 digits, 2 letters, 3 digits.
export const USN_PATTERN = /^\d[A-Z]{2}\d{2}[A-Z]{2}\d{3}$/;
// Same rule as canteen_valid_name() in C.
export const NAME_PATTERN = /^[A-Za-z .'-]{2,39}$/;
