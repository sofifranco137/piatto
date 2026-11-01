import { useEffect, useRef, useState } from 'react';
import Hero from './components/Hero';
import RecipesPanel from './components/RecipesPanel';
import RecipeForm from './components/RecipeForm';
import RecipeDetail from './components/RecipeDetail';
import PantryPanel from './components/PantryPanel';
import ListsPanel from './components/ListsPanel';
import ImportRecipe from './components/ImportRecipe';
import { InviteDialog } from './components/GroupDialogs';
import WeekPanel, { DAYS } from './components/WeekPanel';
import CookMode from './components/CookMode';
import SetupNotice from './components/SetupNotice';
import AuthScreen from './components/AuthScreen';
import { useToast } from './components/Toasts';
import { isConfigured, signOutUser } from './firebase';
import { useUser } from './hooks/useUser';
import { useCollection } from './hooks/useCollection';
import { usePlan } from './hooks/usePlan';
import { useMyGroups } from './hooks/useGroups';
import * as groupsApi from './services/groups';
import * as api from './services/db';
import { examples, bookFallback } from './data/examples';
import { friendlyError } from './lib/errors';
import logo from './assets/logo-piatto-claro.png';
import { hasIn, matchOf, plural } from './lib/ingredients';

const TABS = [
  ['recetas', 'Recetas', 'Recetas'],
  ['semana', 'Mi semana', 'Semana'],
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

  // CONSULTAR: las colecciones del usuario y su plan, en tiempo real
  const recipes = useCollection(uid, 'recipes', 'desc');
  const pantry = useCollection(uid, 'pantry', 'asc');
  const list = useCollection(uid, 'shopping', 'asc');
  const plan = usePlan(uid);
  const groups = useMyGroups(uid);

  const [tab, setTab] = useState('recetas');
  const [editing, setEditing] = useState(null);   // null | 'new' | receta
  const [detailId, setDetailId] = useState(null);
  const [cooking, setCooking] = useState(null);   // { id, servings }
  const [importing, setImporting] = useState(false);
  const [activeList, setActiveList] = useState(null); // null = Mi lista, o el id de un grupo
  const [justCreated, setJustCreated] = useState(null);
  const [invite, setInvite] = useState(null);       // { group } o { error }

  // Invitación por link: piatto-ruddy.vercel.app/?grupo=ID
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('grupo');
    if (!id) return;
    window.history.replaceState(null, '', window.location.pathname); // limpia la dirección
    groupsApi.getGroup(id)
      .then((group) => {
        if (!group) return setInvite({ error: 'El link no corresponde a ningún grupo, o el grupo ya se eliminó.' });
        if (group.members.includes(uid)) { setTab('lista'); setActiveList(id); return null; }
        return setInvite({ group });
      })
      .catch(() => setInvite({ error: 'No pudimos abrir la invitación. Pedile a quien te la mandó un link nuevo.' }));
  }, [uid]);

  // Si me quitan del grupo que estoy mirando (o quien lo creó lo elimina), el grupo
  // deja de llegar en tiempo real: vuelvo a Mi lista y aviso qué pasó.
  const lastGroup = useRef(null);
  useEffect(() => {
    const current = groups.data.find((g) => g.id === activeList);
    if (current) { lastGroup.current = current; return; }
    const last = lastGroup.current;
    if (activeList && !groups.loading && last?.id === activeList) {
      lastGroup.current = null;
      setActiveList(null);
      toast(`Ya no sos parte de “${last.name}”: quien creó el grupo te quitó o lo eliminó.`);
    }
  }, [groups.data, groups.loading, activeList, toast]);

  const loadError = recipes.error || pantry.error || list.error || plan.error || groups.error;
  const detail = recipes.data.find((r) => r.id === detailId) || null;
  const cookRecipe = cooking && recipes.data.find((r) => r.id === cooking.id);
  const planned = DAYS.reduce((n, [k]) => n + (plan.days[k] || []).filter((id) => recipes.data.some((r) => r.id === id)).length, 0);
  const counts = {
    recetas: recipes.data.length,
    semana: planned,
    alacena: pantry.data.length,
    lista: list.data.filter((i) => !i.checked).length,
  };

  /* ---------- Recetas ---------- */
  async function saveRecipe(data) {
    if (editing && editing !== 'new') await api.updateRecipe(uid, editing.id, data); // MODIFICAR
    else await api.addRecipe(uid, { ...data, tag: recipes.data.length });             // AGREGAR
  }

  async function deleteRecipe(recipe) {                                                // ELIMINAR
    await api.deleteRecipe(uid, recipe.id);
    setDetailId(null);
    toast(`Eliminaste “${recipe.name}”.`, { undo: () => api.restoreDocs(uid, 'recipes', [recipe]) });
  }

  // f es el factor de porciones elegido en el detalle (1 si se suma desde la tarjeta)
  async function addMissing(recipe, f = 1) {
    const missing = matchOf(recipe, pantry.data).missing;
    const toAdd = missing.filter((i) => !hasIn(list.data, i.name))
      .map((i) => ({ ...i, qty: i.qty != null ? i.qty * f : null, from: recipe.name }));
    if (!toAdd.length) return toast('Esos ingredientes ya están en tu lista.');
    await api.addListItems(uid, toAdd);
    toast(`Sumaste ${plural(toAdd.length, 'ingrediente', 'ingredientes')} a la lista.`);
  }

  /* ---------- Modo cocina ---------- */
  function startCooking(id, servings) {
    setDetailId(null);
    setCooking({ id, servings });
  }

  async function finishCooking({ used, toList }) {
    const r = cookRecipe;
    const gone = pantry.data.filter((p) => used.has(p.id)); // used tiene los ids de la alacena que se terminaron
    const forList = toList ? gone.filter((p) => !hasIn(list.data, p.name)).map((p) => ({ name: p.name, from: r.name })) : [];
    await api.finishCooking(uid, r.id, gone.map((p) => p.id), forList);
    setCooking(null);
    toast(gone.length
      ? `¡Buen provecho! Sacaste ${plural(gone.length, 'ingrediente', 'ingredientes')} de la alacena${forList.length ? ' y los sumaste a la lista' : ''}.`
      : '¡Buen provecho! Sumamos una vez más a esta receta.');
  }

  /* ---------- Alacena ---------- */
  async function removePantry(item) {
    await api.deletePantryItem(uid, item.id);
    toast(`Sacaste ${item.name} de tu alacena.`, { undo: () => api.restoreDocs(uid, 'pantry', [item]) });
  }

  /* ---------- Lista ---------- */
  async function removeListItem(item) {
    await api.deleteListItems(uid, [item.id]);
    toast(`Sacaste ${item.name} de la lista.`, { undo: () => api.restoreDocs(uid, 'shopping', [item]) });
  }

  async function moveBought() {
    const bought = list.data.filter((i) => i.checked);
    const names = [...new Set(bought.map((b) => b.name))].filter((n) => !hasIn(pantry.data, n));
    const newIds = await api.moveBoughtToPantry(uid, bought.map((b) => b.id), names);
    toast(`Pasaste ${bought.length} a tu alacena.`, {
      undo: async () => {
        await api.deletePantryItems(uid, newIds);
        await api.restoreDocs(uid, 'shopping', bought);
      },
    });
  }

  async function clearList() {
    const all = list.data;
    await api.deleteListItems(uid, all.map((i) => i.id));
    toast('Vaciaste la lista.', { undo: () => api.restoreDocs(uid, 'shopping', all) });
  }

  /* ---------- Semana ---------- */
  async function weekToList(items, meals) {
    if (!meals) return toast('Primero sumá recetas a algún día.');
    if (!items.length) return toast('No falta nada: tenés todo o ya está en tu lista.');
    await api.addListItems(uid, items.map((i) => ({ ...i, from: 'Plan de la semana' })));
    toast(`Sumaste ${plural(items.length, 'ingrediente', 'ingredientes')} para la semana.`);
  }

  /* ---------- Grupos ---------- */
  async function createGroup(name, items) {
    const id = await groupsApi.createGroup(user, name, items);
    setActiveList(id);
    setJustCreated(id);
    toast(`Creaste “${name}”.`);
  }

  async function joinInvited() {
    const g = invite.group;
    await groupsApi.joinGroup(g.id, user);
    setInvite(null);
    setTab('lista');
    setActiveList(g.id);
    toast(`Te sumaste a “${g.name}”.`);
  }

  /* ---------- Recetas del buscador (TheMealDB) ---------- */
  async function importRecipe(recipe) {
    await api.addRecipe(uid, { ...recipe, tag: recipes.data.length });
  }

  async function loadExamples() {
    await api.loadExamples(uid, examples);
    toast('Cargaste las recetas de ejemplo.');
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
        onGo={setTab} onNewRecipe={() => setEditing('new')} onSignOut={signOut}
      />

      <main className="app" id="app">
        <div className="tabs-wrap">
          <div className="tabs" role="tablist" aria-label="Secciones">
            {TABS.map(([key, label, short]) => (
              <button key={key} role="tab" className="tab" aria-selected={tab === key} onClick={() => setTab(key)}>
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
            onOpen={setDetailId} onNew={() => setEditing('new')} onSearch={() => setImporting(true)} onCook={(id) => startCooking(id)}
            onAddMissing={addMissing} onLoadExamples={loadExamples}
          />
        )}
        {tab === 'semana' && (
          <WeekPanel
            days={plan.days} recipes={recipes.data} pantry={pantry.data} list={list.data} loading={plan.loading}
            onSave={(days) => api.savePlan(uid, days)} onOpen={setDetailId} onToList={weekToList}
          />
        )}
        {tab === 'alacena' && (
          <PantryPanel
            pantry={pantry.data} recipes={recipes.data} loading={pantry.loading}
            onAdd={(names) => api.addPantryItems(uid, names)} onRemove={removePantry}
            onOpen={setDetailId} onCook={(id) => startCooking(id)} onAddMissing={addMissing}
          />
        )}
        {tab === 'lista' && (
          <ListsPanel
            user={user} groups={groups} active={activeList} setActive={setActiveList}
            recipes={recipes.data} onCreateGroup={createGroup} justCreated={justCreated}
            personal={{
              list: list.data, loading: list.loading,
              onAdd: (items) => api.addListItems(uid, items),
              onToggle: (item) => api.setListItemChecked(uid, item.id, !item.checked),
              onDelete: removeListItem, onMoveBought: moveBought, onClear: clearList,
            }}
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
        onDelete={deleteRecipe} onAddMissing={addMissing} onCook={startCooking}
      />
      <ImportRecipe
        open={importing} onClose={() => setImporting(false)} onImport={importRecipe}
        existingNames={recipes.data.map((r) => r.name)}
      />
      <InviteDialog invite={invite} onClose={() => setInvite(null)} onJoin={joinInvited} />
      {cookRecipe && (
        <CookMode
          key={cookRecipe.id} recipe={cookRecipe} pantry={pantry.data} startServings={cooking.servings}
          onClose={() => setCooking(null)} onFinish={finishCooking}
        />
      )}
    </>
  );
}

export default App;
