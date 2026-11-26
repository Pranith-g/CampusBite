import { useState } from 'react';
import { IconAlertCircle, IconToolsKitchen2 } from '@tabler/icons-react';
import { api } from '../api.js';
import { USN_PATTERN } from '../format.js';
import LiveKitchen from '../components/LiveKitchen.jsx';

// What each kind of account asks for.
const KINDS = {
  student: {
    title: 'Order from the canteen',
    lead: 'Order and pay on your phone. Collect your food when your token is called.',
    other: <a href="#/owner">Canteen owner? Sign in here</a>,
  },
  owner: {
    title: 'Canteen owner',
    lead: 'See incoming orders, move tokens through the kitchen and manage stock.',
    other: <a href="#/menu">Student? Sign in here</a>,
  },
};

const EMPTY = { name: '', usn: '', pin: '', username: '', password: '', code: '' };

// Sign in and sign up, for students (USN and PIN) and the canteen owner
// (username, password, and the canteen code to sign up).
export default function SignIn({ kind = 'student', onDone }) {
  const [mode, setMode] = useState('in');      // 'in' or 'up'
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const owner = kind === 'owner';
  const up = mode === 'up';

  const set = (key) => (e) => {
    setF({ ...f, [key]: key === 'usn' ? e.target.value.toUpperCase() : e.target.value });
    setError('');
  };
  const usn = f.usn.trim();
  const badUsn = !owner && usn.length >= 10 && !USN_PATTERN.test(usn);
  const badPin = !owner && up && f.pin.length > 0 && !/^\d{4,6}$/.test(f.pin) && f.pin.length >= 4;

  const ready = !sending && (owner
    ? f.username.trim() && f.password && (!up || (f.name.trim() && f.code.trim()))
    : USN_PATTERN.test(usn) && f.pin.length >= 4 && (!up || (f.name.trim() && /^\d{4,6}$/.test(f.pin))));

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setSending(true);
    setError('');
    try {
      let who;
      if (owner) {
        who = up
          ? (await api.ownerSignUp({ username: f.username.trim(), name: f.name, password: f.password, code: f.code })).owner
          : (await api.ownerSignIn(f.username.trim(), f.password)).owner;
      } else {
        who = up
          ? (await api.signUp({ usn, name: f.name, pin: f.pin })).student
          : (await api.signIn(usn, f.pin)).student;
      }
      onDone(who);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  const switchTo = (next) => {
    setMode(next);
    setError('');
    setF({ ...EMPTY, usn: f.usn, username: f.username });
  };

  const message = badUsn ? `${usn} isn't a valid USN. Use 10 characters like 1DS24CS017.`
    : badPin ? 'Use 4 to 6 digits for your PIN.' : error;
  const text = KINDS[kind];

  return (
    <main className="auth">
      <div className="auth-head">
        <div className="brand"><IconToolsKitchen2 size={22} aria-hidden="true" /> CampusBite</div>
        <h1>{text.title}</h1>
        <p className="lead">{text.lead}</p>
      </div>

      <div className="auth-card">
        <div className="seg" role="group" aria-label="Sign in or sign up">
          <button type="button" aria-pressed={!up} onClick={() => switchTo('in')}>Sign in</button>
          <button type="button" aria-pressed={up} onClick={() => switchTo('up')}>Sign up</button>
        </div>
        <form onSubmit={submit} noValidate>
          {up && (
            <>
              <label htmlFor="name">Your name</label>
              <input id="name" type="text" autoComplete="name" maxLength={40} value={f.name} onChange={set('name')} />
            </>
          )}
          {owner ? (
            <>
              <label htmlFor="username">Username</label>
              <input id="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck="false"
                     maxLength={20} value={f.username} onChange={set('username')} />
              <label htmlFor="password">Password{up && <span className="hint"> · at least 8 characters</span>}</label>
              <input id="password" type="password" autoComplete={up ? 'new-password' : 'current-password'}
                     value={f.password} onChange={set('password')} />
              {up && (
                <>
                  <label htmlFor="code">Canteen code<span className="hint"> · from the canteen manager</span></label>
                  <input id="code" type="text" autoComplete="off" autoCapitalize="none" spellCheck="false"
                         value={f.code} onChange={set('code')} />
                </>
              )}
            </>
          ) : (
            <>
              <label htmlFor="usn">USN</label>
              <input id="usn" type="text" autoComplete="username" autoCapitalize="characters" spellCheck="false"
                     maxLength={10} placeholder="1DS24CS017" className={badUsn ? 'invalid' : ''} aria-invalid={badUsn}
                     value={f.usn} onChange={set('usn')} />
              <label htmlFor="pin">PIN{up && <span className="hint"> · choose 4 to 6 digits</span>}</label>
              <input id="pin" type="password" inputMode="numeric" autoComplete={up ? 'new-password' : 'current-password'}
                     maxLength={up ? 6 : 8} className={badPin ? 'invalid' : ''} value={f.pin} onChange={set('pin')} />
            </>
          )}
          {message && (
            <p className="msg" role="alert"><IconAlertCircle size={18} aria-hidden="true" /> <span>{message}</span></p>
          )}
          <button className="btn primary" type="submit" disabled={!ready}>
            {sending ? (up ? 'Creating your account…' : 'Signing in…') : (up ? 'Create account' : 'Sign in')}
          </button>
        </form>
        <p className="switch">{text.other} · <a href="#/how">How it works</a></p>
      </div>

      <LiveKitchen />
    </main>
  );
}
