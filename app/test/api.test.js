// Tests the server through real HTTP requests, using a database in memory.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../server/db.js';
import { createServer } from '../server/app.js';
import { STUDENTS } from '../server/seed.js';

async function start() {
  const db = openDatabase(':memory:');
  const server = createServer(db, { dist: 'no-such-folder' });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${server.address().port}`;

  // One "browser": it remembers its own sign-in cookie.
  const browser = () => {
    let cookie = '';
    return async (method, path, body, headers = {}) => {
      const res = await fetch(base + path, {
        method,
        headers: { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...(cookie && { Cookie: cookie }), ...headers },
        body: typeof body === 'string' ? body : body && JSON.stringify(body),
      });
      const set = res.headers.get('set-cookie');
      if (set) cookie = set.split(';')[0];
      return { status: res.status, setCookie: set, data: await res.json().catch(() => null) };
    };
  };
  const signedIn = async (who = STUDENTS[0]) => {
    const call = browser();
    const res = await call('POST', '/api/sign-in', { usn: who.usn, pin: who.pin });
    assert.equal(res.status, 200);
    return call;
  };
  return { db, browser, signedIn, close: () => { server.close(); db.close(); } };
}

const order = (extra = {}) => ({
  items: [{ id: 1, qty: 2 }, { id: 11, qty: 1 }], payMethod: 'upi', requestId: crypto.randomUUID(), ...extra,
});
const countOrders = (app) => app.db.prepare('SELECT COUNT(*) AS n FROM orders').get().n;

test('menu is public and has the demo items', async (t) => {
  const app = await start(); t.after(app.close);
  const res = await app.browser()('GET', '/api/menu');
  assert.equal(res.status, 200);
  assert.equal(res.data.items.length, 15);
  assert.equal(res.data.load, 0);
});

test('sign in: wrong PIN is refused, right PIN sets a private cookie', async (t) => {
  const app = await start(); t.after(app.close);
  const call = app.browser();
  const bad = await call('POST', '/api/sign-in', { usn: STUDENTS[0].usn, pin: 'nope' });
  assert.equal(bad.status, 401);
  assert.equal((await call('GET', '/api/me')).data.student, null);
  const good = await call('POST', '/api/sign-in', { usn: STUDENTS[0].usn.toLowerCase(), pin: STUDENTS[0].pin });
  assert.equal(good.status, 200);
  assert.match(good.setCookie, /HttpOnly; SameSite=Lax/);
  assert.equal((await call('GET', '/api/me')).data.student.name, STUDENTS[0].name);
});

test('PINs are stored only as salted hashes', async (t) => {
  const app = await start(); t.after(app.close);
  const rows = app.db.prepare("SELECT pin_hash FROM students WHERE usn != 'SAMPLE'").all();
  assert.equal(rows.length, STUDENTS.length);
  assert.ok(rows.every((r) => /^[0-9a-f]{32}:[0-9a-f]{64}$/.test(r.pin_hash)));
});

test('five wrong PINs lock the account for a while', async (t) => {
  const app = await start(); t.after(app.close);
  const call = app.browser();
  for (let i = 0; i < 5; i++) await call('POST', '/api/sign-in', { usn: STUDENTS[0].usn, pin: 'nope' });
  const res = await call('POST', '/api/sign-in', { usn: STUDENTS[0].usn, pin: STUDENTS[0].pin });
  assert.equal(res.status, 429);
});

test('sign out ends the session', async (t) => {
  const app = await start(); t.after(app.close);
  const call = await app.signedIn();
  await call('POST', '/api/sign-out', {});
  assert.equal((await call('GET', '/api/orders')).status, 401);
});

test('ordering needs a signed-in student', async (t) => {
  const app = await start(); t.after(app.close);
  assert.equal((await app.browser()('POST', '/api/orders', order())).status, 401);
});

test('an order is priced by the server and gets a number and a time', async (t) => {
  const app = await start(); t.after(app.close);
  const call = await app.signedIn();
  const res = await call('POST', '/api/orders', order({ total: 1, items: [{ id: 1, qty: 2, price: 1 }, { id: 11, qty: 1 }] }));
  assert.equal(res.status, 201);
  assert.equal(res.data.order.number, 101);
  // Dosa + filter coffee is the South Indian breakfast combo: ₹60 for ₹52, once.
  assert.equal(res.data.order.total, 2 * 45 + 15 - 8);
  assert.equal(res.data.order.discount, 8);
  assert.equal(res.data.order.etaMin, 6);            // empty kitchen: slowest item only
  assert.equal(res.data.order.status, 'preparing');
});

test('estimated time grows with the orders ahead', async (t) => {
  const app = await start(); t.after(app.close);
  const call = await app.signedIn();
  await call('POST', '/api/orders', order());        // 2 x 6 + 1 x 1 = 13 minutes of work
  assert.equal((await call('GET', '/api/menu')).data.load, 13);
  const q = await call('POST', '/api/quote', { items: [{ id: 6, qty: 1 }] });
  assert.equal(q.data.etaMin, Math.ceil(13 / 3) + 2);
  assert.equal(q.data.total, 20);
  const second = await call('POST', '/api/orders', order({ items: [{ id: 6, qty: 1 }] }));
  assert.equal(second.data.order.number, 102);
  assert.equal(second.data.order.etaMin, 7);
});

test('paying twice with the same request id makes one order', async (t) => {
  const app = await start(); t.after(app.close);
  const call = await app.signedIn();
  const body = order();
  const [a, b] = await Promise.all([call('POST', '/api/orders', body), call('POST', '/api/orders', body)]);
  assert.equal(a.data.order.id, b.data.order.id);
  assert.equal(countOrders(app), 1);
});

test('bad orders are refused and nothing is saved', async (t) => {
  const app = await start(); t.after(app.close);
  const call = await app.signedIn();
  const bad = [
    order({ items: [] }),
    order({ items: [{ id: 1, qty: 0 }] }),
    order({ items: [{ id: 1, qty: 11 }] }),
    order({ items: [{ id: 1, qty: 1.5 }] }),
    order({ items: [{ id: 999, qty: 1 }] }),
    order({ items: [{ id: 1, qty: 1 }, { id: 1, qty: 1 }] }),
    order({ items: [null] }),
    order({ payMethod: 'cash' }),
    order({ requestId: 'x' }),
  ];
  for (const body of bad) assert.equal((await call('POST', '/api/orders', body)).status, 400);
  assert.equal(countOrders(app), 0);
});

test('a changed price is shown before money is taken', async (t) => {
  const app = await start(); t.after(app.close);
  const call = await app.signedIn();
  const res = await call('POST', '/api/orders', order({ expectedTotal: 5 }));
  assert.equal(res.status, 409);
  assert.equal(countOrders(app), 0);
});

test('students cannot see each other\'s orders', async (t) => {
  const app = await start(); t.after(app.close);
  const first = await app.signedIn(STUDENTS[0]);
  const { data } = await first('POST', '/api/orders', order());
  const other = await app.signedIn(STUDENTS[1]);
  assert.equal((await other('GET', `/api/orders/${data.order.id}`)).status, 404);
  assert.equal((await other('GET', '/api/orders')).data.orders.length, 0);
  assert.equal((await first('GET', `/api/orders/${data.order.id}`)).status, 200);
});

test('only JSON requests can change anything', async (t) => {
  const app = await start(); t.after(app.close);
  const call = await app.signedIn();
  const res = await call('POST', '/api/orders', JSON.stringify(order()), { 'Content-Type': 'text/plain' });
  assert.equal(res.status, 415);
  assert.equal((await call('POST', '/api/orders', '{oops')).status, 400);
});

test('files outside the built screens are never served', async (t) => {
  const app = await start(); t.after(app.close);
  const res = await app.browser()('GET', '/%2e%2e/package.json');
  assert.notEqual(res.status, 200);
});
