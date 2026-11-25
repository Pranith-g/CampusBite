import { useState } from 'react';
import { IconAlertCircle, IconBuildingBank, IconCircleCheck, IconWallet } from '@tabler/icons-react';
import { api } from '../api.js';
import { PAY_METHODS, dayText, rupees } from '../format.js';

// A refund for dishes that ran out after paying. Until the student chooses,
// it asks where the money should go.
export default function RefundCard({ refund, payMethod, onChosen }) {
  const [sending, setSending] = useState('');
  const [error, setError] = useState('');
  const paidBy = PAY_METHODS[payMethod];

  const choose = async (method) => {
    if (sending) return;
    setSending(method);
    setError('');
    try {
      await api.chooseRefund(refund.id, method);
      await onChosen();
    } catch (err) {
      setError(err.message);
    }
    setSending('');
  };

  if (refund.method === 'wallet') {
    return (
      <div className="refund done" role="status">
        <IconCircleCheck size={22} aria-hidden="true" />
        <p><b className="num">{rupees(refund.amount)} is in your canteen wallet</b>
          <span>For {refund.items}. Pick it as the way to pay on your next order.</span></p>
      </div>
    );
  }
  if (refund.method === 'original') {
    return (
      <div className="refund done" role="status">
        <IconCircleCheck size={22} aria-hidden="true" />
        <p><b className="num">{rupees(refund.amount)} is on its way back to your {paidBy}</b>
          <span>For {refund.items}. It should arrive by {dayText(refund.arrivesBy)}.</span></p>
      </div>
    );
  }
  return (
    <div className="refund ask" role="alert">
      <h2 className="num">Your {rupees(refund.amount)} refund</h2>
      <p>Sorry, {refund.items} ran out after you paid. Where should the money go?</p>
      <div className="refund-options">
        <button className="btn" disabled={Boolean(sending)} onClick={() => choose('wallet')}>
          <IconWallet size={22} aria-hidden="true" />
          <span><b>{sending === 'wallet' ? 'Adding…' : 'Canteen wallet'}</b>
            <small>Instant. Spend it on your next order here.</small></span>
        </button>
        <button className="btn" disabled={Boolean(sending)} onClick={() => choose('original')}>
          <IconBuildingBank size={22} aria-hidden="true" />
          <span><b>{sending === 'original' ? 'Sending…' : `Back to ${paidBy}`}</b>
            <small>Takes 2 to 3 days.</small></span>
        </button>
      </div>
      {error && <p className="msg"><IconAlertCircle size={18} aria-hidden="true" /> <span>{error}</span></p>}
    </div>
  );
}
