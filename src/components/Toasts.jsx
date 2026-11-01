import { createContext, useCallback, useContext, useState } from 'react';
import { friendlyError } from '../lib/errors';

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

// Mensajes de éxito o error que aparecen abajo y se van solos.
// toast('Guardado')                       → mensaje de éxito
// toast('Algo falló', 'error')            → mensaje de error
// toast('Eliminaste X', { undo: fn })     → con botón "Deshacer"
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback((message, opts = {}) => {
    const { type = 'ok', undo } = typeof opts === 'string' ? { type: opts } : opts;
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type, undo }]);
    setTimeout(() => remove(id), undo ? 6000 : type === 'error' ? 5000 : 2800);
  }, [remove]);

  async function runUndo(t) {
    remove(t.id);
    try {
      await t.undo();
      toast('Listo, lo deshiciste.');
    } catch (err) {
      toast(friendlyError(err), 'error');
    }
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type === 'error' ? 'error' : ''}`} role={t.type === 'error' ? 'alert' : undefined}>
            <span>{t.message}</span>
            {t.undo && <button type="button" onClick={() => runUndo(t)}>Deshacer</button>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export { ToastProvider };
