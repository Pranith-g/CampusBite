import { useCallback, useEffect, useRef, useState } from 'react';
import { IconLayoutGrid, IconLogout, IconReceipt, IconReceiptRefund, IconShoppingBag, IconToolsKitchen2, IconWallet } from '@tabler/icons-react';
import { api } from '../api.js';
import { go, useCart, usePolled, useRoute, useWide } from '../hooks.js';
import { rupees } from '../format.js';
import Board from './Board.jsx';
import Cart from './Cart.jsx';
import Credits from './Credits.jsx';
import Menu from './Menu.jsx';
import OrderStatus from './OrderStatus.jsx';
import Orders from './Orders.jsx';

// Buzz the phone and change the tab title when one of your orders turns
// ready, or a dish runs out and a refund needs your choice.
function useAlerts(ready, owed) {
  const told = useRef(new Set());
  const ids = [...ready.map((o) => `r${o.id}`), ...owed.map((r) => `f${r.id}`)].join(',');
  useEffect(() => {
    const fresh = ids.split(',').filter((id) => id && !told.current.has(id));
    fresh.forEach((id) => told.current.add(id));
    if (fresh.length) navigator.vibrate?.([200, 100, 200]);
    document.title = ids.includes('f') ? 'Refund waiting · CampusBite' : ids ? 'Food ready · CampusBite' : 'CampusBite';
    return () => { document.title = 'CampusBite'; };
  }, [ids]);
}

export default function Shop({ student, onSignedOut }) {
  const route = useRoute();
  const wide = useWide();
  const cart = useCart(student.id);
  const [signOutError, setSignOutError] = useState('');

  // If the sign-in has expired, go back to the sign-in screen.
  const onError = useCallback((err) => {
    if (err.status === 401) onSignedOut();
  }, [onSignedOut]);

  // Your orders are watched on every screen, for the "ready" alert.
  const mine = usePolled(api.orders, 3000, onError);
  const orders = mine.data?.orders;
  const ready = (orders ?? []).filter((o) => o.status === 'ready');
  // Refunds for dishes that ran out, still waiting for the student to choose.
  const owed = (orders ?? []).flatMap((o) => o.refunds.filter((r) => !r.method).map((r) => ({ ...r, orderId: o.id })));
  const wallet = mine.data?.wallet ?? 0;
  useAlerts(ready, owed);

  // The menu is checked often, so prices and stock stay fresh.
  const { data: menu, error: menuError, refresh: reloadMenu } = usePolled(api.menu, 5000, onError);
  useEffect(() => { reloadMenu(); }, [route, reloadMenu]);
  const error = signOutError || menuError?.message;

  const signOut = async () => {
    try {
      await api.signOut();
      onSignedOut();
    } catch (err) {
      setSignOutError(err.message);
    }
  };

  const byId = new Map((menu?.items ?? []).map((m) => [m.id, m]));
  const lines = Object.entries(cart.qty)
    .map(([id, qty]) => ({ ...byId.get(Number(id)), qty }))
    .filter((l) => l.name);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0);

  const [page, orderId] = route.split('/');
  let screen = 'menu';
  if (page === 'orders') screen = orderId ? 'order' : 'orders';
  else if (page === 'tokens' || page === 'credits') screen = page;
  // On a wide screen the cart sits beside the menu, so it has no page of its own.
  else if (page === 'cart' && !wide) screen = 'cart';
  const tab = screen === 'order' ? 'orders' : screen === 'credits' ? 'menu' : screen;

  const tabs = [
    { id: 'menu', label: 'Menu', Icon: IconToolsKitchen2 },
    ...(wide ? [] : [{ id: 'cart', label: count ? `Cart (${count})` : 'Cart', Icon: IconShoppingBag }]),
    { id: 'tokens', label: 'Tokens', Icon: IconLayoutGrid },
    { id: 'orders', label: 'My orders', Icon: IconReceipt },
  ];

  const cartPanel = menu && (
    <Cart lines={lines} total={total} cart={cart} maxQty={menu.maxQty} onError={onError}
          onStale={reloadMenu} onPaid={mine.refresh} wallet={wallet} />
  );

  return (
    <>
      <header className="top">
        <div className="brand"><IconToolsKitchen2 size={20} aria-hidden="true" /> CampusBite</div>
        <nav className="tabs" aria-label="Sections">
          {tabs.map(({ id, label, Icon }) => (
            <a key={id} href={`#/${id}`} aria-current={tab === id ? 'page' : undefined}>
              <Icon size={22} stroke={1.75} aria-hidden="true" />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="who">
          {wallet > 0 && (
            <a className="wallet-chip num" href="#/orders" aria-label={`Canteen wallet ${rupees(wallet)}`}>
              <IconWallet size={18} aria-hidden="true" /> {rupees(wallet)}
            </a>
          )}
          <span>{student.name}</span>
          <button className="btn ghost" onClick={signOut}><IconLogout size={18} aria-hidden="true" /> Sign out</button>
        </div>
      </header>

      <div aria-live="assertive">
        {ready.filter((o) => !(screen === 'order' && String(o.id) === orderId)).map((o) => (
          <a key={o.id} className="ready-bar" href={`#/orders/${o.id}`}>
            <b className="cond num">{o.number}</b>
            <span><strong>Your food is ready</strong>Collect token {o.number} at the counter.</span>
          </a>
        ))}
        {owed.filter((r) => !(screen === 'order' && String(r.orderId) === orderId)).map((r) => (
          <a key={r.id} className="refund-bar" href={`#/orders/${r.orderId}`}>
            <IconReceiptRefund size={28} aria-hidden="true" />
            <span><strong>{r.items} ran out</strong>Choose where your {rupees(r.amount)} refund goes.</span>
          </a>
        ))}
      </div>

      {error && (
        <div className="banner" role="alert">
          <span>{error}</span>
          <button className="btn" onClick={reloadMenu}>Try again</button>
        </div>
      )}

      <main className={wide && screen === 'menu' ? 'page split' : 'page'}>
        {screen === 'orders' && <Orders orders={orders} error={mine.error} wallet={wallet} />}
        {screen === 'order' && <OrderStatus key={orderId} id={orderId} onError={onError} onChosen={mine.refresh} />}
        {screen === 'tokens' && <Board orders={orders ?? []} onError={onError} />}
        {screen === 'credits' && <Credits items={menu?.items ?? []} />}
        {screen === 'cart' && cartPanel}
        {screen === 'menu' && (menu ? <Menu menu={menu} cart={cart} /> : <p className="quiet">Loading the menu…</p>)}
        {screen === 'menu' && wide && <aside>{cartPanel}</aside>}
      </main>

      {screen === 'menu' && !wide && count > 0 && (
        <div className="cartbar">
          <button className="btn primary" onClick={() => go('cart')}>
            <span>{count} {count === 1 ? 'item' : 'items'} · {rupees(total)}</span>
            <span>View cart</span>
          </button>
        </div>
      )}
    </>
  );
}
