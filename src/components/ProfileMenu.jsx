import { useEffect, useRef, useState } from 'react';
import { useToast } from './Toasts';
import { friendlyError } from '../lib/errors';
import { compressImage, photoError } from '../lib/photos';

// Las iniciales para cuando no hay foto: "Sofía Franco" → "SF"
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

// La foto de perfil en un círculo: la propia, la de Google o las iniciales
export function ProfilePhoto({ src, name, size = 44, className = '' }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  return (
    <span className={`profile-photo ${className}`} style={{ '--size': `${size}px` }} aria-hidden="true">
      {src && !broken
        ? <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
        : <span>{initials(name)}</span>}
    </span>
  );
}

// Botón con la foto arriba a la derecha; al tocarlo abre el menú de la cuenta
function ProfileMenu({ user, photo, onSave, onRemove, onSignOut }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef(null);
  const fileRef = useRef(null);

  const name = user.displayName || user.email?.split('@')[0] || '';
  const firstName = name.split(' ')[0];
  const src = photo || user.photoURL || null;

  // Se cierra al tocar afuera o con Escape
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      // Recorte cuadrado y chico: alcanza para un círculo y pesa poco
      const { dataUrl } = await compressImage(file, { maxSide: 320, square: true, maxChars: 120000 });
      await onSave(dataUrl);
      toast('Cambiaste tu foto de perfil.');
    } catch (err) {
      toast(err?.code ? friendlyError(err) : photoError(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await onRemove();
      toast(user.photoURL ? 'Volviste a tu foto de Google.' : 'Sacaste tu foto de perfil.');
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="profile" ref={wrapRef}>
      <button type="button" className="profile-btn" onClick={() => setOpen((o) => !o)}
        aria-expanded={open} aria-haspopup="true" aria-label={`Tu cuenta: ${name}`}>
        <span className="profile-hello">Hola, {firstName}</span>
        <ProfilePhoto src={src} name={name} />
      </button>

      {open && (
        <div className="profile-menu" role="menu">
          <div className="profile-card">
            <button type="button" className="profile-big" onClick={() => fileRef.current?.click()} disabled={busy} aria-label="Cambiar foto de perfil">
              <ProfilePhoto src={src} name={name} size={84} />
              <span className="profile-big-edit">{busy ? <span className="spinner" /> : 'Cambiar'}</span>
            </button>
            <strong>Hola, {firstName}</strong>
            <small>{user.email}</small>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={pick} hidden />
          <button type="button" role="menuitem" className="profile-item" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? 'Guardando…' : 'Cambiar foto de perfil'}
          </button>
          {photo && (
            <button type="button" role="menuitem" className="profile-item" onClick={remove} disabled={busy}>
              {user.photoURL ? 'Volver a mi foto de Google' : 'Sacar la foto'}
            </button>
          )}
          <button type="button" role="menuitem" className="profile-item danger" onClick={onSignOut}>Cerrar sesión</button>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;
