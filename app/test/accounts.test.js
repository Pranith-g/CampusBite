// Tests signing up, favourites, combos and the owner's Today summary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../server/db.js';
import { createServer } from '../server/app.js';
import { CANTEEN_CODE, OWNER, STUDENTS } from '../server/seed.js';

async function start(options = {}) {
  const db = openDatabase(':memory:');
  const server = createServer(db, { dist: 'no-such-folder', ...options });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = () => {
    let cookie = '';
    return async (method, path, body) => {
      const res = await fetch(base + path, {
        method,
        headers: { ...(body && { 'Content-Type': 'application/json' }), ...(cookie && { Cookie: cookie }) },
        body: body && JSON.stringify(body),
      });
      const set = res.headers.get('set-cookie');
      if (set) cookie = set.split(';')[0];
      return { status: res.status, data: await res.json().catch(() => null) };
    };
  };
  const owner = browser();
  await owner('POST', '/api/owner/sign-in', { username: OWNER.username, password: OWNER.password });
  const buy = (call, items, payMethod = 'upi') =>
    call('POST', '/api/orders', { items, payMethod, requestId: crypto.randomUUID() });
  return { db, browser, owner, buy, close: () => { server.close(); db.close(); } };
}

const NEW_STUDENT = { usn: '4MT23ME051', name: 'Kavya Iyer', pin: '5050' };

test('a student signs up, is signed in, and can sign in again later', async (t) => {
  const app = await start(); t.after(app.close);
  const call = app.browser();
  const res = await call('POST', '/api/sign-up', { ...NEW_STUDENT, usn: ' 4mt23me051 ' });
  assert.equal(res.status, 201);
  assert.deepEqual({ usn: res.data.student.usn, name: res.data.student.name }, { usn: '4MT23ME051', name: 'Kavya Iyer' });
  assert.equal((await call('GET', '/api/me')).data.student.usn, '4MT23ME051');

  const again = app.browser();
  assert.equal((await again('POST', '/api/sign-in', { usn: NEW_STUDENT.usn, pin: NEW_STUDENT.pin })).status, 200);
  assert.equal((await again('POST', '/api/sign-in', { usn: NEW_STUDENT.usn, pin: '0000' })).status, 401);
});

test('student sign-up checks the USN, name and PIN, and each USN only once', async (t) => {
  const app = await start(); t.after(app.close);
  const call = app.browser();
  const bad = [
    { ...NEW_STUDENT, usn: '12345' },
    { ...NEW_STUDENT, name: 'K' },
    { ...NEW_STUDENT, name: '<script>' },
    { ...NEW_STUDENT, pin: '12' },
    { ...NEW_STUDENT, pin: 'abcd' },
  ];
  for (const body of bad) assert.equal((await call('POST', '/api/sign-up', body)).status, 400, JSON.stringify(body));
  const taken = await call('POST', '/api/sign-up', { ...NEW_STUDENT, usn: STUDENTS[0].usn });
  assert.equal(taken.status, 409);
  assert.match(taken.data.message, /already exists/);
});

test('an owner can sign up only with the canteen code', async (t) => {
  const app = await start(); t.after(app.close);
  const call = app.browser();
  const owner = { username: 'Ravi.K', name: 'Ravi Kumar', password: 'counter-123' };
  const wrong = await call('POST', '/api/owner/sign-up', { ...owner, code: 'guess' });
  assert.equal(wrong.status, 403);
  assert.equal((await call('GET', '/api/owner/state')).status, 401);

  const res = await call('POST', '/api/owner/sign-up', { ...owner, code: CANTEEN_CODE });
  assert.equal(res.status, 201);
  assert.equal(res.data.owner.username, 'ravi.k');
  assert.equal((await call('GET', '/api/owner/state')).status, 200);

  const taken = await app.browser()('POST', '/api/owner/sign-up', { ...owner, code: CANTEEN_CODE });
  assert.equal(taken.status, 409);
  const short = await app.browser()('POST', '/api/owner/sign-up', { ...owner, username: 'new', password: 'short', code: CANTEEN_CODE });
  assert.equal(short.status, 400);
});

test('the canteen code can be set on the server, and guessing it is slowed down', async (t) => {
  const app = await start({ canteenCode: 'our-own-code' }); t.after(app.close);
  const call = app.browser();
  const owner = { username: 'meena', name: 'Meena', password: 'kitchen-pass' };
  assert.equal((await call('POST', '/api/owner/sign-up', { ...owner, code: CANTEEN_CODE })).status, 403);
  for (let i = 0; i < 4; i++) await call('POST', '/api/owner/sign-up', { ...owner, code: `guess${i}` });
  // Five wrong codes: even the right one has to wait.
  assert.equal((await call('POST', '/api/owner/sign-up', { ...owner, code: 'our-own-code' })).status, 429);
});

test('a student stars and un-stars favourite dishes', async (t) => {
  const app = await start(); t.after(app.close);
  const call = app.browser();
  await call('POST', '/api/sign-in', { usn: STUDENTS[0].usn, pin: STUDENTS[0].pin });
  assert.deepEqual((await call('GET', '/api/favourites')).data.ids, []);
  await call('POST', '/api/favourites', { itemId: 3, favourite: true });
  await call('POST', '/api/favourites', { itemId: 3, favourite: true });     // a double tap
  const res = await call('POST', '/api/favourites', { itemId: 1, favourite: true });
  assert.deepEqual(res.data.ids, [1, 3]);
  assert.deepEqual((await call('POST', '/api/favourites', { itemId: 3, favourite: false })).data.ids, [1]);
  assert.equal((await call('POST', '/api/favourites', { itemId: 999, favourite: true })).status, 404);
  assert.equal((await app.browser()('GET', '/api/favourites')).status, 401);

  // Someone else's favourites are separate.
  const other = app.browser();
  await other('POST', '/api/sign-in', { usn: STUDENTS[1].usn, pin: STUDENTS[1].pin });
  assert.deepEqual((await other('GET', '/api/favourites')).data.ids, []);
});

test('the menu lists the combos with their saving', async (t) => {
  const app = await start(); t.after(app.close);
  const { combos } = (await app.browser()('GET', '/api/menu')).data;
  assert.equal(combos.length, 4);
  const breakfast = combos[0];
  assert.equal(breakfast.name, 'South Indian breakfast');
  assert.deepEqual(breakfast.items.map((i) => [i.name, i.qty]), [['Masala dosa', 1], ['Filter coffee', 1]]);
  assert.deepEqual([breakfast.full, breakfast.price, breakfast.saving, breakfast.available], [60, 52, 8, true]);

  // A combo with a dish that is out of stock cannot be bought as a combo.
  await app.owner('POST', '/api/owner/stock', { id: 1, switchedOff: true });
  assert.equal((await app.browser()('GET', '/api/menu')).data.combos[0].available, false);
});

test('combo savings come off the total as many times as the combo fits', async (t) => {
  const app = await start(); t.after(app.close);
  const call = app.browser();
  await call('POST', '/api/sign-in', { usn: STUDENTS[0].usn, pin: STUDENTS[0].pin });
  // 3 dosa + 2 coffee: the breakfast combo fits twice. 2 vada pav + 1 lime soda: once.
  const q = await call('POST', '/api/quote', { items: [{ id: 1, qty: 3 }, { id: 11, qty: 2 }, { id: 7, qty: 2 }, { id: 13, qty: 1 }] });
  assert.equal(q.data.subtotal, 3 * 45 + 2 * 15 + 2 * 25 + 30);
  assert.equal(q.data.discount, 2 * 8 + 10);
  assert.equal(q.data.total, q.data.subtotal - 26);
  assert.deepEqual(q.data.combos.map((c) => [c.name, c.times]), [['South Indian breakfast', 2], ['Mumbai street combo', 1]]);

  const paid = await app.buy(call, [{ id: 1, qty: 3 }, { id: 11, qty: 2 }, { id: 7, qty: 2 }, { id: 13, qty: 1 }]);
  assert.equal(paid.data.order.total, q.data.total);
  assert.equal(paid.data.order.discount, 26);
});

test('when a dish in a combo runs out, the refund also takes back the lost saving', async (t) => {
  const app = await start(); t.after(app.close);
  const call = app.browser();
  await call('POST', '/api/sign-in', { usn: STUDENTS[0].usn, pin: STUDENTS[0].pin });
  const order = (await app.buy(call, [{ id: 1, qty: 1 }, { id: 11, qty: 1 }])).data.order;   // ₹52 combo
  assert.equal(order.total, 52);
  const res = await app.owner('POST', '/api/owner/ran-out', { token: order.number, itemId: 1 });
  // The coffee alone costs ₹15, so ₹37 comes back and the student paid ₹15 for it.
  assert.equal(res.data.done.amount, 37);
  const coffee = await app.owner('POST', '/api/owner/ran-out', { token: order.number, itemId: 11 });
  assert.equal(coffee.data.done.amount, 15);
  assert.equal(coffee.data.done.cancelled, true);
});

test('the owner sees today\'s summary', async (t) => {
  const app = await start(); t.after(app.close);
  assert.equal((await app.browser()('GET', '/api/owner/summary')).status, 401);
  const call = app.browser();
  await call('POST', '/api/sign-in', { usn: STUDENTS[0].usn, pin: STUDENTS[0].pin });
  const first = (await app.buy(call, [{ id: 1, qty: 1 }, { id: 11, qty: 1 }])).data.order;    // ₹52, saving ₹8
  await app.buy(call, [{ id: 6, qty: 2 }], 'card');                                           // ₹40
  await app.buy(call, [{ id: 3, qty: 1 }, { id: 2, qty: 1 }]);                                // ₹105
  await app.owner('POST', '/api/owner/ran-out', { token: first.number + 2, itemId: 2 });      // refund ₹35
  await app.owner('POST', '/api/owner/ready', { token: first.number });

  const { data } = await app.owner('GET', '/api/owner/summary');
  assert.equal(data.orders, 3);
  assert.equal(data.takings, 52 + 40 + 105);
  assert.equal(data.refunds, 35);
  assert.equal(data.net, 52 + 40 + 105 - 35);
  assert.equal(data.average, Math.round(197 / 3));
  assert.equal(data.comboSavings, 8);
  assert.deepEqual(data.byStatus, { preparing: 2, ready: 1, collected: 0, cancelled: 0 });
  assert.deepEqual(data.byPayment, { upi: 157, card: 40, wallet: 0 });
  assert.deepEqual(data.topDishes[0], { name: 'Samosa (2)', qty: 2, revenue: 40 });
  assert.ok(!data.topDishes.some((d) => d.name === 'Idli vada'));
  assert.deepEqual(data.ranOut, [{ name: 'Idli vada', qty: 1 }]);
  assert.equal(data.hours.reduce((n, h) => n + h.orders, 0), 3);
});

test("the three most ordered dishes this week are marked bestsellers", async (t) => {
  const app = await start(); t.after(app.close);
  const menu = async () => (await app.browser()("GET", "/api/menu")).data.items;
  assert.ok((await menu()).every((m) => !m.bestseller));
  const call = app.browser();
  await call("POST", "/api/sign-in", { usn: STUDENTS[0].usn, pin: STUDENTS[0].pin });
  await app.buy(call, [{ id: 6, qty: 5 }, { id: 3, qty: 4 }, { id: 2, qty: 3 }, { id: 9, qty: 2 }]);
  await app.buy(call, [{ id: 1, qty: 3 }]);
  const best = (await menu()).filter((m) => m.bestseller).map((m) => m.name);
  // Samosa 5, thali 4, then dosa and idli vada tie on 3: dosa is first on the menu, so it wins. Paneer roll (2) is too few.
  assert.deepEqual(best.sort(), ["Masala dosa", "Samosa (2)", "Veg thali"]);
});

test("a note for the kitchen is cleaned, kept with the order and shown to the owner", async (t) => {
  const app = await start(); t.after(app.close);
  const call = app.browser();
  await call("POST", "/api/sign-in", { usn: STUDENTS[0].usn, pin: STUDENTS[0].pin });
  const order = (await call("POST", "/api/orders", { items: [{ id: 1, qty: 1 }], payMethod: "upi", requestId: crypto.randomUUID(), note: "  less   spicy,\nno onion " })).data.order;
  assert.equal(order.note, "less spicy, no onion");
  const owner = (await app.owner("GET", "/api/owner/state")).data;
  assert.equal(owner.kitchen.orders[0].note, "less spicy, no onion");

  const long = await call("POST", "/api/orders", { items: [{ id: 2, qty: 1 }], payMethod: "upi", requestId: crypto.randomUUID(), note: "x".repeat(81) });
  assert.equal(long.status, 400);
  const plain = (await call("POST", "/api/orders", { items: [{ id: 2, qty: 1 }], payMethod: "upi", requestId: crypto.randomUUID() })).data.order;
  assert.equal(plain.note, null);
});
