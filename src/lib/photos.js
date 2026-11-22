/* =========================================================
   Fotos: achicar y comprimir en el navegador antes de guardar.
   Firebase Storage pide el plan pago, así que cada foto se guarda
   en Firestore como texto (data URL JPEG). Un documento de Firestore
   admite hasta 1 MB y un momento puede tener hasta 3 fotos, así que
   cada una se achica para que ocupe menos de 300.000 caracteres.
   ========================================================= */

export const MAX_PHOTOS = 3;
const MAX_CHARS = 300000; // ~225 KB por foto: 3 fotos entran en un documento de 1 MB

// Lee el archivo como imagen (respeta la rotación de las fotos del celular)
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable')); };
    img.src = url;
  });
}

// Dibuja la imagen en un canvas más chico y la exporta como JPEG
function render(img, maxSide, quality, square) {
  let sx = 0; let sy = 0; let sw = img.naturalWidth; let sh = img.naturalHeight;
  if (square) { // recorte cuadrado centrado (para la foto de perfil)
    const side = Math.min(sw, sh);
    sx = (sw - side) / 2; sy = (sh - side) / 2; sw = side; sh = side;
  }
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.round(sw * scale);
  const h = Math.round(sh * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; // fondo blanco para PNG con transparencia
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  return { dataUrl: canvas.toDataURL('image/jpeg', quality), width: w, height: h };
}

// Devuelve { dataUrl, width, height }. Si la foto queda pesada, prueba más chica.
export async function compressImage(file, { maxSide = 1280, square = false, maxChars = MAX_CHARS } = {}) {
  if (!file || !file.type.startsWith('image/')) throw new Error('not-image');
  const img = await loadImage(file);
  const tries = [[maxSide, 0.78], [maxSide, 0.66], [Math.round(maxSide * 0.8), 0.62], [Math.round(maxSide * 0.62), 0.58], [Math.round(maxSide * 0.45), 0.55]];
  for (const [side, q] of tries) {
    const out = render(img, side, q, square);
    if (out.dataUrl.length <= maxChars) return out;
  }
  throw new Error('too-big');
}

// Mensaje claro para los errores de lectura de la foto
export function photoError(err) {
  if (err?.message === 'not-image') return 'Ese archivo no es una foto. Elegí una imagen JPG o PNG.';
  if (err?.message === 'unreadable') return 'No pudimos abrir esa foto. Probá con una JPG o PNG.';
  if (err?.message === 'too-big') return 'La foto es demasiado grande, incluso achicada. Probá con otra.';
  return 'No pudimos preparar la foto. Probá de nuevo.';
}

// Fecha de hoy como 'AAAA-MM-DD' (la del celular, no la de Greenwich)
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// '2026-11-14' → '14 de noviembre de 2026'
export function formatDate(iso) {
  const [y, m, d] = (iso || '').split('-').map(Number);
  if (!y) return '';
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}
