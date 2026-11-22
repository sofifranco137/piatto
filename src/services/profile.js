/* =========================================================
   Perfil: la foto de perfil de cada persona.
     users/{uid}/profile/main → photo (data URL JPEG cuadrada), updatedAt
   Si no hay foto propia, se usa la de Google (user.photoURL) y,
   si tampoco hay, las iniciales.

   CONSULTAR → subscribeProfile()   (onSnapshot, en tiempo real)
   MODIFICAR → saveProfilePhoto()   (setDoc: crea o reemplaza)
   ELIMINAR  → removeProfilePhoto() (vuelve a la de Google o a las iniciales)
   ========================================================= */
import { deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const profileRef = (uid) => doc(db, 'users', uid, 'profile', 'main');

export function subscribeProfile(uid, onData, onError) {
  return onSnapshot(profileRef(uid), (snap) => onData(snap.exists() ? snap.data() : {}), onError);
}

export function saveProfilePhoto(uid, photo) {
  return setDoc(profileRef(uid), { photo, updatedAt: Date.now() });
}

export function removeProfilePhoto(uid) {
  return deleteDoc(profileRef(uid));
}
