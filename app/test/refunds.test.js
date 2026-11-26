// Tests dishes running out after payment: refunds, the wallet, and the
// kitchen queue closing up when a whole order is cancelled.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../server/db.js';
import { createServer } from '../server/app.js';
import { OWNER, STUDENTS } from '../server/seed.js';

async function start() {
  const db = openDatabase(':memory:');
  const server = createServer(db, { dist: 'no-such-folder' });
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
  const signIn = async (who) => {
    const call = browser();
    await call('POST', '/api/sign-in', { usn: who.usn, pin: who.pin });
    return call;
  };
  const student = await signIn(STUDENTS[0]);
  const other = await signIn(STUDENTS[1]);
  const owner = browser();
  await owner('POST', '/api/owner/sign-in', { username: OWNER.username, password: OWNER.password });
  const buy = async (call, items, payMethod = 'upi') =>
    (await call('POST', '/api/orders', { items, payMethod, requestId: crypto.randomUUID() }));
  const ranOut = (token, itemId) => owner('POST', '/api/owner/ran-out', { token, itemId });
  const mine = async (call = student) => (await call('GET', '/api/orders')).data;
  const kitchen = async () => (await owner('GET', '/api/owner/state')).data.kitchen;
  return { db, browser, student, other, owner, buy, ranOut, mine, kitchen, close: () => { server.close(); db.close(); } };
}

// Menu ids: 1 Masala dosa ₹45, 2 Idli vada ₹35, 11 Filter coffee ₹15, 12 Masala chai ₹12.
// Masala chai is used beside other dishes so no combo changes the numbers.

test('a dish that runs out is refunded and the rest of the order carries on', async (t) => {
  const app = await start(); t.after(app.close);
  const { data } = await app.buy(app.student, [{ id: 1, qty: 2 }, { id: 12, qty: 1 }]);
  const token = data.order.number;

  const res = await app.ranOut(token, 1);
  assert.equal(res.status, 200);
  assert.deepEqual(res.data.done, { token, dish: 'Masala dosa', amount: 90, cancelled: false });

  const { orders, wallet } = await app.mine();
  assert.equal(wallet, 0);
  assert.equal(orders[0].status, 'preparing');
  assert.deepEqual(orders[0].items.map((i) => i.ranOut), [true, false]);
  assert.equal(orders[0].refunds.length, 1);
  assert.equal(orders[0].refunds[0].amount, 90);
  assert.equal(orders[0].refunds[0].items, '2 × Masala dosa');
  assert.equal(orders[0].refunds[0].method, null);

  // The dish is now out for everyone.
  const menu = (await app.browser()('GET', '/api/menu')).data.items;
  assert.equal(menu.find((m) => m.id === 1).soldOut, true);
});

test('the student chooses the wallet and can spend it at the canteen', async (t) => {
  const app = await start(); t.after(app.close);
  const token = (await app.buy(app.student, [{ id: 1, qty: 2 }, { id: 12, qty: 1 }])).data.order.number;
  await app.ranOut(token, 1);
  const refundId = (await app.mine()).orders[0].refunds[0].id;

  const chosen = await app.student('POST', `/api/refunds/${refundId}`, { method: 'wallet' });
  assert.equal(chosen.status, 200);
  assert.equal(chosen.data.wallet, 90);
  // A double tap on the same choice is fine. Changing it afterwards is not.
  assert.equal((await app.student('POST', `/api/refunds/${refundId}`, { method: 'wallet' })).status, 200);
  assert.equal((await app.student('POST', `/api/refunds/${refundId}`, { method: 'original' })).status, 409);
  assert.equal((await app.mine()).wallet, 90);

  // Too little in the wallet: refused, nothing taken.
  const tooMuch = await app.buy(app.student, [{ id: 1, qty: 3 }], 'wallet');
  assert.equal(tooMuch.status, 409);
  assert.match(tooMuch.data.message, /only ₹90/);

  const paid = await app.buy(app.student, [{ id: 2, qty: 2 }], 'wallet');
  assert.equal(paid.status, 201);
  assert.equal(paid.data.order.payMethod, 'wallet');
  assert.equal((await app.mine()).wallet, 20);
});

test('a refund to UPI or card says when it arrives and leaves the wallet alone', async (t) => {
  const app = await start(); t.after(app.close);
  const token = (await app.buy(app.student, [{ id: 2, qty: 1 }, { id: 12, qty: 1 }])).data.order.number;
  await app.ranOut(token, 2);
  const refundId = (await app.mine()).orders[0].refunds[0].id;
  const before = Date.now();
  const { data } = await app.student('POST', `/api/refunds/${refundId}`, { method: 'original' });
  const refund = data.orders[0].refunds[0];
  assert.equal(refund.method, 'original');
  assert.ok(refund.arrivesBy >= before + 3 * 24 * 60 * 60 * 1000 - 1000);
  assert.equal(data.wallet, 0);
});

test('when nothing in the order can be made it is cancelled and leaves the queue', async (t) => {
  const app = await start(); t.after(app.close);
  const a = (await app.buy(app.other, [{ id: 11, qty: 1 }])).data.order.number;      // slot 0
  const b = (await app.buy(app.student, [{ id: 1, qty: 1 }])).data.order.number;    // slot 1
  const c = (await app.buy(app.other, [{ id: 2, qty: 1 }])).data.order.number;      // slot 2
  const d = (await app.buy(app.other, [{ id: 3, qty: 1 }])).data.order.number;      // slot 3

  const res = await app.ranOut(b, 1);
  assert.equal(res.data.done.cancelled, true);
  assert.equal((await app.mine()).orders[0].status, 'cancelled');

  // Like the C queue: the orders behind it move up one slot, REAR steps back.
  const k = await app.kitchen();
  assert.deepEqual(k.orders.map((o) => [o.token, o.slot]), [[a, 0], [c, 1], [d, 2]]);
  assert.equal(k.front, 0);
  assert.equal(k.rear, 2);
  assert.equal(k.count, 3);

  // The next order takes the slot straight after REAR.
  const e = (await app.buy(app.other, [{ id: 4, qty: 1 }])).data.order;
  assert.equal(e.number, d + 1);
  assert.deepEqual((await app.kitchen()).orders.map((o) => o.slot), [0, 1, 2, 3]);

  // The token board no longer shows the cancelled token.
  const boardNow = (await app.browser()('GET', '/api/board')).data;
  assert.ok(!boardNow.preparing.includes(b));
});

test('cancelling the newest order lets the next order reuse its slot', async (t) => {
  const app = await start(); t.after(app.close);
  await app.buy(app.other, [{ id: 11, qty: 1 }]);
  const b = (await app.buy(app.student, [{ id: 1, qty: 1 }])).data.order.number;
  await app.ranOut(b, 1);
  assert.equal((await app.kitchen()).rear, 0);
  await app.buy(app.other, [{ id: 2, qty: 1 }]);
  assert.deepEqual((await app.kitchen()).orders.map((o) => o.slot), [0, 1]);
});

test('two dishes from one order make one refund to choose', async (t) => {
  const app = await start(); t.after(app.close);
  const token = (await app.buy(app.student, [{ id: 1, qty: 1 }, { id: 2, qty: 1 }, { id: 12, qty: 1 }])).data.order.number;
  await app.ranOut(token, 1);
  await app.ranOut(token, 2);
  const refunds = (await app.mine()).orders[0].refunds;
  assert.equal(refunds.length, 1);
  assert.equal(refunds[0].amount, 80);
  assert.equal(refunds[0].items, '1 × Masala dosa, 1 × Idli vada');
});

test('an order paid from the wallet is refunded to the wallet straight away', async (t) => {
  const app = await start(); t.after(app.close);
  const first = (await app.buy(app.student, [{ id: 1, qty: 2 }, { id: 12, qty: 1 }])).data.order.number;
  await app.ranOut(first, 1);
  const refundId = (await app.mine()).orders[0].refunds[0].id;
  await app.student('POST', `/api/refunds/${refundId}`, { method: 'wallet' });   // wallet ₹90

  const second = (await app.buy(app.student, [{ id: 2, qty: 2 }], 'wallet')).data.order.number;   // wallet ₹20
  await app.ranOut(second, 2);
  const { orders, wallet } = await app.mine();
  assert.equal(orders[0].refunds[0].method, 'wallet');
  assert.equal(wallet, 90);
});

test('the kitchen estimate drops when a dish runs out', async (t) => {
  const app = await start(); t.after(app.close);
  const menu = async () => (await app.browser()('GET', '/api/menu')).data;
  const token = (await app.buy(app.student, [{ id: 4, qty: 3 }, { id: 12, qty: 1 }])).data.order.number;   // 3 × 7 min + 1
  assert.equal((await menu()).load, 22);
  await app.ranOut(token, 4);
  assert.equal((await menu()).load, 1);
});

test('only the owner can mark a dish run out, and only while it is cooking', async (t) => {
  const app = await start(); t.after(app.close);
  const token = (await app.buy(app.student, [{ id: 1, qty: 1 }, { id: 12, qty: 1 }])).data.order.number;
  assert.equal((await app.student('POST', '/api/owner/ran-out', { token, itemId: 1 })).status, 401);
  assert.equal((await app.ranOut(token, 5)).status, 404);
  assert.equal((await app.ranOut(999, 1)).status, 404);
  assert.equal((await app.ranOut('101', 1)).status, 400);
  assert.equal((await app.ranOut(token, 1)).status, 200);
  assert.equal((await app.ranOut(token, 1)).status, 409);

  await app.owner('POST', '/api/owner/ready', { token });
  assert.equal((await app.ranOut(token, 11)).status, 409);
});

test('a student cannot choose for someone else\'s refund', async (t) => {
  const app = await start(); t.after(app.close);
  const token = (await app.buy(app.student, [{ id: 1, qty: 1 }, { id: 12, qty: 1 }])).data.order.number;
  await app.ranOut(token, 1);
  const refundId = (await app.mine()).orders[0].refunds[0].id;
  assert.equal((await app.other('POST', `/api/refunds/${refundId}`, { method: 'wallet' })).status, 404);
  assert.equal((await app.student('POST', `/api/refunds/${refundId}`, { method: 'cash' })).status, 400);
  assert.equal((await app.mine(app.other)).wallet, 0);
});
