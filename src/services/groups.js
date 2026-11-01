/* =========================================================
   Grupos: listas del súper compartidas entre varias personas.
   Se guardan en una colección compartida (no dentro de users/):
     lists/{grupoId}              → name, owner, members[], names{}, createdAt
     lists/{grupoId}/items/{id}   → name, qty, unit, from, checked, assignee,
                                    addedBy, checkedBy, createdAt
   Las reglas de Firestore dejan leer y escribir solo a quienes
   están en members (ver firestore.rules).
   ========================================================= */
import {
  arrayRemove, arrayUnion, collection, deleteDoc, deleteField, doc, getDoc, getDocs,
  onSnapshot, orderBy, query, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

const groupRef = (id) => doc(db, 'lists', id);
const itemsCol = (id) => collection(db, 'lists', id, 'items');
const itemRef = (gid, id) => doc(db, 'lists', gid, 'items', id);

export const displayName = (user) => (user.displayName || user.email?.split('@')[0] || 'Alguien').split(' ')[0];

/* ---------- Consultar ---------- */
// Los grupos donde estoy (members contiene mi uid), en tiempo real
export function subscribeMyGroups(uid, onData, onError) {
  const q = query(collection(db, 'lists'), where('members', 'array-contains', uid));
  return onSnapshot(q, (snap) => {
    const groups = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    groups.sort((a, b) => a.createdAt - b.createdAt);
    onData(groups);
  }, onError);
}

// Los ítems de un grupo, en tiempo real. onRemote avisa cambios hechos por otras personas.
export function subscribeItems(groupId, myUid, onData, onRemote, onError) {
  let first = true;
  return onSnapshot(query(itemsCol(groupId), orderBy('createdAt', 'asc')), (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    if (!first && !snap.metadata.hasPendingWrites) {
      snap.docChanges().forEach((c) => {
        const it = { id: c.doc.id, ...c.doc.data() };
        if (c.type === 'added' && it.addedBy && it.addedBy !== myUid) onRemote({ kind: 'added', item: it });
        if (c.type === 'modified' && it.checked && it.checkedBy && it.checkedBy !== myUid) onRemote({ kind: 'checked', item: it });
      });
    }
    first = false;
  }, onError);
}

// Lee un grupo puntual (para la pantalla de invitación)
export async function getGroup(id) {
  const snap = await getDoc(groupRef(id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/* ---------- Agregar ---------- */
export async function createGroup(user, name, items = []) {
  const batch = writeBatch(db);
  const ref = doc(collection(db, 'lists'));
  const now = Date.now();
  batch.set(ref, { name, owner: user.uid, members: [user.uid], names: { [user.uid]: displayName(user) }, createdAt: now });
  items.forEach((it, i) => batch.set(doc(itemsCol(ref.id)), newItem(it, user.uid, now + i)));
  await batch.commit();
  return ref.id;
}

const newItem = (it, uid, createdAt) => ({
  name: it.name, qty: it.qty ?? null, unit: it.unit ?? '', from: it.from ?? null,
  checked: false, assignee: null, addedBy: uid, checkedBy: null, createdAt,
});

export function addGroupItems(groupId, uid, items) {
  const batch = writeBatch(db);
  const now = Date.now();
  items.forEach((it, i) => batch.set(doc(itemsCol(groupId)), newItem(it, uid, now + i)));
  return batch.commit();
}

// Sumarme a un grupo con el link: solo agrego mi propio uid (las reglas no dejan hacer otra cosa)
export function joinGroup(groupId, user) {
  return updateDoc(groupRef(groupId), { members: arrayUnion(user.uid), [`names.${user.uid}`]: displayName(user) });
}

/* ---------- Modificar ---------- */
export function setGroupItemChecked(groupId, itemId, checked, uid) {
  return updateDoc(itemRef(groupId, itemId), { checked, checkedBy: checked ? uid : null });
}

export function assignGroupItem(groupId, itemId, assignee) {
  return updateDoc(itemRef(groupId, itemId), { assignee: assignee || null });
}

/* ---------- Eliminar ---------- */
export function deleteGroupItems(groupId, ids) {
  const batch = writeBatch(db);
  ids.forEach((id) => batch.delete(itemRef(groupId, id)));
  return batch.commit();
}

export function restoreGroupItems(groupId, items) {
  const batch = writeBatch(db);
  items.forEach(({ id, ...data }) => batch.set(itemRef(groupId, id), data));
  return batch.commit();
}

// Quien creó el grupo saca a alguien: sale de members y lo que traía queda sin asignar
export function removeMember(groupId, memberUid, items) {
  const batch = writeBatch(db);
  batch.update(groupRef(groupId), { members: arrayRemove(memberUid), [`names.${memberUid}`]: deleteField() });
  items.filter((i) => i.assignee === memberUid).forEach((i) => batch.update(itemRef(groupId, i.id), { assignee: null }));
  return batch.commit();
}

// Salir de un grupo (si no lo creaste vos): lo que traías queda sin asignar
export function leaveGroup(groupId, uid, items) {
  const batch = writeBatch(db);
  items.filter((i) => i.assignee === uid).forEach((i) => batch.update(itemRef(groupId, i.id), { assignee: null }));
  batch.update(groupRef(groupId), { members: arrayRemove(uid), [`names.${uid}`]: deleteField() });
  return batch.commit();
}

// Borrar el grupo entero: primero sus ítems y después el grupo
export async function deleteGroup(groupId) {
  const items = await getDocs(itemsCol(groupId));
  const batch = writeBatch(db);
  items.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(groupRef(groupId));
  return batch.commit();
}

export const inviteLink = (groupId) => `${window.location.origin}/?grupo=${groupId}`;
