/* =========================================================
   APIs externas gratuitas (no necesitan clave):
   - TheMealDB (themealdb.com): recetas con foto, ingredientes y pasos, en inglés.
   - MyMemory (mymemory.translated.net): traduce entre español e inglés.
   Se buscan recetas, se traducen al español y, si la persona quiere,
   se guardan en SU recetario de Firestore como cualquier otra receta.
   ========================================================= */
import { cleanStep } from '../lib/ingredients';

const MEALDB = 'https://www.themealdb.com/api/json/v1/1';
const MYMEMORY = 'https://api.mymemory.translated.net/get';
// Opcional: con un correo en VITE_MYMEMORY_EMAIL, MyMemory permite traducir más texto por día
const EMAIL = import.meta.env.VITE_MYMEMORY_EMAIL;

// Error con un mensaje claro para mostrar en la pantalla
const apiError = (message) => Object.assign(new Error(message), { friendly: message });

/* ---------- Traducir ---------- */
const cache = new Map();
export async function translate(text, from, to) {
  const clean = String(text || '').trim();
  if (!clean) return '';
  const key = `${from}|${to}|${clean}`;
  if (cache.has(key)) return cache.get(key);
  const params = new URLSearchParams({ q: clean.slice(0, 480), langpair: `${from}|${to}` });
  if (EMAIL) params.set('de', EMAIL);
  try {
    const res = await fetch(`${MYMEMORY}?${params}`);
    const data = await res.json();
    const out = data?.responseData?.translatedText;
    // Si se terminó el cupo diario, MyMemory responde con un aviso en vez de la traducción
    if (!out || /MYMEMORY WARNING|QUOTA/i.test(out) || data.responseStatus >= 400) return clean;
    cache.set(key, out);
    return out;
  } catch {
    return clean; // si falla la traducción, dejamos el texto original
  }
}

/* ---------- Buscar ---------- */
// Palabras de cocina frecuentes, para no depender del traductor con palabras sueltas
const DICT = {
  pollo: 'chicken', carne: 'beef', vaca: 'beef', cerdo: 'pork', cordero: 'lamb', pescado: 'fish', salmon: 'salmon',
  atun: 'tuna', camarones: 'prawns', langostinos: 'prawns', mariscos: 'seafood', huevo: 'egg', huevos: 'egg',
  arroz: 'rice', pasta: 'pasta', fideos: 'pasta', ñoquis: 'gnocchi', pizza: 'pizza', sopa: 'soup', guiso: 'stew',
  ensalada: 'salad', torta: 'cake', pastel: 'cake', tarta: 'tart', pie: 'pie', galletas: 'biscuits', galletitas: 'biscuits',
  chocolate: 'chocolate', queso: 'cheese', papa: 'potato', papas: 'potatoes', batata: 'sweet potato', tomate: 'tomato',
  cebolla: 'onion', ajo: 'garlic', zanahoria: 'carrot', calabaza: 'pumpkin', zapallo: 'pumpkin', berenjena: 'aubergine',
  hongos: 'mushroom', champiñones: 'mushroom', espinaca: 'spinach', lentejas: 'lentils', garbanzos: 'chickpeas',
  porotos: 'beans', frijoles: 'beans', manzana: 'apple', banana: 'banana', limon: 'lemon', frutilla: 'strawberry',
  frutillas: 'strawberries', panqueques: 'pancakes', postre: 'dessert', budin: 'pudding', pan: 'bread', curry: 'curry',
  hamburguesa: 'burger', vegetariano: 'vegetarian', vegano: 'vegan', desayuno: 'breakfast',
};
const strip = (w) => w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

async function toEnglish(term) {
  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  const known = words.map((w) => DICT[w] || DICT[strip(w)]);
  if (known.every(Boolean)) return known.join(' ');
  return translate(term, 'es', 'en');
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status);
  return (await res.json()).meals || [];
}

// La persona escribe en español; buscamos en inglés de varias formas y juntamos los resultados
export async function searchRecipes(term) {
  const english = (await toEnglish(term)).toLowerCase();
  const words = english.split(/\s+/).filter((w) => w.length > 2);
  const urls = [
    `${MEALDB}/search.php?s=${encodeURIComponent(english)}`,                  // por nombre
    `${MEALDB}/filter.php?i=${encodeURIComponent(english.replace(/\s+/g, '_'))}`, // por ingrediente
    ...(words.length > 1 ? words.map((w) => `${MEALDB}/search.php?s=${encodeURIComponent(w)}`) : []),
  ];
  let found;
  try {
    found = await Promise.all(urls.map((u) => getJson(u).catch(() => [])));
  } catch {
    throw apiError('No se pudo conectar con el buscador de recetas. Revisá tu internet y probá de nuevo.');
  }
  // Juntar sin repetir; primero las que tienen todas las palabras en el nombre
  const byId = new Map();
  found.flat().forEach((m) => { if (!byId.has(m.idMeal)) byId.set(m.idMeal, m); });
  const all = [...byId.values()];
  const score = (m) => words.filter((w) => m.strMeal.toLowerCase().includes(w)).length;
  all.sort((a, b) => score(b) - score(a));

  const list = all.slice(0, 12);
  const titles = await Promise.all(list.map((m) => translate(m.strMeal, 'en', 'es')));
  return list.map((m, i) => ({ id: m.idMeal, name: titles[i], original: m.strMeal, photo: m.strMealThumb, category: m.strCategory || '' }));
}

/* ---------- Pasar una receta al formato de Piatto ---------- */
const UNIT_MAP = {
  g: 'g', gr: 'g', gram: 'g', grams: 'g', kg: 'kg', ml: 'ml', l: 'l', litre: 'l', liter: 'l',
  cup: 'taza', cups: 'tazas', tbsp: 'cda', tbs: 'cda', tablespoon: 'cda', tablespoons: 'cdas',
  tsp: 'cdita', teaspoon: 'cdita', teaspoons: 'cditas', clove: 'diente', cloves: 'dientes',
  pinch: 'pizca', can: 'lata', tin: 'lata', slice: 'feta', slices: 'fetas',
};

export function parseMeasure(measure) {
  const m = String(measure || '').trim().toLowerCase();
  const num = m.match(/^(\d+\s+\d\/\d|\d+\/\d+|\d+(?:[.,]\d+)?)/);
  if (!num) return { qty: null, unit: '' };
  let qty;
  const raw = num[1];
  if (raw.includes(' ')) { const [w, f] = raw.split(/\s+/); const [a, b] = f.split('/'); qty = Number(w) + Number(a) / Number(b); }
  else if (raw.includes('/')) { const [a, b] = raw.split('/'); qty = Number(a) / Number(b); }
  else qty = parseFloat(raw.replace(',', '.'));
  const rest = m.slice(raw.length).trim().replace(/^of\s+/, '');
  const word = rest.split(/\s+/)[0]?.replace(/[^a-z]/g, '') || '';
  return { qty: Number.isFinite(qty) ? qty : null, unit: UNIT_MAP[word] || '' };
}

// Trae la receta completa, la traduce y la deja lista para guardar en Firestore
export async function getRecipeForImport(id) {
  let meal;
  try {
    const res = await fetch(`${MEALDB}/lookup.php?i=${encodeURIComponent(id)}`);
    meal = (await res.json()).meals?.[0];
  } catch {
    throw apiError('No se pudo traer la receta. Probá de nuevo en un momento.');
  }
  if (!meal) throw apiError('No encontramos esa receta.');

  const raw = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`]?.trim();
    if (name) raw.push({ name, measure: meal[`strMeasure${i}`] });
  }
  const steps = String(meal.strInstructions || '')
    .split(/\r?\n+|(?<=\.)\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3 && !/^step\s*\d+$/i.test(s))
    .slice(0, 20);

  const [name, ingNames, stepTexts] = await Promise.all([
    translate(meal.strMeal, 'en', 'es'),
    Promise.all(raw.map((r) => translate(r.name, 'en', 'es'))),
    Promise.all(steps.map((s) => translate(s, 'en', 'es'))),
  ]);

  const ingredients = [];
  raw.forEach((r, i) => {
    const n = ingNames[i].toLowerCase();
    if (!ingredients.some((x) => x.name === n)) ingredients.push({ name: n, ...parseMeasure(r.measure) });
  });

  if (ingredients.length < 2) throw apiError('Esta receta vino incompleta desde el buscador. Probá con otra.');

  return {
    name: name.slice(0, 80),
    minutes: 30,        // TheMealDB no informa el tiempo: queda en 30 y se puede editar
    servings: 4,
    ingredients: ingredients.slice(0, 60),
    steps: stepTexts.map(cleanStep).filter(Boolean),
    photo: meal.strMealThumb || null,
    source: 'TheMealDB',
  };
}
