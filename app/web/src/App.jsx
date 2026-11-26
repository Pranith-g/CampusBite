import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { go, useRoute } from './hooks.js';
import Gate from './components/Gate.jsx';
import SignIn from './screens/SignIn.jsx';
import Shop from './screens/Shop.jsx';
import OwnerApp from './owner/OwnerApp.jsx';
import HowItWorks from './screens/HowItWorks.jsx';

function StudentApp() {
  const [student, setStudent] = useState(undefined); // undefined = still checking
  const [error, setError] = useState('');

  const check = useCallback(() => {
    setError('');
    api.me().then((d) => setStudent(d.student)).catch((err) => setError(err.message));
  }, []);

  useEffect(check, [check]);

  const signedOut = useCallback(() => {
    go('menu');
    setStudent(null);
  }, []);

  if (student === undefined) return <Gate error={error} onRetry={check} />;
  if (!student) return <SignIn kind="student" onDone={setStudent} />;
  // key: a different student gets a fresh screen and their own cart.
  return <Shop key={student.id} student={student} onSignedOut={signedOut} />;
}

// Addresses starting #/owner are the canteen owner's side. #/how explains the
// app and is open to everyone, signed in or not.
export default function App() {
  const page = useRoute().split('/')[0];
  if (page === 'how') return <HowItWorks />;
  return page === 'owner' ? <OwnerApp /> : <StudentApp />;
}
