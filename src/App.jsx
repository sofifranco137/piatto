import { useState } from 'react';
import Hero from './components/Hero';
import RecipesPanel from './components/RecipesPanel';
import RecipeForm from './components/RecipeForm';
import RecipeDetail from './components/RecipeDetail';
import PantryPanel from './components/PantryPanel';
import ShoppingList from './components/ShoppingList';
import SetupNotice from './components/SetupNotice';
import AuthScreen from './components/AuthScreen';
import { useToast } from './components/Toasts';
import { isConfigured, signOutUser } from './firebase';
import { useUser } from './hooks/useUser';
import { useCollection } from './hooks/useCollection';
import * as api from './services/db';
import { examples, bookFallback } from './data/examples';
import { friendlyError } from './lib/errors';
import logo from './assets/logo-piatto-claro.png';
import { hasIn, matchOf, plural } from './lib/ingredients';

const TABS = [
  ['recetas', 'Recetas', 'Recetas'],
  ['alacena', 'Mi alacena', 'Alacena'],
  ['lista', 'Lista del súper', 'Súper'],
];

function App() {
  if (!isConfigured) return <SetupNotice />;
  return <Session />;
}

// Decide qué mostrar según haya o no una sesión iniciada
function Session() {
  const { user, loading } = useUser();
  if (loading) return <div className="splash"><img src={logo} alt="Piatto" /></div>;
  if (!user) return <AuthScreen />;
  return <ConnectedApp key={user.uid} user={user} />;
}

function ConnectedApp({ user }) {
  const toast = useToast();
  const uid = user.uid;

  // CONSULTAR: las tres colecciones del usuario, en tiempo real
  const recipes = useCollection(uid, 'recipes', 'desc');
  const pantry = useCollection(uid, 'pantry', 'asc');
  const list = useCollection(uid, 'shopping', 'asc');

  const [tab, setTab] = useState('recetas');
  const [editing, setEditing] = useState(null); // null | 'new' | receta
  const [detailId, setDetailId] = useState(null);

  const loadError = recipes.error || pantry.error || list.error;

  const detail = recipes.data.find((r) => r.id === detailId) || null;
  const pending = list.data.filter((i) => !i.checked).length;
  const counts = { recetas: recipes.data.length, alacena: pantry.data.length, lista: pending };

  /* ---------- Acciones que escriben en Firestore ---------- */
  async function saveRecipe(data) {
    if (editing && editing !== 'new') await api.updateRecipe(uid, editing.id, data); // MODIFICAR
    else await api.addRecipe(uid, { ...data, tag: recipes.data.length });             // AGREGAR
  }

  async function deleteRecipe(recipe) {                                                // ELIMINAR
    await api.deleteRecipe(uid, recipe.id);
    setDetailId(null);
    toast(`Eliminaste “${recipe.name}”.`);
  }

  async function addMissing(recipe) {
    const missing = matchOf(recipe, pantry.data).missing;
    const toAdd = missing.filter((i) => !hasIn(list.data, i.name)).map((i) => ({ ...i, from: recipe.name }));
    if (!toAdd.length) return toast('Esos ingredientes ya están en tu lista.');
    await api.addListItems(uid, toAdd);
    toast(`Sumaste ${plural(toAdd.length, 'ingrediente', 'ingredientes')} a la lista.`);
  }

  async function removePantry(item) {
    await api.deletePantryItem(uid, item.id);
    toast(`Sacaste ${item.name} de tu alacena.`);
  }

  async function moveBought() {
    const bought = list.data.filter((i) => i.checked);
    const names = [...new Set(bought.map((b) => b.name))].filter((n) => !hasIn(pantry.data, n));
    await api.moveBoughtToPantry(uid, bought.map((b) => b.id), names);
    toast(`Pasaste ${bought.length} a tu alacena.`);
  }

  async function clearList() {
    await api.deleteListItems(uid, list.data.map((i) => i.id));
    toast('Vaciaste la lista.');
  }

  async function loadExamples() {
    await api.loadExamples(uid, examples);
    toast('Cargaste las recetas de ejemplo.');
  }

  function goTab(key) {
    setTab(key);
  }

  async function signOut() {
    try {
      await signOutUser();
    } catch (err) {
      toast(friendlyError(err), 'error');
    }
  }

  return (
    <>
      <Hero
        recipes={recipes.data.length ? recipes.data : bookFallback} user={user}
        onGo={goTab} onNewRecipe={() => setEditing('new')} onSignOut={signOut}
      />

      <main className="app" id="app">
        <div className="tabs-wrap">
          <div className="tabs" role="tablist" aria-label="Secciones">
            {TABS.map(([key, label, short]) => (
              <button key={key} role="tab" className="tab" aria-selected={tab === key} onClick={() => goTab(key)}>
                <span className="tl">{label}</span><span className="ts">{short}</span>
                <span className="count">{counts[key]}</span>
              </button>
            ))}
          </div>
        </div>

        {loadError && (
          <div className="alert" role="alert"><strong>No se pudieron leer los datos</strong>{friendlyError(loadError)}</div>
        )}

        {tab === 'recetas' && (
          <RecipesPanel
            recipes={recipes.data} pantry={pantry.data} loading={recipes.loading}
            onOpen={setDetailId} onNew={() => setEditing('new')} onAddMissing={addMissing} onLoadExamples={loadExamples}
          />
        )}
        {tab === 'alacena' && (
          <PantryPanel
            pantry={pantry.data} recipes={recipes.data} loading={pantry.loading}
            onAdd={(names) => api.addPantryItems(uid, names)} onRemove={removePantry}
            onOpen={setDetailId} onAddMissing={addMissing}
          />
        )}
        {tab === 'lista' && (
          <ShoppingList
            list={list.data} loading={list.loading}
            onAdd={(items) => api.addListItems(uid, items)}
            onToggle={(item) => api.setListItemChecked(uid, item.id, !item.checked)}
            onDelete={(ids) => api.deleteListItems(uid, ids)}
            onMoveBought={moveBought} onClear={clearList}
          />
        )}
      </main>

      <footer className="foot">Piatto. Hecho para el TP2 de Desarrollo Frontend II.</footer>

      <RecipeForm
        open={!!editing} recipe={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)} onSave={saveRecipe}
      />
      <RecipeDetail
        recipe={detail} pantry={pantry.data}
        onClose={() => setDetailId(null)}
        onEdit={(r) => { setDetailId(null); setEditing(r); }}
        onDelete={deleteRecipe} onAddMissing={addMissing}
      />
    </>
  );
}

export default App;
