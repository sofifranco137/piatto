/* =========================================================
   Conexión con Firebase.
   Acá se inicializa la app con las variables del archivo .env
   y se exportan los dos servicios que usamos:
   - auth: registro e inicio de sesión con correo y contraseña, o con Google
   - db:   Cloud Firestore, donde se guardan los datos
   ========================================================= */
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword, getAuth, GoogleAuthProvider, onAuthStateChanged, sendPasswordResetEmail,
  signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Si falta alguna variable, la app muestra una pantalla de ayuda en vez de romperse
export const isConfigured = Object.values(firebaseConfig).every(Boolean);

export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

// Avisa cada vez que alguien inicia o cierra sesión (user es null si no hay sesión)
export function watchUser(onChange) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, onChange);
}

// Crear cuenta y guardar el nombre de la persona
export async function signUp(name, email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: name });
  return user;
}

export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

// Abre la ventanita de Google para elegir una cuenta
export function signInWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export function signOutUser() {
  return signOut(auth);
}

// Manda un correo para elegir una contraseña nueva
export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}
