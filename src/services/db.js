/* =========================================================
   Todas las operaciones con Cloud Firestore.
   Cada usuario tiene sus datos en:
     users/{uid}/recipes/{id}    → recetas
     users/{uid}/pantry/{id}     → lo que hay en la alacena
     users/{uid}/shopping/{id}   → la lista del súper
     users/{uid}/plan/semana     → qué receta va cada día

   CONSULTAR  → subscribe(), subscribePlan()   (onSnapshot: lee y escucha cambios)
   AGREGAR    → addRecipe(), addPantryItems(), addListItems()
   MODIFICAR  → updateRecipe(), setListItemChecked(), savePlan()
   ELIMINAR   → deleteRecipe(), deletePantryItem(), deleteListItems()
   ========================================================= */
import {
  addDoc, collection, deleteDoc, doc, increment, onSnapshot, orderBy, query, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

const col = (uid, name) => collection(db, 'users', uid, name);
const ref = (uid, name, id) => doc(db, 'users', uid, name, id);
const listItem = (item, createdAt) => ({
  name: item.name,
  qty: item.qty ?? null,
  unit: item.unit ?? '',
  from: item.from ?? null,
  checked: false,
  createdAt,
});

/* ---------- Consultar ---------- */
// Lee una colección y vuelve a llamar a onData cada vez que cambia algo en la base.
export function subscribe(uid, name, direction, onData, onError) {
  const q = query(col(uid, name), orderBy('createdAt', direction));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

/* ---------- Recetas ---------- */
export function addRecipe(uid, recipe) {
  return addDoc(col(uid, 'recipes'), { ...recipe, cooked: 0, createdAt: Date.now() });
}

export function updateRecipe(uid, id, changes) {
  return updateDoc(ref(uid, 'recipes', id), changes);
}

export function deleteRecipe(uid, id) {
  return deleteDoc(ref(uid, 'recipes', id));
}

/* ---------- Alacena ---------- */
export function addPantryItems(uid, names) {
  const batch = writeBatch(db);
  const now = Date.now();
  names.forEach((name, i) => batch.set(doc(col(uid, 'pantry')), { name, createdAt: now + i }));
  return batch.commit();
}

export function deletePantryItem(uid, id) {
  return deleteDoc(ref(uid, 'pantry', id));
}

export function deletePantryItems(uid, ids) {
  const batch = writeBatch(db);
  ids.forEach((id) => batch.delete(ref(uid, 'pantry', id)));
  return batch.commit();
}

/* ---------- Lista del súper ---------- */
export function addListItems(uid, items) {
  const batch = writeBatch(db);
  const now = Date.now();
  items.forEach((item, i) => batch.set(doc(col(uid, 'shopping')), listItem(item, now + i)));
  return batch.commit();
}

// La modificación de estado: pendiente ↔ comprado
export function setListItemChecked(uid, id, checked) {
  return updateDoc(ref(uid, 'shopping', id), { checked });
}

export function deleteListItems(uid, ids) {
  const batch = writeBatch(db);
  ids.forEach((id) => batch.delete(ref(uid, 'shopping', id)));
  return batch.commit();
}

// Lo comprado pasa a la alacena y sale de la lista, en una sola operación.
// Devuelve los ids nuevos de la alacena para poder deshacerlo.
export async function moveBoughtToPantry(uid, boughtIds, namesForPantry) {
  const batch = writeBatch(db);
  const now = Date.now();
  const newIds = namesForPantry.map((name, i) => {
    const r = doc(col(uid, 'pantry'));
    batch.set(r, { name, createdAt: now + i });
    return r.id;
  });
  boughtIds.forEach((id) => batch.delete(ref(uid, 'shopping', id)));
  await batch.commit();
  return newIds;
}

/* ---------- Deshacer ---------- */
// Vuelve a escribir documentos que se borraron, con el mismo id y los mismos datos
export function restoreDocs(uid, name, docs) {
  const batch = writeBatch(db);
  docs.forEach(({ id, ...data }) => batch.set(ref(uid, name, id), data));
  return batch.commit();
}

/* ---------- Modo cocina ---------- */
// Al terminar de cocinar: saca de la alacena lo que se terminó, lo suma a la lista
// y cuenta una vez más la receta. Todo junto, en una sola operación.
export function finishCooking(uid, recipeId, pantryIdsToRemove, itemsForList) {
  const batch = writeBatch(db);
  const now = Date.now();
  pantryIdsToRemove.forEach((id) => batch.delete(ref(uid, 'pantry', id)));
  itemsForList.forEach((item, i) => batch.set(doc(col(uid, 'shopping')), listItem(item, now + i)));
  batch.update(ref(uid, 'recipes', recipeId), { cooked: increment(1) });
  return batch.commit();
}

/* ---------- Plan de la semana ---------- */
// Un solo documento con un mapa: { lun: [idsDeRecetas], mar: [...], ... }
export function subscribePlan(uid, onData, onError) {
  return onSnapshot(ref(uid, 'plan', 'semana'), (snap) => onData(snap.exists() ? snap.data().days || {} : {}), onError);
}

export function savePlan(uid, days) {
  return setDoc(ref(uid, 'plan', 'semana'), { days, updatedAt: Date.now() });
}

/* ---------- Datos de ejemplo (para la primera vez) ---------- */
export function loadExamples(uid, { recipes, pantry, list }) {
  const batch = writeBatch(db);
  const now = Date.now();
  recipes.forEach((r, i) => batch.set(doc(col(uid, 'recipes')), { ...r, cooked: 0, createdAt: now - i }));
  pantry.forEach((name, i) => batch.set(doc(col(uid, 'pantry')), { name, createdAt: now + i }));
  list.forEach((item, i) => batch.set(doc(col(uid, 'shopping')), listItem(item, now + i)));
  return batch.commit();
}
