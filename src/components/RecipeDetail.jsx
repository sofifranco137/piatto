import { useState } from 'react';
import Modal from './Modal';
import AsyncButton from './AsyncButton';
import { fmtAmount, hasIn, matchOf, tagColor } from '../lib/ingredients';

function RecipeDetail({ recipe, pantry, onClose, onEdit, onDelete, onAddMissing }) {
  return (
    <Modal open={!!recipe} onClose={onClose} className="sheet sheet-detail" style={recipe ? { '--tag': tagColor(recipe.tag) } : undefined} labelledBy="detail-title">
      {recipe && <Body key={recipe.id} recipe={recipe} pantry={pantry} onClose={onClose} onEdit={onEdit} onDelete={onDelete} onAddMissing={onAddMissing} />}
    </Modal>
  );
}

function Body({ recipe, pantry, onClose, onEdit, onDelete, onAddMissing }) {
  const m = matchOf(recipe, pantry);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="detail">
      <div className="detail-hero">
        <div>
          <h3 id="detail-title">{recipe.name}</h3>
          <p>{recipe.minutes} min{recipe.servings ? `, ${recipe.servings} porciones` : ''}. Tenés {m.owned.length} de {recipe.ingredients.length}.</p>
        </div>
        <button className="icon-btn" type="button" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>

      <div className="detail-cols">
        <div>
          <h4>Ingredientes</h4>
          <ul className="check-list">
            {recipe.ingredients.map((i) => {
              const ok = hasIn(pantry, i.name);
              return (
                <li key={i.name}>
                  <span className={`dot ${ok ? 'ok' : 'no'}`} aria-label={ok ? 'Lo tenés' : 'Te falta'}>{ok ? '✓' : ''}</span>
                  <span>{fmtAmount(i) && <span className="qty-strong">{fmtAmount(i)} </span>}{i.name}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h4>Preparación</h4>
          {recipe.steps?.length
            ? <ol>{recipe.steps.map((s) => <li key={s}>{s}</li>)}</ol>
            : <p className="muted">Esta receta no tiene pasos cargados.</p>}
        </div>
      </div>

      <div className="sheet-foot spread">
        <div className="group">
          {confirming ? (
            <>
              <AsyncButton className="btn btn-text danger-solid" pendingLabel="Eliminando…" onClick={() => onDelete(recipe)}>Sí, eliminar</AsyncButton>
              <button className="btn btn-text" type="button" onClick={() => setConfirming(false)}>No</button>
            </>
          ) : (
            <>
              <button className="btn btn-text danger" type="button" onClick={() => setConfirming(true)}>Eliminar</button>
              <button className="btn btn-text" type="button" onClick={() => onEdit(recipe)}>Editar</button>
            </>
          )}
        </div>
        <div className="group">
          {m.missing.length > 0 && (
            <AsyncButton className="btn btn-primary" pendingLabel="Sumando…" onClick={() => onAddMissing(recipe)}>
              Sumar {m.missing.length} a la lista
            </AsyncButton>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecipeDetail;
