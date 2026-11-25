import { useState } from 'react';
import { IconAlertCircle, IconToolsKitchen2 } from '@tabler/icons-react';
import { api } from '../api.js';
import { USN_PATTERN } from '../format.js';

export default function SignIn({ onDone }) {
  const [usn, setUsn] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const id = usn.trim().toUpperCase();
  const badUsn = id.length >= 10 && !USN_PATTERN.test(id);
  const ready = USN_PATTERN.test(id) && pin.length >= 4 && !sending;

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setSending(true);
    setError('');
    try {
      const { student } = await api.signIn(id, pin);
      onDone(student);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  const message = badUsn ? `${id} isn't a valid USN. Use 10 characters like 1DS24CS017.` : error;

  return (
    <main className="signin">
      <div className="brand"><IconToolsKitchen2 size={22} aria-hidden="true" /> CampusBite</div>
      <div className="signin-food" aria-hidden="true">
        {['masala-dosa', 'chole-bhature', 'samosa'].map((p) => <img key={p} src={`/food/${p}.jpg`} alt="" />)}
      </div>
      <h1>Order from the canteen</h1>
      <p className="lead">Pay on your phone, then collect your food at the counter.</p>
      <form onSubmit={submit} noValidate>
        <label htmlFor="usn">USN</label>
        <input id="usn" type="text" autoComplete="username" autoCapitalize="characters" spellCheck="false"
               maxLength={10} placeholder="1DS24CS017" className={badUsn ? 'invalid' : ''} aria-invalid={badUsn}
               value={usn} onChange={(e) => { setUsn(e.target.value.toUpperCase()); setError(''); }} />
        <label htmlFor="pin">PIN</label>
        <input id="pin" type="password" inputMode="numeric" autoComplete="current-password" maxLength={8}
               value={pin} onChange={(e) => { setPin(e.target.value); setError(''); }} />
        {message && (
          <p className="msg" role="alert"><IconAlertCircle size={18} aria-hidden="true" /> <span>{message}</span></p>
        )}
        <button className="btn primary" type="submit" disabled={!ready}>{sending ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="switch"><a href="#/owner">Canteen owner? Sign in here</a></p>
    </main>
  );
}
