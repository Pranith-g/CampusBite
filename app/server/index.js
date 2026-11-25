// Starts the CampusBite app.
//   PORT     port to listen on (default 4000; hosting services set this)
//   HOST     0.0.0.0 lets other devices reach it. Default: this computer only,
//            or 0.0.0.0 when a hosting service has set PORT.
//   DB_FILE  where the database file lives
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db.js';
import { createServer } from './app.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');

const db = openDatabase(process.env.DB_FILE || join(root, 'data', 'app.db'));
createServer(db, { dist: join(root, 'web', 'dist') }).listen(port, host, () => {
  console.log(`CampusBite app: http://localhost:${port}`);
});
