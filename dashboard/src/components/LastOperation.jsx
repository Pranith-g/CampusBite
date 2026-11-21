// Shows exactly what the C program reported for the last queue operation.
export default function LastOperation({ ops }) {
  const { current, history } = ops;
  return (
    <section className="panel" aria-label="Last operation">
      <div className="panel-h"><h2>Last operation</h2><span>from the C program</span></div>
      <div className="pad ops" aria-live="polite">
        <div className="cur">
          {current ? (
            <>
              <span className="o">{current.complexity}</span>
              <b className={current.ok ? '' : 'bad'}>{current.name}</b>
              {current.lines.map((l, i) => <div key={i}>{l}</div>)}
            </>
          ) : (
            <span className="idle">Issue a token or mark one ready to see the queue arithmetic here.</span>
          )}
        </div>
        {history.length > 0 && (
          <ol>
            {history.map((h, i) => (
              <li key={i}><span className={h.ok ? '' : 'bad'}>{h.name} · {h.lines[0]}</span><span>{h.complexity}</span></li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
