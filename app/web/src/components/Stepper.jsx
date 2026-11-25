import { IconMinus, IconPlus } from '@tabler/icons-react';

export default function Stepper({ name, qty, max, disabled, onChange }) {
  return (
    <div className="stepper">
      <button type="button" aria-label={`Remove one ${name}`} disabled={disabled} onClick={() => onChange(-1)}>
        <IconMinus size={18} aria-hidden="true" />
      </button>
      <output className="num" aria-label={`${name} quantity`}>{qty}</output>
      <button type="button" aria-label={`Add one ${name}`} disabled={disabled || qty >= max} onClick={() => onChange(1)}>
        <IconPlus size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
