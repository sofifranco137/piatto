/* =========================================================
   Todas las operaciones con Cloud Firestore.
   Cada usuario tiene sus datos en:
     users/{uid}/recipes/{id}   → recetas
     users/{uid}/pantry/{id}    → lo que hay en la alacena
     users/{uid}/shopping/{id}  → la lista del súper

   CONSULTAR  → subscribe()        (onSnapshot: lee y escucha cambios)
   AGREGAR    → addRecipe(), addPantryItems(), addListItems()
   MODIFICAR  → updateRecipe(), setListItemChecked()
   ELIMINAR   → deleteRecipe(), deletePantryItem(), deleteListItems()
   ========================================================= */
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

const col = (uid, name) => collection(db, 'users', uid, name);
const ref = (uid, name, id) => doc(db, 'users', uid, name, id);

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

/* ---------- Lista del súper ---------- */
export function addListItems(uid, items) {
  const batch = writeBatch(db);
  const now = Date.now();
  items.forEach((item, i) => batch.set(doc(col(uid, 'shopping')), {
    name: item.name,
    qty: item.qty ?? null,
    unit: item.unit ?? '',
    from: item.from ?? null,
    checked: false,
    createdAt: now + i,
  }));
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

// Lo comprado pasa a la alacena y sale de la lista, en una sola operación
export function moveBoughtToPantry(uid, boughtIds, namesForPantry) {
  const batch = writeBatch(db);
  const now = Date.now();
  namesForPantry.forEach((name, i) => batch.set(doc(col(uid, 'pantry')), { name, createdAt: now + i }));
  boughtIds.forEach((id) => batch.delete(ref(uid, 'shopping', id)));
  return batch.commit();
}

/* ---------- Datos de ejemplo (para la primera vez) ---------- */
export function loadExamples(uid, { recipes, pantry, list }) {
  const batch = writeBatch(db);
  const now = Date.now();
  recipes.forEach((r, i) => batch.set(doc(col(uid, 'recipes')), { ...r, cooked: 0, createdAt: now - i }));
  pantry.forEach((name, i) => batch.set(doc(col(uid, 'pantry')), { name, createdAt: now + i }));
  list.forEach((item, i) => batch.set(doc(col(uid, 'shopping')), {
    qty: null, unit: '', from: null, checked: false, ...item, createdAt: now + i,
  }));
  return batch.commit();
}
