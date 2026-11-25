// Shown while the app checks who is signed in.
export default function Gate({ error, onRetry }) {
  return (
    <main className="center">
      {error ? (
        <div>
          <p>{error}</p>
          <button className="btn" onClick={onRetry}>Try again</button>
        </div>
      ) : (
        <p>Opening the canteen…</p>
      )}
    </main>
  );
}
