import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import Gate from '../components/Gate.jsx';
import SignIn from '../screens/SignIn.jsx';
import Dashboard from './Dashboard.jsx';

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
  if (!owner) return <SignIn kind="owner" onDone={setOwner} />;
  return <Dashboard onSignedOut={signedOut} />;
}
