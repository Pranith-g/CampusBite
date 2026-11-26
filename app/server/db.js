// The database: one SQLite file, using the SQLite that is built into Node.
// If the file does not exist yet it is created and filled with the demo data.
// An older file is upgraded in place, so saved orders are kept.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { hashPin } from './auth.js';
import { MENU, NUTRITION, OWNER, SAMPLE_USN, START_QTY, STUDENTS } from './seed.js';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS students (
    id        INTEGER PRIMARY KEY,
    usn       TEXT NOT NULL UNIQUE,
    name      TEXT NOT NULL,
    pin_hash  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    student_id  INTEGER NOT NULL REFERENCES students(id),
    expires_at  INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS owners (
    id             INTEGER PRIMARY KEY,
    username       TEXT NOT NULL UNIQUE,
    name           TEXT NOT NULL,
    password_hash  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS owner_sessions (
    token       TEXT PRIMARY KEY,
    owner_id    INTEGER NOT NULL REFERENCES owners(id),
    expires_at  INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS menu_items (
    id        INTEGER PRIMARY KEY,
    name      TEXT NOT NULL UNIQUE,
    section   TEXT NOT NULL,
    price     INTEGER NOT NULL,
    prep_min  INTEGER NOT NULL,
    photo     TEXT,
    about     TEXT,                                  -- one line under the name on the menu
    kcal      INTEGER,                               -- rough calories for one serving
    protein_g INTEGER,                               -- rough protein in grams for one serving
    start_qty INTEGER NOT NULL DEFAULT ${START_QTY},  -- stock the owner started with
    left_qty  INTEGER NOT NULL DEFAULT ${START_QTY},  -- stock that can still be ordered
    sold_out  INTEGER NOT NULL DEFAULT 0              -- the owner's out-of-stock switch
  );
  CREATE TABLE IF NOT EXISTS orders (
    id            INTEGER PRIMARY KEY,
    number        INTEGER NOT NULL UNIQUE,   -- the token number
    student_id    INTEGER NOT NULL REFERENCES students(id),
    request_id    TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'preparing',  -- preparing, ready, collected, cancelled
    total         INTEGER NOT NULL,
    pay_method    TEXT NOT NULL,
    eta_min       INTEGER NOT NULL,
    placed_at     INTEGER NOT NULL,
    slot          INTEGER NOT NULL DEFAULT 0,  -- place in the circular queue
    ready_at      INTEGER,
    collected_at  INTEGER,
    label         TEXT,                        -- name shown for sample orders
    discount      INTEGER NOT NULL DEFAULT 0,  -- combo saving taken off the total
    UNIQUE (student_id, request_id)
  );
  CREATE TABLE IF NOT EXISTS order_items (
    order_id  INTEGER NOT NULL REFERENCES orders(id),
    item_id   INTEGER NOT NULL REFERENCES menu_items(id),
    name      TEXT NOT NULL,
    price     INTEGER NOT NULL,
    prep_min  INTEGER NOT NULL,
    qty       INTEGER NOT NULL,
    ran_out   INTEGER NOT NULL DEFAULT 0   -- 1 when the dish ran out after paying
  );
  CREATE TABLE IF NOT EXISTS favourites (
    student_id  INTEGER NOT NULL REFERENCES students(id),
    item_id     INTEGER NOT NULL REFERENCES menu_items(id),
    PRIMARY KEY (student_id, item_id)
  );
  CREATE TABLE IF NOT EXISTS refunds (
    id          INTEGER PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders(id),
    student_id  INTEGER NOT NULL REFERENCES students(id),
    amount      INTEGER NOT NULL,
    items       TEXT NOT NULL,     -- what ran out, like "2 × Masala dosa"
    created_at  INTEGER NOT NULL,
    method      TEXT,              -- wallet or original; empty until the student chooses
    chosen_at   INTEGER
  );
`;

// Columns added after the first version of the app.
const ADDED_COLUMNS = {
  menu_items: {
    photo: 'TEXT',
    about: 'TEXT',
    kcal: 'INTEGER',
    protein_g: 'INTEGER',
    start_qty: `INTEGER NOT NULL DEFAULT ${START_QTY}`,
    left_qty: `INTEGER NOT NULL DEFAULT ${START_QTY}`,
    sold_out: 'INTEGER NOT NULL DEFAULT 0',
  },
  order_items: { ran_out: 'INTEGER NOT NULL DEFAULT 0' },
  orders: { slot: 'INTEGER NOT NULL DEFAULT 0', ready_at: 'INTEGER', collected_at: 'INTEGER', label: 'TEXT', discount: 'INTEGER NOT NULL DEFAULT 0' },
};

export function openDatabase(file) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  upgrade(db);
  seed(db);
  return db;
}

function upgrade(db) {
  transaction(db, () => {
    for (const [table, columns] of Object.entries(ADDED_COLUMNS)) {
      const have = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
      for (const [name, type] of Object.entries(columns)) {
        if (have.has(name)) continue;
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
        // Orders saved before tokens had slots take them in the order placed.
        if (name === 'slot') {
          db.exec('UPDATE orders SET slot = (SELECT COUNT(*) FROM orders earlier WHERE earlier.id < orders.id) % 50');
        }
      }
    }
  });
}

// Fill in the demo data that is missing. Existing rows are left alone.
function seed(db) {
  const empty = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n === 0;

  if (empty('menu_items')) {
    const add = db.prepare('INSERT INTO menu_items (name, section, price, prep_min, photo, about) VALUES (?, ?, ?, ?, ?, ?)');
    for (const item of MENU) add.run(...item);
  }
  const setPhoto = db.prepare('UPDATE menu_items SET photo = ? WHERE name = ? AND photo IS NULL');
  for (const [name, , , , photo] of MENU) setPhoto.run(photo, name);
  const setAbout = db.prepare('UPDATE menu_items SET about = ? WHERE name = ? AND about IS NULL');
  for (const [name, , , , , about] of MENU) setAbout.run(about, name);
  const setNutrition = db.prepare('UPDATE menu_items SET kcal = ?, protein_g = ? WHERE name = ? AND kcal IS NULL');
  for (const [name, [kcal, protein]] of Object.entries(NUTRITION)) setNutrition.run(kcal, protein, name);

  if (empty('students')) {
    const add = db.prepare('INSERT INTO students (usn, name, pin_hash) VALUES (?, ?, ?)');
    for (const s of STUDENTS) add.run(s.usn, s.name, hashPin(s.pin));
  }
  // Sample orders belong to this account. "!" is not a hash, so nobody can sign in to it.
  db.prepare("INSERT OR IGNORE INTO students (usn, name, pin_hash) VALUES (?, 'Sample order', '!')").run(SAMPLE_USN);

  if (empty('owners')) {
    db.prepare('INSERT INTO owners (username, name, password_hash) VALUES (?, ?, ?)')
      .run(OWNER.username, OWNER.name, hashPin(OWNER.password));
  }
}

// Run several changes as one: either all of them are saved or none are.
export function transaction(db, work) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
