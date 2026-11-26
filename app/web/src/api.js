// Talks to the app's server. Every price, total and order number comes from
// the server; the screens only show what it sends back.
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach the canteen. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) {
    throw new ApiError(res.status, data?.message ?? 'The canteen server had a problem. Try again.');
  }
  return data;
}

export const api = {
  me: () => request('GET', '/me'),
  signIn: (usn, pin) => request('POST', '/sign-in', { usn, pin }),
  signUp: (account) => request('POST', '/sign-up', account),
  signOut: () => request('POST', '/sign-out', {}),
  menu: () => request('GET', '/menu'),
  quote: (items) => request('POST', '/quote', { items }),
  placeOrder: (order) => request('POST', '/orders', order),
  orders: () => request('GET', '/orders'),
  order: (id) => request('GET', `/orders/${id}`),
  board: () => request('GET', '/board'),
  favourites: () => request('GET', '/favourites'),
  setFavourite: (itemId, favourite) => request('POST', '/favourites', { itemId, favourite }),
  chooseRefund: (id, method) => request('POST', `/refunds/${id}`, { method }),

  // Canteen owner
  ownerMe: () => request('GET', '/owner/me'),
  ownerSignIn: (username, password) => request('POST', '/owner/sign-in', { username, password }),
  ownerSignUp: (account) => request('POST', '/owner/sign-up', account),
  ownerSummary: () => request('GET', '/owner/summary'),
  ownerSignOut: () => request('POST', '/owner/sign-out', {}),
  ownerState: () => request('GET', '/owner/state'),
  markReady: (token) => request('POST', '/owner/ready', { token }),
  handOver: (token) => request('POST', '/owner/hand-over', { token }),
  ranOut: (token, itemId) => request('POST', '/owner/ran-out', { token, itemId }),
  sampleOrders: () => request('POST', '/owner/sample-orders', {}),
  ownerStock: () => request('GET', '/owner/stock'),
  saveStock: (change) => request('POST', '/owner/stock', change),
};
