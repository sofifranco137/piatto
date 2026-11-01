/* Utilidades para ingredientes: leer "200 g harina", mostrar cantidades y comparar nombres */

const UNITS = ['kg', 'g', 'gr', 'l', 'ml', 'cc', 'taza', 'tazas', 'cda', 'cdas', 'cdita', 'cditas', 'diente', 'dientes',
  'lata', 'latas', 'paquete', 'paquetes', 'atado', 'atados', 'pizca', 'unidad', 'unidades', 'feta', 'fetas',
  'sobre', 'sobres', 'botella', 'botellas', 'bolsa', 'bolsas'];

// Colores de categoría de las recetas. Todos son claros a propósito: llevan texto oscuro encima,
// así que cualquier receta nueva va a ser legible.
export const TAGS = ['#F7D654', '#B8D8B5', '#F7AE9E', '#F6CDB3', '#F5BCCD', '#D6CBF3', '#BFE3D4'];
export const tagColor = (tag) => TAGS[(tag ?? 0) % TAGS.length];

// "Huevos" y "huevo" cuentan como lo mismo; también ignora tildes y mayúsculas
export const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/(es|s)$/, '');

export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function parseQty(s) {
  const map = { '½': 0.5, '¼': 0.25, '¾': 0.75 };
  if (map[s]) return map[s];
  if (s.includes('/')) { const [a, b] = s.split('/').map(Number); return b ? a / b : a; }
  return parseFloat(s.replace(',', '.'));
}

// "200 g harina" → { qty: 200, unit: 'g', name: 'harina' }
export function parseIng(text) {
  const t = text.trim().toLowerCase().replace(/\s+/g, ' ');
  const q = t.match(/^(\d+\/\d+|\d+(?:[.,]\d+)?|[½¼¾])\s*/);
  if (!q) return { name: t, qty: null, unit: '' };
  let rest = t.slice(q[0].length);
  let unit = '';
  const u = rest.match(/^([a-záéíóúñ]+)\.?\s+(?:de\s+)?/);
  if (u && UNITS.includes(u[1])) { unit = u[1]; rest = rest.slice(u[0].length); }
  return { name: rest || t, qty: parseQty(q[1]), unit };
}

export function fmtQty(q) {
  if (q == null || Number.isNaN(q)) return '';
  if (q >= 10) return String(Math.round(q));
  const r = Math.max(0.25, Math.round(q * 4) / 4);
  const w = Math.floor(r);
  const f = { 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' }[r - w];
  return (w ? String(w) : '') + f;
}

// f es el factor de porciones: si la receta es para 4 y cocinás para 2, f = 0.5
export const fmtAmount = (i, f = 1) => [fmtQty(i.qty != null ? i.qty * f : null), i.unit].filter(Boolean).join(' ');
export const fmtIng = (i, f = 1) => [fmtAmount(i, f), i.name].filter(Boolean).join(' ');
export const factor = (recipe, servings) => (recipe.servings ? servings / recipe.servings : 1);

// Saca la numeración que alguien haya escrito a mano: "1. Batir" → "Batir"
// (la app ya numera los pasos sola)
export const cleanStep = (s) => String(s).replace(/^\s*(paso\s*)?\d+\s*[.):\-]\s*/i, '').trim();

// Secciones del súper, en el orden en que se recorre
export const SECTIONS = [
  ['Verdulería', ['papa', 'cebolla', 'cebolla morada', 'ajo', 'tomate', 'zanahoria', 'morrón', 'albahaca', 'limón', 'pepino', 'lechuga', 'perejil', 'zapallo', 'batata', 'manzana', 'banana', 'naranja', 'palta', 'espinaca', 'acelga', 'choclo', 'zucchini', 'berenjena', 'puerro', 'verdeo', 'rúcula']],
  ['Carnicería y fiambrería', ['chorizo', 'carne', 'carne picada', 'pollo', 'cerdo', 'jamón', 'panceta', 'salame', 'milanesa', 'pescado', 'bondiola', 'nalga']],
  ['Lácteos y huevos', ['leche', 'huevo', 'manteca', 'queso', 'queso rallado', 'crema', 'yogur', 'dulce de leche', 'ricota', 'mozzarella']],
  ['Panadería', ['pan', 'pan rallado', 'tapas de empanada', 'prepizza', 'tortillas']],
  ['Almacén', ['harina', 'fideos', 'arroz', 'lentejas', 'garbanzos', 'porotos', 'aceite', 'sal', 'azúcar', 'pimentón', 'tomate triturado', 'puré de tomate', 'nueces', 'yerba', 'café', 'polenta', 'orégano', 'pimienta', 'vinagre', 'caldo', 'levadura', 'atún', 'mayonesa', 'aceitunas']],
  ['Bebidas', ['agua', 'gaseosa', 'cerveza', 'vino', 'jugo', 'soda']],
  ['Varios', ['hielo', 'servilletas', 'vasos', 'carbón']],
];
export const SECTION_ORDER = [...SECTIONS.map((s) => s[0]), 'Otros'];

export function sectionOf(name) {
  const n = norm(name);
  for (const [s, list] of SECTIONS) if (list.some((x) => norm(x) === n)) return s;
  for (const [s, list] of SECTIONS) if (list.some((x) => n.includes(norm(x)))) return s;
  return 'Otros';
}

export const hasIn = (list, name) => list.some((x) => norm(x.name) === norm(name));

// Cuánto de una receta tenés en la alacena
export function matchOf(recipe, pantry) {
  const owned = recipe.ingredients.filter((i) => hasIn(pantry, i.name));
  const missing = recipe.ingredients.filter((i) => !hasIn(pantry, i.name));
  return { owned, missing, pct: Math.round((owned.length / recipe.ingredients.length) * 100) };
}
