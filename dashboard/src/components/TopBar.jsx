import { useEffect, useState } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { rupees } from '../format.js';

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r="12" fill="none" stroke="#f0a531" strokeWidth="2.5" />
      <path d="M14 14 L14 5" stroke="#f0a531" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14 14 L21 17" stroke="#f4eadb" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="14" cy="14" r="2.2" fill="#f4eadb" />
    </svg>
  );
}

// ink below 60% full, turmeric from 60%, chilli when full
const level = (q) => (q.count === q.capacity ? 'full' : q.count >= q.capacity * 0.6 ? 'busy' : '');

export default function TopBar({ state, view, onView, onSearch }) {
  const [now, setNow] = useState(new Date());
  const [query, setQuery] = useState('');

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  const hour = now.getHours();
  const service = hour < 11 ? 'Breakfast service' : hour < 16 ? 'Lunch service' : 'Evening service';
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

  const submit = (e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <header className="bar">
      <div className="brand"><Logo />CampusBite</div>
      <div className="tabs" role="tablist" aria-label="Views">
        <button className="tab" role="tab" aria-selected={view === 'counter'} onClick={() => onView('counter')}>Counter</button>
        <button className="tab" role="tab" aria-selected={view === 'board'} onClick={() => onView('board')}>Student board</button>
      </div>
      <div className="readouts">
        <div className={level(state.kitchen)}>Kitchen<b className="num">{state.kitchen.count} / {state.kitchen.capacity}</b></div>
        <div className={level(state.shelf)}>Shelf<b className="num">{state.shelf.count} / {state.shelf.capacity}</b></div>
        <div className="hide-md">Served<b className="num">{state.served}</b></div>
        <div className="hide-md">Revenue<b className="num">{rupees(state.revenue)}</b></div>
      </div>
      <form className="search" onSubmit={submit} role="search">
        <label className="sr" htmlFor="top-search">Search token or USN</label>
        <IconSearch size={17} aria-hidden="true" />
        <input id="top-search" type="text" placeholder="Search token or USN" value={query} onChange={(e) => setQuery(e.target.value)} />
      </form>
      <div className="clock">{service}<b className="num">{time}</b></div>
    </header>
  );
}
