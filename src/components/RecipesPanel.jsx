import { useState } from 'react';
import RecipeCard from './RecipeCard';
import AsyncButton from './AsyncButton';
import { norm } from '../lib/ingredients';

function RecipesPanel({ recipes, pantry, loading, onOpen, onNew, onAddMissing, onLoadExamples }) {
  const [query, setQuery] = useState('');
  const q = norm(query);
  const shown = recipes.filter((r) => !q || norm(r.name).includes(q) || r.ingredients.some((i) => norm(i.name).includes(q)));

  let content;
  if (loading) {
    content = <><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></>;
  } else if (!recipes.length) {
    content = (
      <div className="empty">
        <strong>Tu recetario está vacío</strong>
        Cargá tu primera receta con sus ingredientes, o empezá con algunas de ejemplo.
        <div className="hero-actions" style={{ marginTop: 0, justifyContent: 'center' }}>
          <button className="btn btn-primary" type="button" onClick={onNew}>Nueva receta</button>
          <AsyncButton className="btn btn-outline" pendingLabel="Cargando…" onClick={onLoadExamples}>Cargar recetas de ejemplo</AsyncButton>
        </div>
      </div>
    );
  } else if (!shown.length) {
    content = <div className="empty"><strong>Nada con “{query}”</strong>Probá con otro nombre o ingrediente.</div>;
  } else {
    content = shown.map((r) => <RecipeCard key={r.id} recipe={r} pantry={pantry} onOpen={onOpen} onAddMissing={onAddMissing} />);
  }

  return (
    <section className="panel" role="tabpanel">
      <div className="panel-head">
        <div>
          <h2>Tus recetas</h2>
          <p className="muted">Tocá una receta para ver qué te falta.</p>
        </div>
        <div className="panel-tools">
          <label className="search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            <input type="search" placeholder="Buscar receta o ingrediente" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar receta o ingrediente" />
          </label>
          <button className="btn btn-primary" type="button" onClick={onNew}>Nueva receta</button>
        </div>
      </div>
      <div className="recipe-grid">{content}</div>
    </section>
  );
}

export default RecipesPanel;
