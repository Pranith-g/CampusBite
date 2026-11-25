// The web server: the /api routes, plus the built screens from web/dist.
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { createAuth } from './auth.js';
import { AppError } from './errors.js';
import { board, handOver, markReady, ownerState } from './kitchen.js';
import { COOKS, MAX_QTY, getOrder, kitchenLoad, listMenu, listOrders, placeOrder, quote } from './orders.js';
import { chooseRefund, markRanOut, walletBalance } from './refunds.js';
import { addSampleOrders } from './samples.js';
import { listStock, updateStock } from './stock.js';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
                '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

const STUDENT_COOKIE = 'cb_student';
const OWNER_COOKIE = 'cb_owner';

function readCookie(req, name) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [key, value] = part.trim().split('=');
    if (key === name) return value;
  }
  return null;
}

function cookie(req, name, value, maxAge) {
  // Hosting services add HTTPS in front of the app and say so in this header.
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

async function readBody(req) {
  if (!(req.headers['content-type'] ?? '').startsWith('application/json')) {
    throw new AppError(415, 'Send the request as JSON.');
  }
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 10000) throw new AppError(413, 'Request too large.');
  }
  try {
    return JSON.parse(body || '{}') ?? {};
  } catch {
    throw new AppError(400, 'Send the request as JSON.');
  }
}

function send(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(data));
}

function serveFile(req, res, dist) {
  let path;
  try {
    path = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  let file = normalize(join(dist, path));
  if (file !== dist && !file.startsWith(dist + sep)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('The screens are not built yet. In the app folder run: npm run build');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
  createReadStream(file).pipe(res);
}

export function createServer(db, options) {
  const students = createAuth(db, 'student');
  const owners = createAuth(db, 'owner');
  const dist = resolve(options.dist);

  // The canteen owner's routes. Only an owner sign-in opens them.
  async function ownerApi(req, res, route) {
    const token = readCookie(req, OWNER_COOKIE);

    if (route === 'POST /api/owner/sign-in') {
      const { username, password } = await readBody(req);
      const session = owners.signIn(username, password);
      return send(res, 200, { owner: session.user }, { 'Set-Cookie': cookie(req, OWNER_COOKIE, session.token, session.maxAge) });
    }
    if (route === 'POST /api/owner/sign-out') {
      await readBody(req);
      owners.signOut(token);
      return send(res, 200, {}, { 'Set-Cookie': cookie(req, OWNER_COOKIE, '', 0) });
    }
    if (route === 'GET /api/owner/me') return send(res, 200, { owner: owners.userFor(token) });

    if (!owners.userFor(token)) throw new AppError(401, 'Please sign in as the canteen owner.');

    if (route === 'GET /api/owner/state') return send(res, 200, ownerState(db));
    // Each action answers with the new state, so the screen updates at once.
    if (route === 'POST /api/owner/ready') {
      markReady(db, (await readBody(req)).token);
      return send(res, 200, ownerState(db));
    }
    if (route === 'POST /api/owner/hand-over') {
      handOver(db, (await readBody(req)).token);
      return send(res, 200, ownerState(db));
    }
    if (route === 'POST /api/owner/ran-out') {
      const done = markRanOut(db, await readBody(req));
      return send(res, 200, { ...ownerState(db), done });
    }
    if (route === 'GET /api/owner/stock') return send(res, 200, { items: listStock(db) });
    if (route === 'POST /api/owner/stock') {
      updateStock(db, await readBody(req));
      return send(res, 200, { items: listStock(db) });
    }
    if (route === 'POST /api/owner/sample-orders') {
      await readBody(req);
      addSampleOrders(db);
      return send(res, 200, ownerState(db));
    }
    throw new AppError(404, 'No such API route.');
  }

  async function api(req, res, path) {
    const route = `${req.method} ${path}`;
    if (path.startsWith('/api/owner/')) return ownerApi(req, res, route);

    const token = readCookie(req, STUDENT_COOKIE);

    if (route === 'POST /api/sign-in') {
      const { usn, pin } = await readBody(req);
      const session = students.signIn(usn, pin);
      return send(res, 200, { student: session.user }, { 'Set-Cookie': cookie(req, STUDENT_COOKIE, session.token, session.maxAge) });
    }
    if (route === 'POST /api/sign-out') {
      await readBody(req);
      students.signOut(token);
      return send(res, 200, {}, { 'Set-Cookie': cookie(req, STUDENT_COOKIE, '', 0) });
    }
    if (route === 'GET /api/me') return send(res, 200, { student: students.userFor(token) });
    if (route === 'GET /api/board') return send(res, 200, board(db));
    if (route === 'GET /api/menu') {
      return send(res, 200, { items: listMenu(db), maxQty: MAX_QTY, cooks: COOKS, load: kitchenLoad(db) });
    }

    // Everything below needs a signed-in student.
    const student = students.userFor(token);
    if (!student) throw new AppError(401, 'Please sign in.');

    if (route === 'POST /api/quote') return send(res, 200, quote(db, (await readBody(req)).items));
    if (route === 'POST /api/orders') {
      const body = await readBody(req);
      return send(res, 201, { order: placeOrder(db, student, body) });
    }
    if (route === 'GET /api/orders') {
      return send(res, 200, { orders: listOrders(db, student), wallet: walletBalance(db, student.id) });
    }
    const refund = req.method === 'POST' && path.match(/^\/api\/refunds\/(\d{1,12})$/);
    if (refund) {
      chooseRefund(db, student, Number(refund[1]), (await readBody(req)).method);
      return send(res, 200, { orders: listOrders(db, student), wallet: walletBalance(db, student.id) });
    }
    const one = req.method === 'GET' && path.match(/^\/api\/orders\/(\d{1,12})$/);
    if (one) return send(res, 200, { order: getOrder(db, student, Number(one[1])) });

    throw new AppError(404, 'No such API route.');
  }

  return http.createServer(async (req, res) => {
    try {
      const path = req.url.split('?')[0];
      if (path.startsWith('/api/')) await api(req, res, path);
      else serveFile(req, res, dist);
    } catch (err) {
      if (err instanceof AppError) return send(res, err.status, { message: err.message });
      console.error(err);
      send(res, 500, { message: 'Something went wrong on the server.' });
    }
  });
}
