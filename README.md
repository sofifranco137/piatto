# Piatto

Piatto conecta tus recetas, lo que hay en tu alacena y la lista del súper. Cargás recetas con sus ingredientes y lo que tenés en casa, y la app te dice qué receta te queda más cerca y arma la lista con lo que falta.

Trabajo Práctico 2 de Desarrollo Frontend II (UADE): React + Vite, Cloud Firestore y despliegue en Vercel.

- **App publicada:** https://piatto-ruddy.vercel.app
- **Versión actual:** v3.0

## Qué hace

- **Recetas:** crear, ver, editar y eliminar recetas con ingredientes (con cantidad, por ejemplo “200 g harina”) y pasos.
- **Mi alacena:** cargar y quitar lo que tenés en casa. Ranking de “Qué podés cocinar hoy” según el porcentaje de ingredientes que tenés.
- **Lista del súper:** sumar los faltantes de una receta, agregar cosas a mano, tachar lo comprado (pendiente ↔ comprado), pasar lo comprado a la alacena y vaciar la lista. Se puede ver agrupada por sección del súper o por receta.
- **Porciones:** en el detalle de una receta se eligen las porciones y las cantidades se recalculan.
- **Modo “A cocinar”:** pantalla completa paso a paso, con temporizadores cuando un paso dice “20 minutos”, la pantalla siempre encendida y, al terminar, la opción de sacar de la alacena lo que se terminó y sumarlo a la lista.
- **Mi semana:** se arrastran recetas a los días (en el celular, se toca la receta y después el día) y se arma la lista de toda la semana de una vez.
- **Deshacer:** al eliminar una receta, un ingrediente o un ítem de la lista, o al vaciarla, aparece un botón para deshacerlo.
- **Buscar recetas:** busca recetas ya armadas en TheMealDB (en español: la búsqueda se traduce al inglés y la receta al español con MyMemory) y las guarda en el recetario.
- **Grupos:** listas del súper compartidas para una juntada o un viaje. Se invita con un link; cada ítem puede tener quién lo trae; los cambios se ven al instante para todos; quien creó el grupo puede quitar personas o eliminarlo.
- **Cuenta propia:** registro e inicio de sesión con correo y contraseña o con Google, cierre de sesión y recuperar la contraseña por correo.
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
3. **Authentication → Método de acceso → Correo electrónico/contraseña:** habilitarlo (solo la primera opción, no hace falta el vínculo por correo).
   También habilitar **Google** (en “Agregar proveedor nuevo”), eligiendo un correo de asistencia.
   Cuando la app esté en Vercel, agregar su dirección (por ejemplo `piatto.vercel.app`) en **Authentication → Configuración → Dominios autorizados**; si no, el botón de Google no funciona en la versión publicada.
4. **Firestore Database → Crear base de datos:** edición Standard, ID `(default)`, región `southamerica-east1` (São Paulo), **modo producción**.
5. **Firestore → Reglas:** pegar el contenido de [`firestore.rules`](./firestore.rules) y publicar.

> Las variables `VITE_` quedan visibles en el navegador. Eso está bien para la configuración web de Firebase: lo que protege los datos son las reglas de Firestore. Nunca poner en el `.env` claves privadas ni credenciales de cuentas de servicio.

## Dónde se conecta Firebase

| Archivo | Qué hace |
| --- | --- |
| `src/firebase.js` | Inicializa Firebase con las variables del `.env`, exporta `auth` y `db`, y tiene las funciones de registro, inicio de sesión, cierre de sesión y recuperar contraseña. |
| `src/services/db.js` | Las operaciones con Firestore de los datos personales: consultar (`onSnapshot`), agregar (`addDoc`, `writeBatch`), modificar (`updateDoc`) y eliminar (`deleteDoc`). |
| `src/services/groups.js` | Las operaciones de los grupos: crear, sumarse con el link, asignar, tachar, quitar personas y escuchar los cambios de los demás en tiempo real. |
| `src/services/recipesApi.js` | Las APIs externas: buscar en TheMealDB y traducir con MyMemory. |
| `src/hooks/useCollection.js` | Hook que trae una colección y la mantiene actualizada en tiempo real. |
| `src/App.jsx` | Usa esos datos y conecta los botones de la interfaz con las funciones de `db.js`. |

### Datos que se guardan

```
users/{uid}/recipes/{id}   name, minutes, servings, tag, ingredients[{name, qty, unit}], steps[], cooked, createdAt
users/{uid}/pantry/{id}    name, createdAt
users/{uid}/shopping/{id}  name, qty, unit, from, checked, createdAt
users/{uid}/plan/semana    days: { lun: [idsDeRecetas], mar: [...], ... }, updatedAt
lists/{grupoId}            name, owner, members[], names{uid: nombre}, createdAt
lists/{grupoId}/items/{id} name, qty, unit, from, checked, assignee, addedBy, checkedBy, createdAt
```

Cada persona crea su cuenta con correo y contraseña. Sus datos se guardan bajo su `uid`, así que ve lo mismo desde cualquier dispositivo, y nadie más puede leerlos (ver `firestore.rules`).

## APIs externas

- **TheMealDB** (https://www.themealdb.com/api.php): recetas con foto, ingredientes y pasos. Es gratuita y se usa con la clave pública de prueba `1`, así que no hay que configurar nada.
- **MyMemory** (https://mymemory.translated.net/doc/spec.php): traducción español ↔ inglés, gratuita y sin clave. Tiene un límite de texto por día; con un correo en `VITE_MYMEMORY_EMAIL` el límite es más alto. Si se agota, la receta se guarda en inglés y se puede editar.

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
  hooks/               useUser (sesión), useCollection y usePlan (datos en tiempo real), useBookTilt (libro 3D)
  components/          AuthScreen (ingreso), Hero, Book, CookMode (modo cocina), WeekPanel (semana), Stepper,
                       ListsPanel, GroupList, GroupDialogs, Avatar (grupos), ImportRecipe (buscador), RecipesPanel, RecipeCard, RecipeForm, RecipeDetail,
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
| v1.0 | Recetas, alacena con “qué podés cocinar” y lista del súper, guardados en Firestore. Inicio de sesión con correo o Google. |
| v2.0 | Modo “A cocinar”, porciones, plan semanal, lista por secciones del súper y deshacer. |
| v3.0 | Grupos con lista compartida, invitación por link, quién trae qué y cambios en tiempo real. Buscador de recetas con TheMealDB y traducción con MyMemory. |
