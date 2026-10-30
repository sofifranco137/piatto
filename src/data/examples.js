import { parseIng } from '../lib/ingredients';

const r = (name, minutes, servings, tag, ings, steps) => ({ name, minutes, servings, tag, ingredients: ings.map(parseIng), steps });

// Recetas para cargar la primera vez con el botón "Cargar recetas de ejemplo"
export const examples = {
  recipes: [
    r('Tortilla de papas', 40, 4, 0, ['1 kg papas', '6 huevos', '1 cebolla', '200 ml aceite', 'sal'],
      ['Cortar las papas y la cebolla en láminas finitas.', 'Freír a fuego bajo durante 20 minutos, hasta que estén tiernas.', 'Batir los huevos, mezclar con las papas y salar.', 'Cuajar en sartén 4 minutos de cada lado.']),
    r('Fideos con pesto', 20, 2, 1, ['250 g fideos', '1 atado albahaca', '1 diente ajo', '50 g queso rallado', '100 ml aceite', '30 g nueces'],
      ['Poner a hervir abundante agua con sal.', 'Procesar albahaca, ajo, nueces, queso y aceite.', 'Cocinar los fideos 9 minutos.', 'Mezclar con el pesto fuera del fuego.']),
    r('Guiso de lentejas', 60, 6, 2, ['400 g lentejas', '2 zanahorias', '1 cebolla', '1 morrón', '2 chorizos', '1 cda pimentón', '1 lata tomate triturado'],
      ['Rehogar cebolla, morrón y zanahoria 10 minutos.', 'Sumar el chorizo en rodajas y el pimentón.', 'Agregar tomate, lentejas y un litro de agua.', 'Cocinar a fuego bajo 40 minutos, revolviendo cada tanto.']),
    r('Panqueques', 25, 4, 4, ['250 g harina', '500 ml leche', '3 huevos', '30 g manteca', 'dulce de leche'],
      ['Batir harina, leche y huevos hasta que no queden grumos.', 'Dejar reposar la mezcla 10 minutos.', 'Cocinar en sartén con manteca, 1 minuto de cada lado.', 'Rellenar con dulce de leche y enrollar.']),
    r('Ensalada de garbanzos', 15, 2, 3, ['1 lata garbanzos', '2 tomates', '1 pepino', '½ cebolla morada', '1 limón', '2 cdas aceite'],
      ['Enjuagar los garbanzos.', 'Cortar todo en cubitos.', 'Condimentar con limón, aceite y sal.']),
  ],
  pantry: ['huevo', 'papa', 'cebolla', 'aceite', 'sal', 'harina', 'leche', 'ajo'],
  list: [{ name: 'yerba', qty: 1, unit: 'kg' }],
};

// Páginas del recetario del banner cuando todavía no hay recetas guardadas
export const bookFallback = examples.recipes.slice(0, 4);
