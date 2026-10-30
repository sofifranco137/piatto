import { useEffect, useRef } from 'react';

// Ventana modal con <dialog>: se cierra con Escape, con la ✕ o tocando afuera
function Modal({ open, onClose, className = 'sheet', style, labelledBy, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={className}
      style={style}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      {open && children}
    </dialog>
  );
}

export default Modal;
