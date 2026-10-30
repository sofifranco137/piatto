# Piatto

Piatto conecta tus recetas, lo que hay en tu alacena y la lista del súper. Cargás recetas con sus ingredientes y lo que tenés en casa, y la app te dice qué receta te queda más cerca y arma la lista con lo que falta.

Trabajo Práctico 2 de Desarrollo Frontend II (UADE): React + Vite, Cloud Firestore y despliegue en Vercel.

- **App publicada:** _(completar con la URL de Vercel)_
- **Versión actual:** v1.0

## Qué hace (v1.0)

- **Recetas:** crear, ver, editar y eliminar recetas con ingredientes (con cantidad, por ejemplo “200 g harina”) y pasos.
- **Mi alacena:** cargar y quitar lo que tenés en casa. Ranking de “Qué podés cocinar hoy” según el porcentaje de ingredientes que tenés.
- **Lista del súper:** sumar los faltantes de una receta, agregar cosas a mano, tachar lo comprado (pendiente ↔ comprado), pasar lo comprado a la alacena y vaciar la lista.
- Validaciones en los formularios, estados de carga y mensajes de éxito o error. Funciona en computadora y en celular.

## Cómo ejecutarlo

Requisitos: Node.js 18 o más nuevo.

```bash
npm install
cp .env.example .env     # y completar con los datos de Firebase (ver abajo)
npm run dev
```

La app queda en http://localhost:5173. Si cambiás el `.env`, reiniciá `npm run dev`.

## Configurar Firebase

1. En [Firebase Console](https://console.firebase.google.com/), crear un proyecto (Google Analytics no hace falta).
2. **Registrar una app web** con el ícono `</>` y copiar los valores de `firebaseConfig` al `.env`:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
   Una variable por línea, sin comillas ni comas.
3. **Authentication → Sign-in method → Anónimo:** habilitarlo.
4. **Firestore Database → Crear base de datos:** edición Standard, ID `(default)`, región `southamerica-east1` (São Paulo), **modo producción**.
5. **Firestore → Reglas:** pegar el contenido de [`firestore.rules`](./firestore.rules) y publicar.

> Las variables `VITE_` quedan visibles en el navegador. Eso está bien para la configuración web de Firebase: lo que protege los datos son las reglas de Firestore. Nunca poner en el `.env` claves privadas ni credenciales de cuentas de servicio.

## Dónde se conecta Firebase

| Archivo | Qué hace |
| --- | --- |
| `src/firebase.js` | Inicializa Firebase con las variables del `.env`, exporta `auth` y `db`, e inicia sesión anónima. |
| `src/services/db.js` | **Todas** las operaciones con Firestore: consultar (`onSnapshot`), agregar (`addDoc`, `writeBatch`), modificar (`updateDoc`) y eliminar (`deleteDoc`). |
| `src/hooks/useCollection.js` | Hook que trae una colección y la mantiene actualizada en tiempo real. |
| `src/App.jsx` | Usa esos datos y conecta los botones de la interfaz con las funciones de `db.js`. |

### Datos que se guardan

```
users/{uid}/recipes/{id}   name, minutes, servings, tag, ingredients[{name, qty, unit}], steps[], cooked, createdAt
users/{uid}/pantry/{id}    name, createdAt
users/{uid}/shopping/{id}  name, qty, unit, from, checked, createdAt
```

Cada navegador tiene su propio usuario anónimo, así que abrir la app desde otro dispositivo muestra otra lista.

## Publicar en Vercel

1. En [Vercel](https://vercel.com/), importar el repositorio de GitHub.
2. Framework: **Vite**. Build: `npm run build`. Output: `dist`. Root Directory: la carpeta donde está `package.json`.
3. **Settings → Environment Variables:** cargar las cuatro variables `VITE_FIREBASE_...` para Production.
4. Desplegar. Si después se cambian las variables, hacer **Redeploy**.

Las reglas de Firestore se publican en Firebase: desplegar en Vercel no las actualiza.

## Estructura

```
src/
  App.jsx              pantalla principal y acciones
  firebase.js          conexión con Firebase
  services/db.js       operaciones con Firestore
  hooks/               useUser (sesión) y useCollection (datos en tiempo real)
  components/          Hero, Book, RecipesPanel, RecipeCard, RecipeForm, RecipeDetail,
                       PantryPanel, ShoppingList, Modal, AsyncButton, Toasts, SetupNotice
  lib/ingredients.js   leer “200 g harina”, comparar ingredientes, calcular coincidencias
  lib/errors.js        mensajes de error claros
  data/examples.js     recetas de ejemplo para la primera vez
  styles.css           estilos
firestore.rules        reglas de seguridad de Firestore
```

## Versiones

| Versión | Contenido |
| --- | --- |
| v1.0 | Recetas, alacena con “qué podés cocinar” y lista del súper, guardados en Firestore. |
| v2.0 | _(próxima)_ Modo cocina, porciones, plan semanal, secciones del súper, deshacer. |
| v3.0 | _(próxima)_ Grupos compartidos por link y tiempo real entre personas. |
