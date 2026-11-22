import { useMemo, useState } from 'react';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import { NAME_PATTERN, USN_PATTERN, rupees } from '../format.js';

const SECTIONS = ['Meals', 'Snacks', 'Drinks'];

export default function OrderForm({ menu, limits, state, run }) {
  const [name, setName] = useState('');
  const [usn, setUsn] = useState('');
  const [qty, setQty] = useState({});            // { itemId: quantity }
  const [section, setSection] = useState('Meals');
  const [result, setResult] = useState(null);     // reply from C after Issue token
  const [sending, setSending] = useState(false);

  const { kitchen, shelf } = state;
  const full = kitchen.count === kitchen.capacity;
  const usnNorm = usn.trim().toUpperCase();

  // These checks only decide whether the button is enabled and what hint
  // to show. The C program checks everything again and has the final say.
  const usnError = useMemo(() => {
    if (!usnNorm) return '';
    if (!USN_PATTERN.test(usnNorm)) return `${usnNorm} isn't a valid USN. Use 10 characters like 1DS24CS017.`;
    const inKitchen = kitchen.orders.find((o) => o.usn === usnNorm);
    const onShelf = shelf.orders.find((o) => o.usn === usnNorm);
    const hit = inKitchen || onShelf;
    if (hit) return `${usnNorm} already has token #${hit.token} ${inKitchen ? 'in the kitchen' : 'on the pickup shelf'}. Hand it over or cancel it first.`;
    return '';
  }, [usnNorm, kitchen.orders, shelf.orders]);

  const nameOk = NAME_PATTERN.test(name.trim());
  const items = Object.entries(qty).filter(([, q]) => q > 0).map(([id, q]) => [Number(id), q]);
  const total = items.reduce((sum, [id, q]) => sum + menu[id].price * q, 0);
  const ownPrep = items.length ? Math.max(...items.map(([id]) => menu[id].prep)) : 0;
  const wait = Math.ceil(state.prepAhead / state.cooks) + ownPrep;

  let block = '';
  if (full) block = 'Kitchen full: stop issuing tokens. Mark the front order ready to free a slot.';
  else if (name && !nameOk) block = "Name must be 2–39 characters: letters, spaces, '.', '-' or an apostrophe.";
  else if (nameOk && usnNorm && !usnError && !items.length) block = 'Add at least one item.';

  const canIssue = !full && nameOk && usnNorm && !usnError && items.length > 0 && !sending;

  const change = (id, delta) => {
    setResult(null);
    setQty((prev) => ({ ...prev, [id]: Math.max(0, Math.min(limits.maxQty, (prev[id] || 0) + delta)) }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canIssue) return;
    setSending(true);
    const list = items.map(([id, q]) => `${id}:${q}`).join(',');
    const reply = await run('PLACE', [name.trim(), usnNorm, list]);
    setSending(false);
    setResult(reply);
    if (reply.ok) {
      setName('');
      setUsn('');
      setQty({});
    }
  };

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <div className="panel-h"><h2>New order</h2><span className="num">next token #{state.nextToken}</span></div>
      <div className="pad">
        <div className="field">
          <label htmlFor="f-name">Student name</label>
          <input id="f-name" type="text" autoComplete="off" placeholder="Ananya Rao" value={name}
                 onChange={(e) => { setName(e.target.value); setResult(null); }} />
        </div>
        <div className="field">
          <label htmlFor="f-usn">USN</label>
          <input id="f-usn" type="text" autoComplete="off" placeholder="1DS24CS017" className={`num ${usnError ? 'invalid' : ''}`}
                 value={usn} aria-invalid={!!usnError} aria-describedby="usn-msg"
                 onChange={(e) => { setUsn(e.target.value); setResult(null); }} />
          {usnError && <div className="msg" id="usn-msg"><span>{usnError}</span></div>}
        </div>

        <div className="seg" role="group" aria-label="Menu section">
          {SECTIONS.map((s) => (
            <button type="button" key={s} aria-pressed={section === s} onClick={() => setSection(s)}>{s}</button>
          ))}
        </div>
        <ul className="menu">
          {menu.filter((m) => m.section === section).map((m) => {
            const q = qty[m.id] || 0;
            return (
              <li key={m.id} className={q ? 'picked' : ''}>
                <div><div className="nm">{m.name}</div><div className="meta num">{rupees(m.price)} · {m.prep} min</div></div>
                <div className="step">
                  <button type="button" aria-label={`Remove one ${m.name}`} disabled={!q} onClick={() => change(m.id, -1)}><IconMinus size={15} /></button>
                  <output className="num" aria-label={`${m.name} quantity`}>{q}</output>
                  <button type="button" aria-label={`Add one ${m.name}`} disabled={q >= limits.maxQty} onClick={() => change(m.id, 1)}><IconPlus size={15} /></button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="bill num">
          {items.length ? (
            <>
              {items.map(([id, q]) => (
                <div key={id}><span>{menu[id].name} × {q}</span><span>{rupees(menu[id].price * q)}</span></div>
              ))}
              <div className="total"><span>Total</span><span>{rupees(total)}</span></div>
              <div><span>Estimated wait</span><span>about {wait} min</span></div>
            </>
          ) : (
            <div className="empty">No items yet. Use + to add from the menu.</div>
          )}
        </div>

        <button className="btn primary issue" type="submit" disabled={!canIssue}>
          {full ? 'Kitchen full' : sending ? 'Issuing…' : `Issue token #${state.nextToken}`}
        </button>
        {block && <div className="msg after-issue"><span>{block}</span></div>}
        {result && (
          <div className={`msg after-issue ${result.ok ? 'good' : ''}`} role="status">
            <span>{result.message}</span>
          </div>
        )}
      </div>
    </form>
  );
}
