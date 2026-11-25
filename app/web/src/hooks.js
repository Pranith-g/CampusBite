import { useCallback, useEffect, useRef, useState } from 'react';

// A 32-character random id. (crypto.randomUUID is not available when a phone
// opens the app over plain http on the local network, so it is not used.)
const newId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');

const emptyCart = () => ({ qty: {}, requestId: newId() });

function savedCart(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved?.qty && saved?.requestId) return saved;
  } catch {
    // Private windows can block storage. The cart then lasts until reload.
  }
  return emptyCart();
}

// The cart: { itemId: quantity }, kept on this phone for this student.
export function useCart(studentId) {
  const key = `campusbite-cart-${studentId}`;
  const [cart, setCart] = useState(() => savedCart(key));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(cart));
    } catch {
      // See above.
    }
  }, [key, cart]);

  // Changing the cart makes it a different order, so it gets a new request id.
  const change = useCallback((id, delta, max) => {
    setCart((prev) => {
      const now = prev.qty[id] || 0;
      const next = Math.max(0, Math.min(max, now + delta));
      if (next === now) return prev;
      const qty = { ...prev.qty, [id]: next };
      if (!next) delete qty[id];
      return { qty, requestId: newId() };
    });
  }, []);

  const clear = useCallback(() => setCart(emptyCart()), []);

  return { qty: cart.qty, requestId: cart.requestId, change, clear };
}

// Load something now, then again every `ms` milliseconds. refresh() loads it
// again at once. An answer to an older request is thrown away, so a slow
// reply can never overwrite a newer one.
export function usePolled(load, ms, onError) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const errorHandler = useRef(onError);
  errorHandler.current = onError;
  const poll = useRef(() => {});

  useEffect(() => {
    let live = true;
    let timer;
    let latest = 0;
    setData(null);
    setError(null);
    const tick = async () => {
      clearTimeout(timer);
      const mine = ++latest;
      try {
        const result = await load();
        if (!live || mine !== latest) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (!live || mine !== latest) return;
        errorHandler.current?.(err);
        setError(err);
      }
      timer = setTimeout(tick, ms);
    };
    poll.current = tick;
    tick();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [load, ms]);

  const refresh = useCallback(() => poll.current(), []);
  return { data, error, refresh };
}

// The screen being shown comes from the address bar (#/menu, #/orders/3),
// so the phone's Back button works.
const readRoute = () => window.location.hash.replace(/^#\/?/, '') || 'menu';

export const go = (to) => {
  window.location.hash = `/${to}`;
};

export function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const changed = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  return route;
}

export function useWide() {
  const query = '(min-width: 900px)';
  const [wide, setWide] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const changed = () => setWide(media.matches);
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);
  return wide;
}
