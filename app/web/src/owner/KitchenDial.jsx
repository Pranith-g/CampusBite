import { useRef } from 'react';

// The kitchen queue drawn as a wall clock: one tick per array slot,
// FRONT and REAR as two hands. Everything comes from the server's state
// (capacity, front, rear and the slot of each order).
const C = 300;

const polar = (r, i, n) => {
  const a = (i / n) * 2 * Math.PI - Math.PI / 2;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};

// tagR: how far out the label sits. REAR moves further out when it is
// close to FRONT, so the two labels never cover each other.
function Hand({ deg, color, ink, label, dim, tagR = 300 }) {
  return (
    <g className="hand" style={{ transform: `rotate(${deg}deg)`, opacity: dim ? 0.35 : 1 }}>
      <line x1={C} y1={C - 156} x2={C} y2={C - 176} stroke={color} strokeWidth="4" strokeLinecap="round" />
      <path d={`M ${C - 7} ${C - 228} L ${C + 7} ${C - 228} L ${C} ${C - 214} Z`} fill={color} />
      <g transform={`rotate(${-deg} ${C} ${C - tagR})`}>
        <rect x={C - 32} y={C - tagR - 12} width="64" height="24" rx="6" fill={color} />
        <text x={C} y={C - tagR + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={ink} fontFamily="'Archivo Variable', sans-serif">{label}</text>
      </g>
    </g>
  );
}

// labels: also write each token number beside its slot (for a small queue).
export default function KitchenDial({ queue, labels = false }) {
  const { capacity: n, front, rear, count, orders } = queue;
  const used = new Set(orders.map((o) => o.slot));
  const full = count === n;

  // Hands only ever turn forward, so going from slot 49 to slot 0
  // sweeps past the top instead of spinning backwards.
  const angles = useRef({ f: 0, r: 0 });
  const aim = (key, slot) => {
    const target = (slot / n) * 360;
    const current = angles.current[key];
    let delta = target - (((current % 360) + 360) % 360);
    if (delta < -0.01) delta += 360;
    angles.current[key] = current + delta;
    return angles.current[key];
  };
  const rearSlot = rear < 0 ? 0 : rear;
  const fDeg = aim('f', front);
  const rDeg = aim('r', rearSlot);
  const gap = Math.min((front - rearSlot + n) % n, (rearSlot - front + n) % n);
  const rearTagR = gap <= 3 ? 334 : 300;

  const ticks = [];
  for (let i = 0; i < n; i++) {
    const [x1, y1] = polar(186, i, n);
    const [x2, y2] = polar(216, i, n);
    const has = used.has(i);
    const stroke = full ? (i === front ? '#ff8a74' : '#c8432e') : has && i === front ? '#f0a531' : has ? '#c98a2a' : '#3e3329';
    ticks.push(<line key={i} className="tick" x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={has ? 9 : 3} strokeLinecap="round" />);
  }
  const numerals = [];
  const step = n <= 12 ? 1 : 5;   // a small queue numbers every slot
  for (let i = 0; i < n; i += step) {
    const [x, y] = polar(250, i, n);
    numerals.push(
      <text key={i} x={x} y={y + 7} textAnchor="middle" fontSize="20" fontWeight="600" fill="#a3937e"
            className={`dial-num num ${step === 5 && i % 10 ? 'minor' : ''}`} fontFamily="'Archivo Variable', sans-serif">{i}</text>
    );
  }

  return (
    <svg className="dial" viewBox="-66 -66 732 732" role="img"
         aria-label={`Circular kitchen queue of ${n} slots. ${count} in use. Front at slot ${front}, rear at slot ${rear}.`}>
      <circle cx={C} cy={C} r="226" fill="none" stroke="#2c241c" />
      <circle cx={C} cy={C} r="150" fill="#1a1410" stroke="#2c241c" />
      {ticks}
      {numerals}
      {labels && orders.map((o) => {
        const [x, y] = polar(116, o.slot, n);   // inside the ring, clear of the hands
        return (
          <text key={o.token} x={x} y={y + 7} textAnchor="middle" fontSize="20" fontWeight="800" className="num"
                fill={o.slot === front ? '#f0a531' : '#f4eadb'} fontFamily="'Archivo Variable', sans-serif">{o.token}</text>
        );
      })}
      <Hand deg={fDeg} color="#f0a531" ink="#2a1a04" label="FRONT" dim={!count} />
      <Hand deg={rDeg} color="#f4eadb" ink="#15100c" label="REAR" dim={!count} tagR={rearTagR} />
    </svg>
  );
}
