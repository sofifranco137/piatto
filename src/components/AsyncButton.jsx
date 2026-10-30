import { useState } from 'react';
import { useToast } from './Toasts';
import { friendlyError } from '../lib/errors';

// Botón que muestra "Guardando…" mientras espera a Firestore y avisa si algo falla
function AsyncButton({ onClick, pendingLabel = '', children, className = '', type = 'button', disabled = false, ...rest }) {
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function handle(e) {
    if (pending) return;
    setPending(true);
    try {
      await onClick?.(e);
    } catch (err) {
      console.error(err);
      toast(friendlyError(err), 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <button type={type} className={className} disabled={pending || disabled} onClick={handle} {...rest}>
      {pending ? <><span className="spinner" />{pendingLabel}</> : children}
    </button>
  );
}

export default AsyncButton;
