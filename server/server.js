/*
 * server.js - bridge between the dashboard and the C program
 *
 * Starts  build/campusbite.exe --pipe  once and keeps it running.
 * The browser sends HTTP requests here; each one becomes a single text
 * command on the C program's stdin, and the single JSON line it prints
 * back is returned as the HTTP response.
 *
 * Uses only Node's built-in modules: nothing to npm install.
 *
 *   GET  /api/state            -> STATE
 *   GET  /api/menu             -> MENU
 *   POST /api/command          -> { "command": "PLACE", "args": ["Ananya Rao", "1DS24CS017", "0:2,10:1"] }
 *   anything else              -> files from dashboard/dist (the built dashboard)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

const PORT = Number(process.env.PORT) || 3001;
const ROOT = path.resolve(__dirname, '..');
const EXE = path.join(ROOT, 'build', process.platform === 'win32' ? 'campusbite.exe' : 'campusbite');
const DIST = path.join(ROOT, 'dashboard', 'dist');

// Commands the dashboard may send, and how many arguments each takes.
const COMMANDS = { STATE: 0, MENU: 0, PLACE: 3, READY: 0, HANDOVER: 0, CANCEL: 1, SEARCH: 1, RUSH: 0, SUMMARY: 0, NEWDAY: 0 };

// ---------- the C program ----------

let child = null;
let waiting = [];            // resolve functions, oldest first: one per command sent
let chain = Promise.resolve(); // commands run one at a time, in order

function startChild() {
  if (!fs.existsSync(EXE)) {
    console.error(`Cannot find ${EXE}. Run build.bat first.`);
    process.exit(1);
  }
  child = spawn(EXE, ['--pipe'], { cwd: ROOT, stdio: ['pipe', 'pipe', 'inherit'] });
  const lines = readline.createInterface({ input: child.stdout });
  lines.on('line', (line) => {
    const resolve = waiting.shift();
    if (resolve) resolve(line);
  });
  child.on('exit', (code) => {
    console.error(`C program exited (code ${code}). Restarting...`);
    waiting.forEach((resolve) => resolve(JSON.stringify({ ok: false, code: 'ERROR', message: 'The C program restarted. Try again.' })));
    waiting = [];
    setTimeout(startChild, 500);
  });
  console.log(`C program started: ${path.relative(ROOT, EXE)} --pipe`);
}

// Send one command line and wait for its one reply line.
function send(line) {
  const run = () => new Promise((resolve) => {
    waiting.push(resolve);
    child.stdin.write(line + '\n');
  });
  const result = chain.then(run, run);
  chain = result.catch(() => {});
  return result;
}

// Build a safe command line: a '|' or a newline inside an argument
// would break the C program's parser, so they are removed.
function buildLine(command, args) {
  if (!Object.prototype.hasOwnProperty.call(COMMANDS, command)) return null;
  const list = Array.isArray(args) ? args : [];
  if (list.length !== COMMANDS[command]) return null;
  const clean = list.map((a) => String(a).replace(/[|\r\n]/g, ' ').trim().slice(0, 200));
  return [command, ...clean].join('|');
}

// ---------- HTTP ----------

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
                '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

function sendJson(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(text);
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let file = path.normalize(path.join(DIST, urlPath));
  if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  if (!fs.existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Dashboard not built yet. Run: cd dashboard && npm run build');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/state') return sendJson(res, 200, await send('STATE'));
    if (req.method === 'GET' && req.url === '/api/menu') return sendJson(res, 200, await send('MENU'));
    if (req.method === 'POST' && req.url === '/api/command') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 10000) return sendJson(res, 413, JSON.stringify({ ok: false, message: 'Request too large.' }));
      }
      let data;
      try { data = JSON.parse(body); } catch { return sendJson(res, 400, JSON.stringify({ ok: false, message: 'Body must be JSON.' })); }
      const line = buildLine(data.command, data.args);
      if (!line) return sendJson(res, 400, JSON.stringify({ ok: false, message: 'Unknown command or wrong number of arguments.' }));
      return sendJson(res, 200, await send(line));
    }
    if (req.url.startsWith('/api/')) return sendJson(res, 404, JSON.stringify({ ok: false, message: 'No such API route.' }));
    return serveStatic(req, res);
  } catch (err) {
    console.error(err);
    sendJson(res, 500, JSON.stringify({ ok: false, message: 'Bridge error.' }));
  }
});

startChild();
server.listen(PORT, '127.0.0.1', () => console.log(`CampusBite dashboard: http://localhost:${PORT}`));
