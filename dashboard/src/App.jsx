import { useCallback, useEffect, useRef, useState } from 'react';
import { IconAlertTriangle, IconCircleCheck, IconPlugConnectedX } from '@tabler/icons-react';
import { getMenu, getState, sendCommand } from './api.js';
import TopBar from './components/TopBar.jsx';
import OrderForm from './components/OrderForm.jsx';
import KitchenQueue from './components/KitchenQueue.jsx';
import PickupShelf from './components/PickupShelf.jsx';
import LastOperation from './components/LastOperation.jsx';
import StudentBoard from './components/StudentBoard.jsx';

const POLL_MS = 2000; // keeps a second screen (e.g. the student board) in sync

export default function App() {
  // Open http://localhost:3001/#board on a second screen to show only the student board.
  const [view, setViewState] = useState(window.location.hash === '#board' ? 'board' : 'counter');
  const setView = (v) => {
    setViewState(v);
    window.history.replaceState(null, '', v === 'board' ? '#board' : '#');
  };
  const [menu, setMenu] = useState(null);
  const [state, setState] = useState(null);
  const [ops, setOps] = useState({ current: null, history: [] });
  const [banner, setBanner] = useState(null); // { kind: 'ok' | 'bad', text }
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(false); // a command is on its way to C
  const busy = useRef(false);
  const version = useRef(0);                      // bumped by every command
  const lastSent = useRef({ command: '', at: 0 });

  // Fetch the latest state from C. Used on start and by the poll timer.
  const refresh = useCallback(async () => {
    if (busy.current) return;
    const asked = version.current;
    try {
      const reply = await getState();
      // A command finished while this poll was in flight: its reply is newer, keep it.
      if (version.current !== asked) return;
      setState(reply.state);
      if (reply.ops) setOps(reply.ops);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    getMenu().then((m) => setMenu(m)).catch(() => setOffline(true));
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // Send one command to C and redraw from its reply.
  // While a command is on its way, action buttons are disabled, so a
  // double-click can't move a second order by accident.
  const run = useCallback(async (command, args = []) => {
    if (busy.current) return { ok: false, message: 'Still working on the last action.' };
    // The same action twice within 400 ms is a double-click, not a second order.
    const now = Date.now();
    if (command !== 'STATE' && command === lastSent.current.command && now - lastSent.current.at < 400) {
      return { ok: false, message: 'Ignored a double-click.' };
    }
    lastSent.current = { command, at: now };
    busy.current = true;
    version.current += 1;
    setPending(true);
    try {
      const reply = await sendCommand(command, args);
      if (reply.state) setState(reply.state);
      if (reply.ops) setOps(reply.ops);
      setOffline(false);
      return reply;
    } catch {
      setOffline(true);
      return { ok: false, message: "Can't reach the C program." };
    } finally {
      busy.current = false;
      setPending(false);
    }
  }, []);

  const search = async (query) => {
    const reply = await run('SEARCH', [query]);
    setBanner({ kind: reply.ok ? 'ok' : 'bad', text: reply.message });
  };

  if (!state || !menu) {
    return (
      <div className="center-screen">
        {offline ? (
          <div>
            <IconPlugConnectedX size={32} stroke={1.75} aria-hidden="true" />
            <h2>Can't reach the C program</h2>
            <p>Start everything with <code>start.bat</code>, then reload this page.</p>
          </div>
        ) : (
          <p>Connecting to the C program…</p>
        )}
      </div>
    );
  }

  const menuItems = menu.menu;

  return (
    <>
      <TopBar state={state} view={view} onView={setView} onSearch={search} />
      {offline && (
        <div className="banner bad" role="alert">
          <IconPlugConnectedX size={18} aria-hidden="true" />
          Lost connection to the C program. Showing the last known state.
        </div>
      )}
      {banner && (
        <div className={`banner ${banner.kind}`} role="status">
          {banner.kind === 'ok' ? <IconCircleCheck size={18} aria-hidden="true" /> : <IconAlertTriangle size={18} aria-hidden="true" />}
          {banner.text}
          <button className="btn ghost" onClick={() => setBanner(null)}>Dismiss</button>
        </div>
      )}
      <main>
        {view === 'counter' ? (
          <div className="counter">
            <div className="col">
              <OrderForm menu={menuItems} limits={menu} state={state} run={run} />
            </div>
            <div className="col">
              <KitchenQueue kitchen={state.kitchen} shelf={state.shelf} menu={menuItems} run={run} pending={pending} />
            </div>
            <div className="col">
              <PickupShelf shelf={state.shelf} menu={menuItems} run={run} pending={pending} />
              <LastOperation ops={ops} />
            </div>
          </div>
        ) : (
          <StudentBoard state={state} />
        )}
      </main>
    </>
  );
}
