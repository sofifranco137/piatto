// Traduce los errores de Firebase a mensajes que digan qué pasó y qué hacer
const AUTH_MESSAGES = {
  'auth/invalid-credential': 'El correo o la contraseña no son correctos.',
  'auth/wrong-password': 'El correo o la contraseña no son correctos.',
  'auth/user-not-found': 'No hay ninguna cuenta con ese correo. Probá crear una.',
  'auth/email-already-in-use': 'Ya hay una cuenta con ese correo. Probá iniciar sesión.',
  'auth/invalid-email': 'Ese correo no es válido. Revisá que esté bien escrito.',
  'auth/weak-password': 'La contraseña tiene que tener al menos 6 caracteres.',
  'auth/missing-password': 'Escribí tu contraseña.',
  'auth/too-many-requests': 'Hubo demasiados intentos. Esperá unos minutos y probá de nuevo.',
  'auth/network-request-failed': 'No hay conexión. Revisá tu internet y probá de nuevo.',
  'auth/operation-not-allowed': 'Falta habilitar “Correo electrónico/contraseña” en Firebase Authentication.',
  'auth/configuration-not-found': 'Falta activar Authentication en el proyecto de Firebase.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permití las ventanas emergentes para esta página y probá de nuevo.',
  'auth/unauthorized-domain': 'Esta dirección no está autorizada en Firebase. Agregala en Authentication → Configuración → Dominios autorizados.',
  'auth/account-exists-with-different-credential': 'Ya hay una cuenta con ese correo. Entrá con tu correo y contraseña.',
};

export function friendlyError(error) {
  const code = error?.code || '';
  if (AUTH_MESSAGES[code]) return AUTH_MESSAGES[code];
  if (code.includes('permission-denied')) return 'La base de datos rechazó el cambio. Revisá que las reglas de Firestore estén publicadas.';
  if (code.includes('unavailable')) return 'No hay conexión con la base de datos. Revisá tu internet y probá de nuevo.';
  if (code.includes('failed-precondition')) return 'Falta crear la base de datos de Firestore en el proyecto de Firebase.';
  if (code.startsWith('auth/')) return 'No se pudo iniciar la sesión. Probá de nuevo en un momento.';
  return 'No se pudo guardar. Probá de nuevo en un momento.';
}
