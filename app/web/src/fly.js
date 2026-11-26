// "Food drops into the cart": a small round copy of the dish photo arcs from
// the Add button to the cart, then the cart gives a small bounce. It shows
// where the dish went. Only transform and opacity move, so it stays smooth.
const EASE_MOVE = 'cubic-bezier(0.77, 0, 0.175, 1)';   // on-screen movement
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const FLIGHT_MS = 560;
const SIZE = 48;

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// The cart that is on screen right now: the Cart tab on a phone, the cart
// panel's title on a laptop.
// If it is off screen (the page is scrolled), the food still flies to the
// nearest edge of the screen in its direction, so the drop is always seen.
function cartTarget() {
  const shown = [...document.querySelectorAll('[data-cart-target]')].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  return shown.find((el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }) ?? shown[0];
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function bounce(el) {
  el.getAnimations().forEach((a) => a.cancel());
  if (reduceMotion()) {
    el.animate([{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 300, easing: 'ease' });
    return;
  }
  el.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }],
    { duration: 320, easing: EASE_OUT },
  );
}

export function flyToCart(fromEl, photo) {
  const target = cartTarget();
  if (!fromEl || !target) return;
  if (reduceMotion() || !photo) { bounce(target); return; }

  const from = fromEl.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const x0 = from.left + from.width / 2 - SIZE / 2;
  const y0 = from.top + from.height / 2 - SIZE / 2;
  const dx = clamp(to.left + to.width / 2, SIZE, window.innerWidth - SIZE) - SIZE / 2 - x0;
  const dy = clamp(to.top + to.height / 2, SIZE, window.innerHeight - SIZE) - SIZE / 2 - y0;
  const lift = Math.min(90, Math.abs(dx) * 0.25 + 40);   // how high the arc goes

  const dot = document.createElement('img');
  dot.src = `/food/${photo}.jpg`;
  dot.alt = '';
  dot.className = 'fly-dot';
  dot.style.left = `${x0}px`;
  dot.style.top = `${y0}px`;
  document.body.append(dot);

  const flight = dot.animate([
    { transform: 'translate(0, 0) scale(0.9)', opacity: 1 },
    { transform: `translate(${dx * 0.45}px, ${Math.min(0, dy) * 0.45 - lift}px) scale(1)`, opacity: 1, offset: 0.45 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.4)`, opacity: 0.7 },
  ], { duration: FLIGHT_MS, easing: EASE_MOVE });
  flight.onfinish = () => { dot.remove(); bounce(target); };
  flight.oncancel = () => dot.remove();
}
