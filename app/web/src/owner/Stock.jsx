import { useState } from 'react';
import { api } from '../api.js';
import DishPhoto from '../components/DishPhoto.jsx';
import { LOW_STOCK } from '../format.js';
import { usePolled } from '../hooks.js';

const describe = (item) => {
  if (item.switchedOff) return ['out', 'Out of stock: you switched it off'];
  if (!item.left) return ['out', 'Out of stock: none left'];
  const tone = item.left <= LOW_STOCK ? 'low' : '';
  return [tone, `${item.left} left · started with ${item.start}`];
};

function Row({ item, pending, save }) {
  const [draft, setDraft] = useState({});     // only what the owner has typed
  const start = draft.start ?? String(item.start);
  const left = draft.left ?? String(item.left);
  const typed = Object.values(draft);
  const canSave = typed.length > 0 && typed.every((v) => v !== '') && !pending;
  const digits = (value) => value.replace(/\D/g, '').slice(0, 3);
  const [tone, status] = describe(item);

  const submit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    const change = { id: item.id };
    for (const [field, value] of Object.entries(draft)) change[field] = Number(value);
    if (await save(change)) setDraft({});
  };

  return (
    <li>
      <DishPhoto photo={item.photo} size="small" />
      <div>
        <div className="n">{item.name}</div>
        <div className={`meta num ${tone}`}>{status}</div>
      </div>
      <form onSubmit={submit}>
        <label>
          Starting
          {/* A new starting quantity fills "Left now" too; it can still be edited. */}
          <input type="text" inputMode="numeric" className="num" aria-label={`${item.name} starting quantity`} value={start}
                 onChange={(e) => setDraft({ start: digits(e.target.value), left: digits(e.target.value) })} />
        </label>
        <label>
          Left now
          <input type="text" inputMode="numeric" className="num" aria-label={`${item.name} left now`} value={left}
                 onChange={(e) => setDraft((d) => ({ ...d, left: digits(e.target.value) }))} />
        </label>
        <button className="btn save" type="submit" disabled={!canSave}>Save</button>
      </form>
      <button className={`btn switch-stock ${item.switchedOff ? 'go' : 'danger'}`} type="button"
              disabled={pending || (!item.switchedOff && !item.left)}
              onClick={() => save({ id: item.id, switchedOff: !item.switchedOff })}>
        {item.switchedOff ? 'Put back on sale' : 'Mark out of stock'}
      </button>
    </li>
  );
}

export default function Stock({ onError, onSaved }) {
  const { data, error, refresh } = usePolled(api.ownerStock, 4000, onError);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  const save = async (change) => {
    setPending(true);
    setMessage('');
    let saved = false;
    try {
      await api.saveStock(change);
      saved = true;
    } catch (err) {
      onError(err);
      setMessage(err.message);
    }
    await refresh();
    onSaved();
    setPending(false);
    return saved;
  };

  const items = data?.items ?? [];
  const sections = [...new Set(items.map((i) => i.section))];

  return (
    <main className="stock">
      <h1>Stock</h1>
      <p className="lead">Set how many you start with, correct what is left, or take a dish off sale. Students see the change within a few seconds.</p>
      {(message || error) && <p className="msg" role="alert"><span>{message || error.message}</span></p>}
      {!data && !error && <p className="quiet">Loading the stock…</p>}
      {sections.map((section) => (
        <section className="panel" key={section} aria-label={section}>
          <div className="panel-h"><h2>{section}</h2></div>
          <ul>
            {items.filter((i) => i.section === section).map((item) => (
              <Row key={item.id} item={item} pending={pending} save={save} />
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
