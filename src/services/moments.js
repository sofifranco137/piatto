/* =========================================================
   Sobremesa: el álbum de fotos de las comidas compartidas.
   Cada foto ("momento") vive en uno de dos lugares:
     users/{uid}/moments/{id}       → álbum privado: solo lo ve su dueña
     lists/{grupoId}/moments/{id}   → álbum de un grupo: lo ven sus miembros
   Campos: photos [{ src (data URL JPEG), width, height }] (de 1 a 3; la primera es la portada),
           recipeId, recipeName, people, caption, date ('AAAA-MM-DD'), addedBy, createdAt
   Las fotos se achican antes de guardarlas (ver lib/photos.js).

   CONSULTAR → subscribeMoments()   (onSnapshot, en tiempo real)
   AGREGAR   → addMoment()
   MODIFICAR → updateMoment()       (cambiar fotos o datos)
   ELIMINAR  → deleteMoment()       (y restoreMoment() para deshacer)
   ========================================================= */
import {
  addDoc, collection, deleteDoc, deleteField, doc, limit, onSnapshot, orderBy, query, setDoc, updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

export const MAX_MOMENTS = 60; // las últimas 60 fotos de cada álbum

// album: null = privado (Solo yo); si no, el id del grupo
const momentsCol = (uid, album) => (album
  ? collection(db, 'lists', album, 'moments')
  : collection(db, 'users', uid, 'moments'));
const momentRef = (uid, album, id) => doc(momentsCol(uid, album), id);

// Las más recientes primero: por la fecha de la comida y, si empatan, por cuándo se subió
const byDate = (a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt;

// Las fotos de un momento. Los primeros momentos de prueba tenían una sola foto en "photo".
export const photosOf = (m) => (m.photos?.length ? m.photos : m.photo ? [{ src: m.photo, width: m.width, height: m.height }] : []);

// Los campos que se guardan, iguales al agregar y al modificar
const fields = (m) => ({
  photos: m.photos.map(({ src, width, height }) => ({ src, width, height })),
  recipeId: m.recipeId || null,
  recipeName: m.recipeName || null,
  people: m.people.trim(),
  caption: m.caption.trim(),
  date: m.date,
});

/* ---------- Consultar ---------- */
export function subscribeMoments(uid, album, onData, onError) {
  const q = query(momentsCol(uid, album), orderBy('createdAt', 'desc'), limit(MAX_MOMENTS));
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byDate));
  }, onError);
}

/* ---------- Agregar ---------- */
export function addMoment(uid, album, m) {
  return addDoc(momentsCol(uid, album), { ...fields(m), addedBy: uid, createdAt: Date.now() });
}

/* ---------- Modificar ---------- */
// Cambia las fotos y los datos. Borra los campos viejos de una sola foto, si los tenía.
export function updateMoment(uid, album, id, m) {
  return updateDoc(momentRef(uid, album, id), {
    ...fields(m), updatedAt: Date.now(), photo: deleteField(), width: deleteField(), height: deleteField(),
  });
}

/* ---------- Eliminar ---------- */
export function deleteMoment(uid, album, id) {
  return deleteDoc(momentRef(uid, album, id));
}

// Deshacer: vuelve a escribir la foto con el mismo id
export function restoreMoment(uid, album, { id, ...data }) {
  return setDoc(momentRef(uid, album, id), data);
}
