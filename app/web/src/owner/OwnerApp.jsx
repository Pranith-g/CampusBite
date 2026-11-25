import { useCallback, useEffect, useState } from 'react';
import { IconAlertCircle, IconToolsKitchen2 } from '@tabler/icons-react';
import { api } from '../api.js';
import Gate from '../components/Gate.jsx';
import Dashboard from './Dashboard.jsx';

function OwnerSignIn({ onDone }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const ready = username.trim() && password && !sending;

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setSending(true);
    setError('');
    try {
      const { owner } = await api.ownerSignIn(username.trim(), password);
      onDone(owner);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <main className="signin">
      <div className="brand"><IconToolsKitchen2 size={22} aria-hidden="true" /> CampusBite</div>
      <h1>Canteen owner sign in</h1>
      <p className="lead">See incoming orders and move tokens through the kitchen.</p>
      <form onSubmit={submit} noValidate>
        <label htmlFor="owner-name">Username</label>
        <input id="owner-name" type="text" autoComplete="username" autoCapitalize="none" spellCheck="false"
               value={username} onChange={(e) => { setUsername(e.target.value); setError(''); }} />
        <label htmlFor="owner-password">Password</label>
        <input id="owner-password" type="password" autoComplete="current-password"
               value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} />
        {error && <p className="msg" role="alert"><IconAlertCircle size={18} aria-hidden="true" /> <span>{error}</span></p>}
        <button className="btn primary" type="submit" disabled={!ready}>{sending ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="switch"><a href="#/menu">Student sign in</a></p>
    </main>
  );
}

export default function OwnerApp() {
  const [owner, setOwner] = useState(undefined); // undefined = still checking
  const [error, setError] = useState('');

  const check = useCallback(() => {
    setError('');
    api.ownerMe().then((d) => setOwner(d.owner)).catch((err) => setError(err.message));
  }, []);

  useEffect(check, [check]);

  const signedOut = useCallback(() => setOwner(null), []);

  if (owner === undefined) return <Gate error={error} onRetry={check} />;
  if (!owner) return <OwnerSignIn onDone={setOwner} />;
  return <Dashboard onSignedOut={signedOut} />;
}
