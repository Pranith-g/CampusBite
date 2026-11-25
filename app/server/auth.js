// Sign in, sign out, and "who is this request from?", for students and for
// the canteen owner. PINs and passwords are never stored as typed: only a
// salted scrypt hash is kept.
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { AppError } from './errors.js';

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_TRIES = 5;               // wrong tries allowed ...
const LOCK_MS = 60 * 1000;         // ... before this account has to wait

// The two kinds of account live in separate tables with separate sign-ins.
const KINDS = {
  student: {
    table: 'students', login: 'usn', hash: 'pin_hash', sessions: 'sessions', ref: 'student_id',
    clean: (v) => v.toUpperCase(), wrong: 'That USN and PIN do not match. Check both and try again.',
  },
  owner: {
    table: 'owners', login: 'username', hash: 'password_hash', sessions: 'owner_sessions', ref: 'owner_id',
    clean: (v) => v.toLowerCase(), wrong: 'That username and password do not match.',
  },
};

export function hashPin(secret) {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${scryptSync(secret, salt, 32).toString('hex')}`;
}

function matches(secret, stored) {
  const [salt, hash] = stored.split(':');
  if (!hash) return false;          // an account nobody can sign in to
  const given = scryptSync(secret, Buffer.from(salt, 'hex'), 32);
  return timingSafeEqual(given, Buffer.from(hash, 'hex'));
}

export function createAuth(db, kindName) {
  const kind = KINDS[kindName];
  const tries = new Map();         // login -> { count, until }
  const publicUser = (row) => ({ id: row.id, name: row.name, [kind.login]: row[kind.login] });

  return {
    signIn(login, secret) {
      const id = kind.clean(String(login ?? '').trim());
      const record = tries.get(id);
      if (record && record.count >= MAX_TRIES && Date.now() < record.until) {
        throw new AppError(429, 'Too many wrong tries. Wait a minute and try again.');
      }
      const user = db.prepare(`SELECT * FROM ${kind.table} WHERE ${kind.login} = ?`).get(id);
      if (!user || !matches(String(secret ?? ''), user[kind.hash])) {
        const stale = !record || Date.now() >= record.until;
        if (tries.size > 1000) tries.clear();
        tries.set(id, { count: stale ? 1 : record.count + 1, until: Date.now() + LOCK_MS });
        throw new AppError(401, kind.wrong);
      }
      tries.delete(id);
      db.prepare(`DELETE FROM ${kind.sessions} WHERE expires_at < ?`).run(Date.now());
      const token = randomBytes(32).toString('hex');
      db.prepare(`INSERT INTO ${kind.sessions} (token, ${kind.ref}, expires_at) VALUES (?, ?, ?)`)
        .run(token, user.id, Date.now() + SESSION_MS);
      return { token, maxAge: SESSION_MS / 1000, user: publicUser(user) };
    },

    signOut(token) {
      if (token) db.prepare(`DELETE FROM ${kind.sessions} WHERE token = ?`).run(token);
    },

    userFor(token) {
      if (!token) return null;
      const row = db.prepare(`
        SELECT u.* FROM ${kind.sessions} x JOIN ${kind.table} u ON u.id = x.${kind.ref}
        WHERE x.token = ? AND x.expires_at > ?`).get(token, Date.now());
      return row ? publicUser(row) : null;
    },
  };
}
