// Tests the calories and protein shown for each dish.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../server/db.js';
import { listMenu } from '../server/orders.js';
import { MENU, NUTRITION } from '../server/seed.js';

test('every dish on the menu has calories and protein', () => {
  const db = openDatabase(':memory:');
  const menu = listMenu(db);
  assert.equal(menu.length, MENU.length);
  for (const dish of menu) {
    assert.deepEqual([dish.kcal, dish.protein], NUTRITION[dish.name], dish.name);
    assert.ok(dish.kcal > 0 && dish.protein >= 0, dish.name);
  }
  db.close();
});

test('the high-protein dishes are the thali, chole bhature and paneer roll', () => {
  const db = openDatabase(':memory:');
  const high = listMenu(db).filter((d) => d.protein >= 15).map((d) => d.name);
  assert.deepEqual(high, ['Veg thali', 'Chole bhature', 'Paneer roll']);
  db.close();
});

test('an older database gets the numbers filled in, and owner changes are kept', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cb-nutrition-'));
  const file = join(dir, 'old.db');
  try {
    // A menu table from before calories existed.
    const old = new DatabaseSync(file);
    old.exec(`CREATE TABLE menu_items (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, section TEXT NOT NULL,
              price INTEGER NOT NULL, prep_min INTEGER NOT NULL)`);
    old.exec("INSERT INTO menu_items (name, section, price, prep_min) VALUES ('Masala dosa', 'Meals', 45, 6)");
    old.close();

    let db = openDatabase(file);
    assert.deepEqual([listMenu(db)[0].kcal, listMenu(db)[0].protein], [380, 8]);
    db.prepare("UPDATE menu_items SET kcal = 400 WHERE name = 'Masala dosa'").run();
    db.close();

    db = openDatabase(file);
    assert.equal(listMenu(db)[0].kcal, 400);
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
