import AsyncButton from './AsyncButton';
import { matchOf, plural, tagColor, hasIn } from '../lib/ingredients';

function RecipeCard({ recipe, pantry, onOpen, onAddMissing }) {
  const m = matchOf(recipe, pantry);
  const extra = recipe.ingredients.length - 6;

  return (
    <article className="recipe" style={{ '--tag': tagColor(recipe.tag) }}>
      <span className="recipe-tab">{recipe.minutes} min</span>
      <div className="recipe-body">
        <button className="recipe-open" type="button" onClick={() => onOpen(recipe.id)}>
          <h3>{recipe.name}</h3>
          <span className="recipe-meta">
            <span>{recipe.servings ? plural(recipe.servings, 'porción', 'porciones') : 'Sin porciones'}</span>
            <span>{plural(recipe.ingredients.length, 'ingrediente', 'ingredientes')}</span>
          </span>
          <span className="recipe-ings">
            {recipe.ingredients.slice(0, 6).map((i) => (
              <span key={i.name} className={`mini-chip ${hasIn(pantry, i.name) ? 'have' : ''}`}>{i.name}</span>
            ))}
            {extra > 0 && <span className="mini-chip">+{extra}</span>}
          </span>
          <span className="meter">
            <span className="meter-bar"><span style={{ width: `${m.pct}%` }} /></span>
            Tenés {m.owned.length} de {recipe.ingredients.length}
          </span>
        </button>
        <div className="recipe-actions">
          {m.missing.length
            ? <AsyncButton className="link-btn" pendingLabel="Sumando…" onClick={() => onAddMissing(recipe)}>Sumar a la lista</AsyncButton>
            : <span className="ready">Tenés todo</span>}
        </div>
      </div>
    </article>
  );
}

export default RecipeCard;
