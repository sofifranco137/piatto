import { useState } from 'react';
import Modal from './Modal';
import { useToast } from './Toasts';
import { friendlyError } from '../lib/errors';
import { fmtIng, norm, parseIng } from '../lib/ingredients';

// Formulario para crear o editar una receta (agregar / modificar en Firestore)
function RecipeForm({ open, recipe, onClose, onSave }) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="recipe-form-title">
      <FormBody key={recipe?.id || 'new'} recipe={recipe} onClose={onClose} onSave={onSave} />
    </Modal>
  );
}

function FormBody({ recipe, onClose, onSave }) {
  const toast = useToast();
  const [name, setName] = useState(recipe?.name || '');
  const [minutes, setMinutes] = useState(recipe?.minutes || '');
  const [servings, setServings] = useState(recipe?.servings || '');
  const [ings, setIngs] = useState(recipe?.ingredients || []);
  const [draft, setDraft] = useState('');
  const [steps, setSteps] = useState((recipe?.steps || []).join('\n'));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const pushIngs = (text, list = ings) => {
    const next = [...list];
    text.split(',').map((s) => s.trim()).filter(Boolean).map(parseIng)
      .forEach((i) => { if (!next.some((x) => norm(x.name) === norm(i.name))) next.push(i); });
    return next;
  };

  function onIngKey(e) {
    const v = draft.trim();
    if ((e.key === 'Enter' || e.key === ',') && v) {
      e.preventDefault();
      setIngs(pushIngs(v)); setDraft(''); setErrors((x) => ({ ...x, ingredients: '' }));
    } else if (e.key === 'Enter') e.preventDefault();
    else if (e.key === 'Backspace' && !v && ings.length) setIngs(ings.slice(0, -1));
  }

  async function submit(e) {
    e.preventDefault();
    const finalIngs = draft.trim() ? pushIngs(draft) : ings;
    setIngs(finalIngs); setDraft('');

    // Validaciones básicas
    const errs = {};
    if (name.trim().length < 3) errs.name = 'Poné un nombre de al menos 3 letras.';
    if (!minutes || +minutes < 1) errs.minutes = 'Indicá cuántos minutos lleva.';
    if (servings !== '' && +servings < 1) errs.servings = 'Tiene que ser 1 o más.';
    if (finalIngs.length < 2) errs.ingredients = 'Sumá al menos 2 ingredientes.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        minutes: Math.round(+minutes),
        servings: servings ? Math.round(+servings) : null,
        ingredients: finalIngs,
        steps: steps.split('\n').map((s) => s.trim()).filter(Boolean),
      });
      toast(recipe ? `Guardaste los cambios en “${name.trim()}”.` : `Guardaste “${name.trim()}” en tu recetario.`);
      onClose();
    } catch (err) {
      console.error(err);
      toast(friendlyError(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="sheet-head">
        <h3 id="recipe-form-title">{recipe ? 'Editar receta' : 'Nueva receta'}</h3>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>

      <label className="field">Nombre
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Milanesas a la napolitana" aria-invalid={!!errors.name} autoFocus />
        <span className="field-error">{errors.name}</span>
      </label>

      <div className="field-row">
        <label className="field">Minutos
          <input type="number" min="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="30" aria-invalid={!!errors.minutes} />
          <span className="field-error">{errors.minutes}</span>
        </label>
        <label className="field">Porciones
          <input type="number" min="1" value={servings} onChange={(e) => setServings(e.target.value)} placeholder="4" aria-invalid={!!errors.servings} />
          <span className="field-error">{errors.servings}</span>
        </label>
      </div>

      <div className="field">Ingredientes
        <div className={`chip-input ${errors.ingredients ? 'invalid' : ''}`}>
          {ings.map((i, n) => (
            <span className="chip" key={i.name}>
              {fmtIng(i)}
              <button type="button" aria-label={`Quitar ${i.name}`} onClick={() => setIngs(ings.filter((_, k) => k !== n))}>✕</button>
            </span>
          ))}
          <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onIngKey} placeholder="Ej: 200 g harina y Enter" aria-label="Agregar ingrediente" />
        </div>
        <span className="field-hint">Poné la cantidad adelante, por ejemplo “2 huevos” o “1 kg papas”.</span>
        <span className="field-error">{errors.ingredients}</span>
      </div>

      <label className="field"><span>Pasos <span className="optional">(opcional)</span></span>
        <textarea rows="4" value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="Un paso por línea" />
      </label>

      <div className="sheet-foot">
        <button type="button" className="btn btn-text" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <><span className="spinner" />Guardando…</> : recipe ? 'Guardar cambios' : 'Guardar receta'}
        </button>
      </div>
    </form>
  );
}

export default RecipeForm;
