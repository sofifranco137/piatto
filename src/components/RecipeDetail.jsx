import { useState } from 'react';
import Modal from './Modal';
import AsyncButton from './AsyncButton';
import Stepper from './Stepper';
import { cleanStep, factor, fmtAmount, hasIn, matchOf, plural, tagColor } from '../lib/ingredients';

function RecipeDetail({ recipe, pantry, onClose, onEdit, onDelete, onAddMissing, onCook }) {
  return (
    <Modal open={!!recipe} onClose={onClose} className="sheet sheet-detail" style={recipe ? { '--tag': tagColor(recipe.tag) } : undefined} labelledBy="detail-title">
      {recipe && <Body key={recipe.id} recipe={recipe} pantry={pantry} onClose={onClose} onEdit={onEdit} onDelete={onDelete} onAddMissing={onAddMissing} onCook={onCook} />}
    </Modal>
  );
}

function Body({ recipe, pantry, onClose, onEdit, onDelete, onAddMissing, onCook }) {
  const m = matchOf(recipe, pantry);
  const [servings, setServings] = useState(recipe.servings || 1);
  const f = factor(recipe, servings);

  return (
    <div className="detail">
      <div className="detail-hero">
        <div>
          <h3 id="detail-title">{recipe.name}</h3>
          <p>
            {recipe.minutes} min. Tenés {m.owned.length} de {recipe.ingredients.length}.
            {recipe.cooked > 0 && ` La cocinaste ${plural(recipe.cooked, 'vez', 'veces')}.`}
          </p>
        </div>
        <button className="icon-btn" type="button" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>

      {recipe.servings && (
        <div className="detail-servings">Porciones <Stepper value={servings} onChange={setServings} /></div>
      )}

      <div className="detail-cols">
        <div>
          <h4>Ingredientes</h4>
          <ul className="check-list">
            {recipe.ingredients.map((i) => {
              const ok = hasIn(pantry, i.name);
              return (
                <li key={i.name}>
                  <span className={`dot ${ok ? 'ok' : 'no'}`} aria-label={ok ? 'Lo tenés' : 'Te falta'}>{ok ? '✓' : ''}</span>
                  <span>{fmtAmount(i, f) && <span className="qty-strong">{fmtAmount(i, f)} </span>}{i.name}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h4>Preparación</h4>
          {recipe.steps?.length
            ? <ol>{recipe.steps.map((s) => <li key={s}>{cleanStep(s)}</li>)}</ol>
            : <p className="muted">Esta receta no tiene pasos cargados.</p>}
        </div>
      </div>

      <div className="sheet-foot spread">
        <div className="group">
          <AsyncButton className="btn btn-text danger" pendingLabel="Eliminando…" onClick={() => onDelete(recipe)}>Eliminar</AsyncButton>
          <button className="btn btn-text" type="button" onClick={() => onEdit(recipe)}>Editar</button>
        </div>
        <div className="group">
          {m.missing.length > 0 && (
            <AsyncButton className="btn btn-outline" pendingLabel="Sumando…" onClick={() => onAddMissing(recipe, f)}>
              Sumar {m.missing.length} a la lista
            </AsyncButton>
          )}
          <button className="btn btn-cook" type="button" onClick={() => onCook(recipe.id, servings)}>A cocinar</button>
        </div>
      </div>
    </div>
  );
}

export default RecipeDetail;
