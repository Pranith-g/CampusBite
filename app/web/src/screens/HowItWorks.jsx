import { useState } from 'react';
import { IconArrowLeft, IconToolsKitchen2 } from '@tabler/icons-react';
import KitchenDial from '../owner/KitchenDial.jsx';

// A small circular queue to play with. The real kitchen has 50 slots; 8 are
// easier to follow. The same three numbers run it: FRONT, REAR and COUNT.
const CAP = 8;
const START = { slots: Array(CAP).fill(null), front: 0, rear: -1, count: 0, next: 101, log: [] };

function enqueue(q) {
  if (q.count === CAP) return { ...q, log: [`The queue is full: count = ${CAP}. A new order has to wait for a slot.`, ...q.log] };
  const rear = (q.rear + 1) % CAP;
  const slots = [...q.slots];
  slots[rear] = q.next;
  return {
    ...q, slots, rear, count: q.count + 1, next: q.next + 1,
    log: [`Token ${q.next} joins at slot ${rear}:  rear = (${q.rear} + 1) % ${CAP} = ${rear}`, ...q.log],
  };
}

function dequeue(q) {
  if (q.count === 0) return { ...q, log: ['The queue is empty: count = 0. Nothing to mark ready.', ...q.log] };
  const token = q.slots[q.front];
  const slots = [...q.slots];
  slots[q.front] = null;
  const front = (q.front + 1) % CAP;
  return {
    ...q, slots, front, count: q.count - 1,
    log: [`Token ${token} is ready and leaves slot ${q.front}:  front = (${q.front} + 1) % ${CAP} = ${front}`, ...q.log],
  };
}

// Cancel the order k places from the front: everyone behind it moves up one
// slot and REAR steps back, like queue_remove_token in the C project.
function cancel(q, k) {
  const slots = [...q.slots];
  const token = slots[(q.front + k) % CAP];
  for (let j = k; j < q.count - 1; j++) slots[(q.front + j) % CAP] = slots[(q.front + j + 1) % CAP];
  slots[q.rear] = null;
  const rear = (q.rear - 1 + CAP) % CAP;
  const moved = q.count - 1 - k;
  return {
    ...q, slots, rear, count: q.count - 1,
    log: [`Token ${token} is cancelled. ${moved ? `${moved} ${moved === 1 ? 'order' : 'orders'} behind it move up one slot, and ` : ''}rear = (${q.rear} - 1 + ${CAP}) % ${CAP} = ${rear}`, ...q.log],
  };
}

const STEPS = [
  ['Order and pay', 'Pick dishes from today’s menu and pay in the app. The app shows how long it will take.'],
  ['Get a token', 'Your order gets the next token number and joins the kitchen queue at the slot after REAR.'],
  ['The kitchen cooks in order', 'The canteen cooks from FRONT. When an order is ready, FRONT moves on to the next slot.'],
  ['Collect it', 'Your phone buzzes and your token turns green on the board. Show it at the counter.'],
];

export default function HowItWorks() {
  const [q, setQ] = useState(START);
  const inLine = Array.from({ length: q.count }, (_, k) => ({ slot: (q.front + k) % CAP, token: q.slots[(q.front + k) % CAP] }));
  const queue = { capacity: CAP, count: q.count, front: q.front, rear: q.rear, orders: inLine };

  return (
    <main className="how">
      <header className="how-top">
        <div className="brand"><IconToolsKitchen2 size={20} aria-hidden="true" /> CampusBite</div>
        <a className="btn ghost" href="#/menu"><IconArrowLeft size={18} aria-hidden="true" /> Back to the app</a>
      </header>

      <section className="how-intro">
        <h1>How CampusBite works</h1>
        <p className="lead">No crowd at the counter. Students order on their phones, the kitchen works through a queue of tokens, and everyone collects when their number is called.</p>
      </section>

      <section aria-labelledby="journey-title">
        <h2 id="journey-title">From order to plate</h2>
        <ol className="journey">
          {STEPS.map(([title, body], k) => (
            <li key={title}>
              <span className="step cond num">{k + 1}</span>
              <div><b>{title}</b><p>{body}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="queue-title" className="how-queue">
        <h2 id="queue-title">The kitchen queue is a circular queue</h2>
        <p>Orders sit in a fixed row of slots. Two pointers keep track of them: <b>FRONT</b> is the next order to cook, <b>REAR</b> is the newest. When REAR reaches the last slot it wraps round to slot 0, so the slots are used again and nothing is ever shifted when an order leaves. Try it below with 8 slots (the real kitchen has 50).</p>

        <div className="sim">
          <div className="sim-dial">
            <div className="dial-wrap">
              <KitchenDial queue={queue} labels />
              <div className="dial-center">
                <div className="sim-count num" aria-hidden="true"><b>{q.count}</b></div>
              </div>
            </div>
          </div>

          <div className="sim-side">
            <dl className="sim-vars num">
              <div><dt>FRONT</dt><dd>{q.front}</dd></div>
              <div><dt>REAR</dt><dd>{q.rear < 0 ? '–' : q.rear}</dd></div>
              <div><dt>COUNT</dt><dd>{q.count}</dd></div>
            </dl>
            <div className="sim-actions">
              <button className="btn primary" onClick={() => setQ(enqueue)} disabled={q.count === CAP}>New order</button>
              <button className="btn go" onClick={() => setQ(dequeue)} disabled={!q.count}>Mark ready</button>
              <button className="btn ghost" onClick={() => setQ(START)}>Start again</button>
            </div>
            <p className="sim-hint">{q.count === CAP
              ? 'Full: COUNT = 8. Mark one ready and REAR can wrap round into the free slot.'
              : 'Tip: add 8 orders, mark 3 ready, then add more to see REAR wrap round to slot 0. Tap a token in the row to cancel it.'}</p>
          </div>
        </div>

        <div className="slots-wrap">
          <ol className="slots" aria-label="The 8 slots in a row">
            {q.slots.map((token, i) => {
              const k = inLine.findIndex((o) => o.slot === i);
              return (
                <li key={i} className={`${token ? 'used' : ''} ${q.count && i === q.front ? 'is-front' : ''}`}>
                  <span className="ix num">{i}</span>
                  {token
                    ? <button className="cond num" onClick={() => setQ((s) => cancel(s, k))} aria-label={`Cancel token ${token}`}>{token}</button>
                    : <span className="free" aria-label="empty">·</span>}
                  <span className="marks">
                    {q.count > 0 && i === q.front && <b className="f">F</b>}
                    {q.count > 0 && i === q.rear && <b className="r">R</b>}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="sim-log" aria-live="polite">
          {q.log.length ? q.log.slice(0, 5).map((line, k) => <p key={q.log.length - k} className={k ? 'old' : ''}><code>{line}</code></p>)
            : <p className="old">Press New order to start.</p>}
        </div>

        <ul className="why">
          <li><b>Adding and removing are instant.</b> Only FRONT or REAR moves, by one step: O(1).</li>
          <li><b>Full and empty are clear.</b> COUNT says how many slots are in use: 0 is empty, 50 is full.</li>
          <li><b>No wasted slots.</b> With wrap-around, a slot freed at the front is used again at the back.</li>
        </ul>
      </section>

      <section aria-labelledby="refund-title">
        <h2 id="refund-title">When a dish runs out</h2>
        <p>If the canteen runs out of something after you have paid, the owner marks it on your order and you get the money back. You choose: the <b>canteen wallet</b> (instant, spend it on your next order) or back to your <b>UPI or card</b> (2 to 3 days). If nothing in the order can be made, it is cancelled and leaves the queue, and the orders behind it move up one slot.</p>
      </section>

      <a className="btn primary how-cta" href="#/menu">Start ordering</a>
    </main>
  );
}
