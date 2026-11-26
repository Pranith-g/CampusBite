// Tests the token queue, the owner screen's actions and the database upgrade.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
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
  const student = async (who = STUDENTS[0]) => {
    const call = browser();
    await call('POST', '/api/sign-in', { usn: who.usn, pin: who.pin });
    return call;
  };
  const owner = async () => {
    const call = browser();
    const res = await call('POST', '/api/owner/sign-in', { username: OWNER.username, password: OWNER.password });
    assert.equal(res.status, 200);
    return call;
  };
  return { db, browser, student, owner, close: () => { server.close(); db.close(); } };
}

const buy = (call) => call('POST', '/api/orders', { items: [{ id: 6, qty: 1 }], payMethod: 'upi', requestId: crypto.randomUUID() });
const state = async (call) => (await call('GET', '/api/owner/state')).data;
const ready = (call, token) => call('POST', '/api/owner/ready', { token });
const handOver = (call, token) => call('POST', '/api/owner/hand-over', { token });

test('owner screens need the owner sign-in', async (t) => {
  const app = await start(); t.after(app.close);
  const student = await app.student();
  for (const call of [app.browser(), student]) {
    assert.equal((await call('GET', '/api/owner/state')).status, 401);
    assert.equal((await call('POST', '/api/owner/ready', { token: 101 })).status, 401);
    assert.equal((await call('POST', '/api/owner/sample-orders', {})).status, 401);
  }
  const wrong = await app.browser()('POST', '/api/owner/sign-in', { username: OWNER.username, password: 'nope' });
  assert.equal(wrong.status, 401);
  const owner = await app.owner();
  assert.equal((await owner('GET', '/api/orders')).status, 401);   // and an owner is not a student
});

test('nobody can sign in to the sample account', async (t) => {
  const app = await start(); t.after(app.close);
  const res = await app.browser()('POST', '/api/sign-in', { usn: 'SAMPLE', pin: '!' });
  assert.equal(res.status, 401);
});

test('tokens join at the rear and know how many are ahead', async (t) => {
  const app = await start(); t.after(app.close);
  const a = await app.student(STUDENTS[0]);
  const b = await app.student(STUDENTS[1]);
  const first = (await buy(a)).data.order;
  const second = (await buy(b)).data.order;
  assert.deepEqual([first.number, first.ahead, second.number, second.ahead], [101, 0, 102, 1]);
  const s = await state(await app.owner());
  assert.deepEqual([s.kitchen.front, s.kitchen.rear, s.kitchen.count], [0, 1, 2]);
  assert.deepEqual(s.kitchen.orders.map((o) => [o.token, o.slot, o.name]),
    [[101, 0, STUDENTS[0].name], [102, 1, STUDENTS[1].name]]);
});

test('only the front order can be marked ready, and only once', async (t) => {
  const app = await start(); t.after(app.close);
  const student = await app.student();
  await buy(student); await buy(student);
  const owner = await app.owner();
  assert.equal((await ready(owner, 102)).status, 409);
  const moved = await ready(owner, 101);
  assert.equal(moved.status, 200);
  assert.equal(moved.data.kitchen.front, 1);
  assert.equal((await ready(owner, 101)).status, 409);            // a second click
  assert.equal((await state(owner)).shelf.count, 1);
  assert.equal((await student('GET', '/api/orders/1')).data.order.status, 'ready');
});

test('only a ready order can be handed over', async (t) => {
  const app = await start(); t.after(app.close);
  const student = await app.student();
  await buy(student);
  const owner = await app.owner();
  assert.equal((await handOver(owner, 101)).status, 409);
  await ready(owner, 101);
  const done = await handOver(owner, 101);
  assert.equal(done.status, 200);
  assert.deepEqual([done.data.shelf.count, done.data.collectedToday, done.data.paidToday], [0, 1, 20]);
  assert.equal((await handOver(owner, 101)).status, 409);
});

test('the queue fills at 50, then wraps round to slot 0', async (t) => {
  const app = await start(); t.after(app.close);
  const student = await app.student();
  for (let i = 0; i < 50; i++) assert.equal((await buy(student)).status, 201);
  const full = await buy(student);
  assert.equal(full.status, 409);
  assert.match(full.data.message, /kitchen is full/);
  assert.equal((await student('POST', '/api/quote', { items: [{ id: 6, qty: 1 }] })).data.kitchenFull, true);
  const owner = await app.owner();
  assert.equal((await owner('POST', '/api/owner/sample-orders', {})).status, 409);
  await ready(owner, 101);                                        // frees slot 0
  assert.equal((await buy(student)).status, 201);
  const s = await state(owner);
  assert.deepEqual([s.kitchen.front, s.kitchen.rear, s.kitchen.count], [1, 0, 50]);
});

test('an empty queue keeps going from where it stopped', async (t) => {
  const app = await start(); t.after(app.close);
  const student = await app.student();
  const owner = await app.owner();
  let s = await state(owner);
  assert.deepEqual([s.kitchen.front, s.kitchen.rear], [0, -1]);
  await buy(student);
  await ready(owner, 101);
  s = await state(owner);
  assert.deepEqual([s.kitchen.front, s.kitchen.rear, s.kitchen.count], [1, 0, 0]);
});

test('the pickup shelf holds 20', async (t) => {
  const app = await start(); t.after(app.close);
  const student = await app.student();
  for (let i = 0; i < 21; i++) await buy(student);
  const owner = await app.owner();
  for (let n = 101; n <= 120; n++) assert.equal((await ready(owner, n)).status, 200);
  const res = await ready(owner, 121);
  assert.equal(res.status, 409);
  assert.match(res.data.message, /shelf is full/);
});

test('the public board shows numbers only, newest ready first', async (t) => {
  const app = await start(); t.after(app.close);
  const student = await app.student();
  for (let i = 0; i < 3; i++) await buy(student);
  const owner = await app.owner();
  await ready(owner, 101);
  await ready(owner, 102);
  const { data } = await app.browser()('GET', '/api/board');
  const { kitchen, ...numbers } = data;
  assert.deepEqual(numbers, { preparing: [103], ready: [102, 101], capacity: 50 });
  // The round dial gets token numbers and slots only, never names.
  assert.deepEqual(kitchen.orders, [{ token: 103, slot: 2 }]);
  assert.equal(kitchen.front, 2);
  assert.equal(kitchen.rear, 2);
});

test('sample orders join the queue under sample names', async (t) => {
  const app = await start(); t.after(app.close);
  const owner = await app.owner();
  const res = await owner('POST', '/api/owner/sample-orders', {});
  assert.equal(res.status, 200);
  assert.equal(res.data.kitchen.count, 8);
  assert.ok(res.data.kitchen.orders.every((o) => o.name.endsWith('(sample)') && o.items.length));
});

test('a database from the first version is upgraded and keeps its orders', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'campusbite-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'old.db');
  const old = new DatabaseSync(file);
  old.exec(`
    CREATE TABLE students (id INTEGER PRIMARY KEY, usn TEXT NOT NULL UNIQUE, name TEXT NOT NULL, pin_hash TEXT NOT NULL);
    CREATE TABLE menu_items (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, section TEXT NOT NULL, price INTEGER NOT NULL, prep_min INTEGER NOT NULL);
    CREATE TABLE orders (id INTEGER PRIMARY KEY, number INTEGER NOT NULL UNIQUE, student_id INTEGER NOT NULL, request_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'preparing', total INTEGER NOT NULL, pay_method TEXT NOT NULL, eta_min INTEGER NOT NULL, placed_at INTEGER NOT NULL);
    INSERT INTO students VALUES (1, '1DS24CS017', 'Ananya Rao', 'aa:bb');
    INSERT INTO menu_items VALUES (1, 'Masala dosa', 'Meals', 45, 6);
    INSERT INTO orders VALUES (1, 101, 1, 'request-one', 'preparing', 45, 'upi', 6, 0), (2, 102, 1, 'request-two', 'preparing', 45, 'upi', 8, 0);
  `);
  old.close();

  for (let run = 0; run < 2; run++) {       // opening again must change nothing
    const db = openDatabase(file);
    assert.deepEqual(db.prepare('SELECT number, slot FROM orders ORDER BY id').all().map((r) => [r.number, r.slot]), [[101, 0], [102, 1]]);
    assert.equal(db.prepare('SELECT photo FROM menu_items WHERE id = 1').get().photo, 'masala-dosa');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM owners').get().n, 1);
    db.close();
  }
});
