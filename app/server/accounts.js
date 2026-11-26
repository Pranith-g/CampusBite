// Creating accounts. Students sign up with their USN and a PIN. A canteen
// owner can sign up only with the canteen code, so a stranger cannot make an
// owner account and see every order.
import { timingSafeEqual } from 'node:crypto';
import { hashPin } from './auth.js';
import { AppError } from './errors.js';

// 1 digit, 2 letters, 2 digits, 2 letters, 3 digits, like 1DS24CS017.
export const USN_PATTERN = /^\d[A-Z]{2}\d{2}[A-Z]{2}\d{3}$/;
const NAME_PATTERN = /^[\p{L}][\p{L} .'-]{1,39}$/u;
const USERNAME_PATTERN = /^[a-z0-9._-]{3,20}$/;
const MAX_CODE_TRIES = 5;     // wrong canteen codes allowed ...
const CODE_LOCK_MS = 60 * 1000;   // ... before owner sign-up waits a minute

const cleanName = (name) => String(name ?? '').trim().replace(/\s+/g, ' ');

function checkName(name) {
  if (!NAME_PATTERN.test(name)) throw new AppError(400, 'Enter your name, 2 to 40 letters.');
}

export function registerStudent(db, body) {
  const usn = String(body?.usn ?? '').trim().toUpperCase();
  const name = cleanName(body?.name);
  const pin = String(body?.pin ?? '');
  if (!USN_PATTERN.test(usn)) throw new AppError(400, 'Enter a valid USN: 10 characters like 1DS24CS017.');
  checkName(name);
  if (!/^\d{4,6}$/.test(pin)) throw new AppError(400, 'Choose a PIN of 4 to 6 digits.');
  const taken = db.prepare('SELECT 1 FROM students WHERE usn = ?').get(usn);
  if (taken) throw new AppError(409, `An account for ${usn} already exists. Sign in instead.`);
  db.prepare('INSERT INTO students (usn, name, pin_hash) VALUES (?, ?, ?)').run(usn, name, hashPin(pin));
  return { usn, pin };
}

const sameText = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// One counter for the whole server: guessing the code is slowed down.
export function createOwnerSignUp(db, canteenCode) {
  let wrong = { count: 0, until: 0 };
  return (body) => {
    if (wrong.count >= MAX_CODE_TRIES && Date.now() < wrong.until) {
      throw new AppError(429, 'Too many wrong canteen codes. Wait a minute and try again.');
    }
    const username = String(body?.username ?? '').trim().toLowerCase();
    const name = cleanName(body?.name);
    const password = String(body?.password ?? '');
    const code = String(body?.code ?? '').trim();
    if (!sameText(code, canteenCode)) {
      wrong = { count: Date.now() >= wrong.until ? 1 : wrong.count + 1, until: Date.now() + CODE_LOCK_MS };
      throw new AppError(403, 'That canteen code is wrong. Ask the canteen manager for it.');
    }
    wrong = { count: 0, until: 0 };
    if (!USERNAME_PATTERN.test(username)) {
      throw new AppError(400, 'Choose a username of 3 to 20 small letters, digits, dots or dashes.');
    }
    checkName(name);
    if (password.length < 8 || password.length > 100) throw new AppError(400, 'Choose a password of at least 8 characters.');
    const taken = db.prepare('SELECT 1 FROM owners WHERE username = ?').get(username);
    if (taken) throw new AppError(409, `The username ${username} is taken. Choose another.`);
    db.prepare('INSERT INTO owners (username, name, password_hash) VALUES (?, ?, ?)').run(username, name, hashPin(password));
    return { username, password };
  };
}

// Favourite dishes, one row per student and dish.
export function favourites(db, studentId) {
  return db.prepare('SELECT item_id AS id FROM favourites WHERE student_id = ? ORDER BY item_id').all(studentId).map((r) => r.id);
}

export function setFavourite(db, studentId, body) {
  const { itemId, favourite } = body ?? {};
  if (!Number.isInteger(itemId) || typeof favourite !== 'boolean') throw new AppError(400, 'Which dish?');
  if (!db.prepare('SELECT 1 FROM menu_items WHERE id = ?').get(itemId)) throw new AppError(404, 'That dish is not on the menu.');
  if (favourite) db.prepare('INSERT OR IGNORE INTO favourites (student_id, item_id) VALUES (?, ?)').run(studentId, itemId);
  else db.prepare('DELETE FROM favourites WHERE student_id = ? AND item_id = ?').run(studentId, itemId);
  return favourites(db, studentId);
}
