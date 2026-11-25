// Tests the owner's stock controls and how orders use up stock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../server/db.js';
import { createServer } from '../server/app.js';
import { OWNER, START_QTY, STUDENTS } from '../server/seed.js';

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
  const student = browser();
  await student('POST', '/api/sign-in', { usn: STUDENTS[0].usn, pin: STUDENTS[0].pin });
  const owner = browser();
  await owner('POST', '/api/owner/sign-in', { username: OWNER.username, password: OWNER.password });
  const set = (change) => owner('POST', '/api/owner/stock', change);
  const buy = (items, requestId = crypto.randomUUID()) => student('POST', '/api/orders', { items, payMethod: 'upi', requestId });
  const dish = async (id) => (await browser()('GET', '/api/menu')).data.items.find((m) => m.id === id);
  return { db, browser, student, owner, set, buy, dish, close: () => { server.close(); db.close(); } };
}

test('every dish starts in stock', async (t) => {
  const app = await start(); t.after(app.close);
  const { data } = await app.owner('GET', '/api/owner/stock');
  assert.equal(data.items.length, 15);
  assert.ok(data.items.every((i) => i.start === START_QTY && i.left === START_QTY && !i.switchedOff));
  assert.equal((await app.dish(1)).soldOut, false);
});

test('only the owner can see or change stock', async (t) => {
  const app = await start(); t.after(app.close);
  for (const call of [app.browser(), app.student]) {
    assert.equal((await call('GET', '/api/owner/stock')).status, 401);
    assert.equal((await call('POST', '/api/owner/stock', { id: 1, left: 0 })).status, 401);
  }
  assert.equal((await app.dish(1)).left, START_QTY);
});

test('the owner sets the starting quantity and updates what is left', async (t) => {
  const app = await start(); t.after(app.close);
  await app.set({ id: 1, start: 25, left: 25 });
  const res = await app.set({ id: 1, left: 18 });
  const item = res.data.items.find((i) => i.id === 1);
  assert.deepEqual([item.start, item.left], [25, 18]);
});

test('bad stock changes are refused', async (t) => {
  const app = await start(); t.after(app.close);
  for (const change of [{ id: 1, left: -1 }, { id: 1, left: 1000 }, { id: 1, left: 2.5 }, { id: 1, start: '5' },
    { id: 1, switchedOff: 'yes' }, { id: 1 }, { left: 5 }]) {
    assert.equal((await app.set(change)).status, 400, JSON.stringify(change));
  }
  assert.equal((await app.set({ id: 999, left: 5 })).status, 404);
  assert.equal((await app.dish(1)).left, START_QTY);
});

test('paying takes stock once, even if sent twice', async (t) => {
  const app = await start(); t.after(app.close);
  const id = crypto.randomUUID();
  await app.buy([{ id: 1, qty: 3 }], id);
  await app.buy([{ id: 1, qty: 3 }], id);
  assert.equal((await app.dish(1)).left, START_QTY - 3);
});

test('nobody can order more than is left, and a refused order takes nothing', async (t) => {
  const app = await start(); t.after(app.close);
  await app.set({ id: 2, left: 2 });
  const res = await app.buy([{ id: 1, qty: 1 }, { id: 2, qty: 3 }]);
  assert.equal(res.status, 409);
  assert.equal(res.data.message, 'Only 2 Idli vada left. Lower the quantity.');
  assert.equal((await app.dish(1)).left, START_QTY);              // the first dish was not taken
  assert.equal((await app.dish(2)).left, 2);
  assert.equal((await app.student('GET', '/api/orders')).data.orders.length, 0);
});

test('selling the last one makes a dish out of stock', async (t) => {
  const app = await start(); t.after(app.close);
  await app.set({ id: 2, left: 1 });
  assert.equal((await app.buy([{ id: 2, qty: 1 }])).status, 201);
  assert.deepEqual([(await app.dish(2)).left, (await app.dish(2)).soldOut], [0, true]);
  const res = await app.buy([{ id: 2, qty: 1 }]);
  assert.equal(res.status, 409);
  assert.match(res.data.message, /out of stock/);
});

test('the out of stock switch stops orders until it is turned back on', async (t) => {
  const app = await start(); t.after(app.close);
  await app.set({ id: 1, switchedOff: true });
  assert.equal((await app.dish(1)).soldOut, true);
  assert.equal((await app.buy([{ id: 1, qty: 1 }])).status, 409);
  assert.equal((await app.owner('GET', '/api/owner/state')).data.outOfStock, 1);
  await app.set({ id: 1, switchedOff: false });
  assert.equal((await app.buy([{ id: 1, qty: 1 }])).status, 201);
});

test('sample orders use only what is available', async (t) => {
  const app = await start(); t.after(app.close);
  for (let id = 2; id <= 15; id++) await app.set({ id, switchedOff: true });
  await app.set({ id: 1, left: 3 });
  const res = await app.owner('POST', '/api/owner/sample-orders', {});
  assert.equal(res.status, 200);
  assert.ok(res.data.kitchen.count >= 2 && res.data.kitchen.count <= 3);
  assert.equal((await app.dish(1)).left, 0);
  assert.equal((await app.owner('POST', '/api/owner/sample-orders', {})).status, 409);
});

test('a database saved before stock existed is upgraded', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'campusbite-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'old.db');
  const old = new DatabaseSync(file);
  old.exec(`
    CREATE TABLE menu_items (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, section TEXT NOT NULL, price INTEGER NOT NULL, prep_min INTEGER NOT NULL, photo TEXT);
    INSERT INTO menu_items VALUES (1, 'Masala dosa', 'Meals', 45, 6, 'masala-dosa');
  `);
  old.close();
  const db = openDatabase(file);
  const row = db.prepare('SELECT start_qty, left_qty, sold_out FROM menu_items WHERE id = 1').get();
  assert.deepEqual({ ...row }, { start_qty: START_QTY, left_qty: START_QTY, sold_out: 0 });
  db.close();
});
