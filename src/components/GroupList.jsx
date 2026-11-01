import { useState } from 'react';
import AsyncButton from './AsyncButton';
import Avatar, { memberColor, memberName } from './Avatar';
import { MembersDialog, ShareDialog } from './GroupDialogs';
import { useToast } from './Toasts';
import { friendlyError } from '../lib/errors';
import { cap, fmtAmount, hasIn, parseIng, plural, sectionOf, SECTION_ORDER } from '../lib/ingredients';
import { useGroupItems } from '../hooks/useGroups';
import * as groups from '../services/groups';

// La lista de un grupo: todos ven lo mismo y cada ítem puede tener quién lo trae
function GroupList({ group, user, justCreated, onGone }) {
  const toast = useToast();
  const myUid = user.uid;
  const [flash, setFlash] = useState(new Set());
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null);
  const [groupBy, setGroupBy] = useState('section'); // 'section' | 'person' | 'recipe'
  const [showPeople, setShowPeople] = useState(false);
  const [sharing, setSharing] = useState(justCreated ? 'new' : null); // null | 'new' | 'share'

  // Cuando otra persona del grupo cambia algo, aparece resaltado y con un aviso
  const items = useGroupItems(group.id, myUid, ({ kind, item }) => {
    const who = memberName(group, kind === 'added' ? item.addedBy : item.checkedBy, myUid);
    toast(kind === 'added' ? `${who} sumó ${item.name}.` : `${who} tachó ${item.name}.`);
    setFlash((f) => new Set(f).add(item.id));
    setTimeout(() => setFlash((f) => { const n = new Set(f); n.delete(item.id); return n; }), 2000);
  });
  const list = items.data;

  async function run(fn, okMessage, undo) {
    try {
      await fn();
      if (okMessage) toast(okMessage, undo ? { undo } : undefined);
    } catch (err) {
      toast(friendlyError(err), 'error');
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!value.trim()) return setError('Escribí qué hay que comprar.');
    const toAdd = value.split(',').map((s) => s.trim()).filter(Boolean).map(parseIng).filter((i) => !hasIn(list, i.name));
    if (!toAdd.length) return setError('Eso ya está en la lista.');
    setError(''); setSaving(true);
    await run(() => groups.addGroupItems(group.id, myUid, toAdd), 'Agregado a la lista del grupo.');
    setValue(''); setSaving(false);
  }

  async function toggle(it) {
    setBusy(it.id);
    await run(() => groups.setGroupItemChecked(group.id, it.id, !it.checked, myUid));
    setBusy(null);
  }

  function assign(it, uid) {
    run(() => groups.assignGroupItem(group.id, it.id, uid),
      uid ? `${uid === myUid ? 'Vos traés' : `${memberName(group, uid, myUid)} trae`} ${it.name}.` : `${cap(it.name)} quedó sin asignar.`);
  }

  // Resumen: qué traigo yo y qué falta repartir
  const mine = list.filter((i) => i.assignee === myUid && !i.checked).length;
  const free = list.filter((i) => !i.assignee && !i.checked).length;
  const bought = list.filter((i) => i.checked);

  // Agrupar
  const keyOf = (it) => {
    if (groupBy === 'section') return sectionOf(it.name);
    if (groupBy === 'recipe') return it.from || 'Agregado a mano';
    if (!it.assignee) return 'Sin asignar';
    return it.assignee === myUid ? 'Lo traés vos' : `Lo trae ${memberName(group, it.assignee, myUid)}`;
  };
  const order = groupBy === 'section' ? SECTION_ORDER
    : groupBy === 'person' ? ['Lo traés vos', ...group.members.filter((m) => m !== myUid).map((m) => `Lo trae ${memberName(group, m, myUid)}`), 'Sin asignar'] : null;
  const map = new Map();
  list.forEach((it) => { const k = keyOf(it); map.set(k, [...(map.get(k) || []), it]); });
  const entries = [...map.entries()];
  if (order) entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));

  return (
    <div className="list-paper">
      <div className="list-head">
        <div className="list-title-row">
          <h2>{group.name}</h2>
          <div className="list-tools">
            <button className="btn btn-small btn-outline" type="button" onClick={() => setShowPeople(true)}>Personas ({group.members.length})</button>
            <button className="btn btn-small btn-outline" type="button" onClick={() => setSharing('share')}>Compartir</button>
          </div>
        </div>
        <div className="presence">
          <span className="avatars">{group.members.map((uid) => <Avatar key={uid} group={group} uid={uid} myUid={myUid} />)}</span>
          <span>{group.members.length > 1 ? 'Los cambios aparecen al instante para todos.' : 'Solo vos por ahora. Mandá el link para que se sumen.'}</span>
        </div>
        {list.length > 0 && (
          <p className="group-summary">
            {mine ? `Vos traés ${plural(mine, 'cosa', 'cosas')}.` : 'Todavía no elegiste qué traer.'}{' '}
            {free ? `Falta decidir quién trae ${plural(free, 'cosa', 'cosas')}.` : 'Ya está todo repartido.'}
          </p>
        )}
        <form className="inline-form" onSubmit={submit} noValidate>
          <input type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Agregar algo. Ej: 6 cervezas, hielo" aria-label="Agregar a la lista del grupo" aria-invalid={!!error} autoComplete="off" />
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? <span className="spinner" /> : 'Agregar'}</button>
        </form>
        <p className="field-error" role="alert">{error}</p>
        {list.length > 0 && (
          <div className="seg" role="group" aria-label="Agrupar la lista">
            <button type="button" aria-pressed={groupBy === 'section'} onClick={() => setGroupBy('section')}>Por sección</button>
            <button type="button" aria-pressed={groupBy === 'person'} onClick={() => setGroupBy('person')}>Por persona</button>
            <button type="button" aria-pressed={groupBy === 'recipe'} onClick={() => setGroupBy('recipe')}>Por receta</button>
          </div>
        )}
      </div>

      <ul className="shop-list">
        {items.loading && <li className="muted">Cargando la lista…</li>}
        {items.error && <li className="alert" role="alert">{friendlyError(items.error)}</li>}
        {!items.loading && !list.length && (
          <li className="empty"><strong>La lista está vacía</strong>Sumá lo que hay que comprar y repártanse quién trae qué.</li>
        )}
        {entries.map(([g, its]) => [
          <li key={`g-${g}`} className="shop-group">{g}</li>,
          ...its.map((it) => {
            const sub = [
              groupBy !== 'recipe' && it.from ? it.from : '',
              it.checked && it.checkedBy && it.checkedBy !== myUid ? `lo tachó ${memberName(group, it.checkedBy, myUid)}` : '',
              !it.checked && it.addedBy && it.addedBy !== myUid ? `lo sumó ${memberName(group, it.addedBy, myUid)}` : '',
            ].filter(Boolean).join(', ');
            return (
              <li key={it.id} className={`shop-item ${flash.has(it.id) ? 'flash' : ''}`}>
                <label>
                  <input type="checkbox" checked={it.checked} disabled={busy === it.id} onChange={() => toggle(it)} />
                  <span className="info">
                    <span><span className="name">{cap(it.name)}</span>{fmtAmount(it) && <span className="qty">{fmtAmount(it)}</span>}</span>
                    {sub && <span className="sub">{sub}</span>}
                  </span>
                </label>
                <select
                  className={`who ${it.assignee ? '' : 'unassigned'}`} value={it.assignee || ''}
                  style={{ '--av': it.assignee ? memberColor(group, it.assignee) : undefined }}
                  onChange={(e) => assign(it, e.target.value)} aria-label={`Quién trae ${it.name}`}
                >
                  <option value="">¿Quién?</option>
                  {group.members.map((uid) => <option key={uid} value={uid}>{uid === myUid ? 'Yo' : memberName(group, uid, myUid)}</option>)}
                </select>
                <AsyncButton
                  className="icon-btn del" aria-label={`Quitar ${it.name}`}
                  onClick={() => run(() => groups.deleteGroupItems(group.id, [it.id]), `Sacaste ${it.name} de la lista.`, () => groups.restoreGroupItems(group.id, [it]))}
                >✕</AsyncButton>
              </li>
            );
          }),
        ])}
      </ul>

      {list.length > 0 && (
        <div className="list-foot">
          <AsyncButton
            className="btn btn-butter" disabled={!bought.length} pendingLabel="Sacando…"
            onClick={() => run(() => groups.deleteGroupItems(group.id, bought.map((i) => i.id)), `Sacaste ${plural(bought.length, 'cosa comprada', 'cosas compradas')}.`, () => groups.restoreGroupItems(group.id, bought))}
          >
            {bought.length ? `Sacar ${plural(bought.length, 'comprado', 'comprados')}` : 'Marcá lo que compraron'}
          </AsyncButton>
          <AsyncButton
            className="btn btn-text" pendingLabel="Vaciando…"
            onClick={() => run(() => groups.deleteGroupItems(group.id, list.map((i) => i.id)), 'Vaciaste la lista del grupo.', () => groups.restoreGroupItems(group.id, list))}
          >Vaciar lista</AsyncButton>
        </div>
      )}

      <MembersDialog
        group={showPeople ? group : null} items={list} myUid={myUid}
        onClose={() => setShowPeople(false)}
        onInvite={() => { setShowPeople(false); setSharing('share'); }}
        onRemove={async (uid) => {
          const name = memberName(group, uid, myUid);
          await groups.removeMember(group.id, uid, list);
          toast(`Quitaste a ${name} del grupo. Lo que traía quedó sin asignar.`);
        }}
        onLeave={async () => {
          setShowPeople(false); onGone();
          await groups.leaveGroup(group.id, myUid, list);
          toast(`Saliste de ${group.name}.`);
        }}
        onDelete={async () => {
          setShowPeople(false); onGone();
          await groups.deleteGroup(group.id);
          toast(`Eliminaste el grupo “${group.name}”.`);
        }}
      />
      <ShareDialog group={sharing ? group : null} justCreated={sharing === 'new'} onClose={() => setSharing(null)} />
    </div>
  );
}

export { GroupList };
export default GroupList;
