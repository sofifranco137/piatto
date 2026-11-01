import { useState } from 'react';
import Modal from './Modal';
import AsyncButton from './AsyncButton';
import Avatar, { memberName } from './Avatar';
import { useToast } from './Toasts';
import { friendlyError } from '../lib/errors';
import { factor, plural } from '../lib/ingredients';
import { inviteLink } from '../services/groups';

/* ---------- Crear grupo ---------- */
export function NewGroupDialog({ open, recipes, onClose, onCreate }) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="new-group-title">
      <NewGroupBody recipes={recipes} onClose={onClose} onCreate={onCreate} />
    </Modal>
  );
}

function NewGroupBody({ recipes, onClose, onCreate }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [recipeId, setRecipeId] = useState('');
  const [servings, setServings] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (name.trim().length < 3) return setError('Poné un nombre de al menos 3 letras.');
    setError(''); setSaving(true);
    const r = recipes.find((x) => x.id === recipeId);
    const f = r ? factor(r, Number(servings) || r.servings || 1) : 1;
    const items = r ? r.ingredients.map((i) => ({ name: i.name, qty: i.qty != null ? i.qty * f : null, unit: i.unit, from: r.name })) : [];
    try {
      await onCreate(name.trim(), items);
    } catch (err) {
      toast(friendlyError(err), 'error');
      setSaving(false);
    }
  }

  return (
    <form className="detail" onSubmit={submit} noValidate>
      <div className="sheet-head">
        <h3 id="new-group-title">Nuevo grupo</h3>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>
      <p className="muted">Para una juntada, un viaje o cualquier compra entre varios. Creás el grupo, mandás el link y quien lo abra se suma a la lista.</p>
      <label className="field">Nombre del grupo
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Pizza en lo de Lu" aria-invalid={!!error} autoFocus />
        <span className="field-error">{error}</span>
      </label>
      <div className="field-row">
        <label className="field"><span>Receta para empezar <span className="optional">(opcional)</span></span>
          <select value={recipeId} onChange={(e) => { setRecipeId(e.target.value); const r = recipes.find((x) => x.id === e.target.value); setServings(r?.servings || ''); }}>
            <option value="">Ninguna</option>
            {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label className="field">Porciones
          <input type="number" min="1" value={servings} onChange={(e) => setServings(e.target.value)} placeholder="8" disabled={!recipeId} />
        </label>
      </div>
      <div className="sheet-foot">
        <button type="button" className="btn btn-text" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <><span className="spinner" />Creando…</> : 'Crear y compartir link'}</button>
      </div>
    </form>
  );
}

/* ---------- Compartir link ---------- */
export function ShareDialog({ group, justCreated, onClose }) {
  const toast = useToast();
  const link = group ? inviteLink(group.id) : '';
  const message = group ? `Sumate a la lista “${group.name}” en Piatto: ${link}` : '';

  async function copy() {
    try { await navigator.clipboard.writeText(link); toast('Copiaste el link.'); }
    catch { toast('No se pudo copiar. Seleccioná el link y copialo con Ctrl + C.', 'error'); }
  }
  async function share() {
    try { await navigator.share({ title: `Piatto: ${group.name}`, text: message }); } catch { /* cancelado */ }
  }

  return (
    <Modal open={!!group} onClose={onClose} labelledBy="share-title">
      {group && (
        <div className="detail">
          <div className="sheet-head">
            <h3 id="share-title">{justCreated ? `Invitá a ${group.name}` : `Compartir ${group.name}`}</h3>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
          </div>
          <p className="muted">Mandá este link a quien quieras. Al abrirlo inicia sesión en Piatto y se suma a la lista; los cambios aparecen al instante para todos.</p>
          <div className="share-link">
            <input type="text" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Link de invitación" />
            <button className="btn btn-primary" type="button" onClick={copy}>Copiar link</button>
          </div>
          <div className="sheet-foot">
            {typeof navigator !== 'undefined' && navigator.share
              ? <button className="btn btn-outline" type="button" onClick={share}>Compartir…</button>
              : <a className="btn btn-outline" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">Mandar por WhatsApp</a>}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- Personas del grupo ---------- */
export function MembersDialog({ group, items, myUid, onClose, onRemove, onLeave, onDelete, onInvite }) {
  return (
    <Modal open={!!group} onClose={onClose} labelledBy="members-title">
      {group && <MembersBody group={group} items={items} myUid={myUid} onClose={onClose} onRemove={onRemove} onLeave={onLeave} onDelete={onDelete} onInvite={onInvite} />}
    </Modal>
  );
}

function MembersBody({ group, items, myUid, onClose, onRemove, onLeave, onDelete, onInvite }) {
  const isOwner = group.owner === myUid;
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="detail">
      <div className="sheet-head">
        <h3 id="members-title">Personas en {group.name}</h3>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>
      <ul className="members">
        {group.members.map((uid) => {
          const brings = items.filter((i) => i.assignee === uid && !i.checked).length;
          const info = [uid === group.owner ? 'Creó el grupo' : '', brings ? `trae ${plural(brings, 'cosa', 'cosas')}` : 'todavía no eligió qué traer'].filter(Boolean).join(', ');
          return (
            <li className="member" key={uid}>
              <Avatar group={group} uid={uid} myUid={myUid} />
              <span className="member-info"><strong>{memberName(group, uid, myUid)}</strong><small>{info.charAt(0).toUpperCase() + info.slice(1)}</small></span>
              {isOwner && uid !== myUid && (
                <AsyncButton className="btn btn-text" pendingLabel="Quitando…" onClick={() => onRemove(uid)}>Quitar</AsyncButton>
              )}
            </li>
          );
        })}
      </ul>
      {!isOwner && <p className="hint">Solo quien creó el grupo puede quitar personas.</p>}
      <div className="sheet-foot spread">
        <div className="group">
          {isOwner && !confirmDelete && <button className="btn btn-text danger" type="button" onClick={() => setConfirmDelete(true)}>Eliminar grupo</button>}
          {isOwner && confirmDelete && (
            <>
              <AsyncButton className="btn btn-text danger-solid" pendingLabel="Eliminando…" onClick={onDelete}>Sí, eliminar el grupo</AsyncButton>
              <button className="btn btn-text" type="button" onClick={() => setConfirmDelete(false)}>No</button>
            </>
          )}
          {!isOwner && <AsyncButton className="btn btn-text danger" pendingLabel="Saliendo…" onClick={onLeave}>Salir del grupo</AsyncButton>}
        </div>
        <button className="btn btn-primary" type="button" onClick={onInvite}>Invitar con link</button>
      </div>
    </div>
  );
}

/* ---------- Invitación (al abrir el link) ---------- */
export function InviteDialog({ invite, onClose, onJoin }) {
  return (
    <Modal open={!!invite} onClose={onClose} labelledBy="invite-title">
      {invite && (
        <div className="detail">
          <div className="sheet-head">
            <h3 id="invite-title">{invite.error ? 'No encontramos el grupo' : `Te invitaron a ${invite.group.name}`}</h3>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
          </div>
          {invite.error ? (
            <p className="muted">{invite.error}</p>
          ) : (
            <>
              <p className="muted">
                Es una lista del súper compartida con {plural(invite.group.members.length, 'persona', 'personas')}
                {invite.group.names?.[invite.group.owner] ? `; la creó ${invite.group.names[invite.group.owner]}` : ''}.
                Si te sumás, vas a ver la lista y podrás elegir qué traés.
              </p>
              <div className="sheet-foot">
                <button className="btn btn-text" type="button" onClick={onClose}>Ahora no</button>
                <AsyncButton className="btn btn-primary" pendingLabel="Sumándote…" onClick={onJoin}>Sumarme al grupo</AsyncButton>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
