import { useState } from 'react';
import Modal from './Modal';
import { useToast } from './Toasts';
import { friendlyError } from '../lib/errors';
import { getRecipeForImport, searchRecipes } from '../services/recipesApi';

// Buscar recetas en TheMealDB y guardarlas (traducidas) en el recetario
function ImportRecipe({ open, onClose, onImport, existingNames }) {
  return (
    <Modal open={open} onClose={onClose} className="sheet sheet-import" labelledBy="import-title">
      <Body onClose={onClose} onImport={onImport} existingNames={existingNames} />
    </Modal>
  );
}

function Body({ onClose, onImport, existingNames }) {
  const toast = useToast();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState(null); // null = todavía no buscó
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(null);
  const [added, setAdded] = useState(new Set());

  async function search(e) {
    e.preventDefault();
    if (term.trim().length < 2) return setError('Escribí qué querés cocinar, por ejemplo “pollo” o “torta”.');
    setError(''); setSearching(true); setResults(null);
    try {
      setResults(await searchRecipes(term.trim()));
    } catch (err) {
      setError(err.friendly || 'No se pudo buscar. Probá de nuevo.');
    } finally {
      setSearching(false);
    }
  }

  async function add(r) {
    setImporting(r.id);
    try {
      const recipe = await getRecipeForImport(r.id);
      await onImport(recipe);
      setAdded(new Set(added).add(r.id));
      toast(`Guardaste “${recipe.name}”. Revisá los minutos: el buscador no los trae.`);
    } catch (err) {
      toast(err.friendly || friendlyError(err), 'error');
    } finally {
      setImporting(null);
    }
  }

  return (
    <div className="detail">
      <div className="sheet-head">
        <h3 id="import-title">Buscar recetas</h3>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>
      <p className="muted">Buscá por plato o por ingrediente (por ejemplo, “pollo” o “torta”). Las recetas se traducen al español al guardarlas en tu recetario.</p>

      <form className="inline-form" onSubmit={search} noValidate>
        <input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Ej: pollo, pasta, torta de chocolate" aria-label="Buscar recetas" autoFocus />
        <button className="btn btn-primary" type="submit" disabled={searching}>{searching ? <span className="spinner" /> : 'Buscar'}</button>
      </form>
      {error && <p className="field-error" role="alert">{error}</p>}

      <div className="import-results" aria-live="polite">
        {searching && <p className="muted">Buscando y traduciendo…</p>}
        {results && !results.length && (
          <p className="muted">No encontramos recetas con “{term}”. El buscador es gratuito y tiene unas 300 recetas de cocina internacional: probá con una sola palabra, como pollo, carne, pasta, arroz, sopa o torta.</p>
        )}
        {results?.map((r) => {
          const already = added.has(r.id) || existingNames.some((n) => n.toLowerCase() === r.name.toLowerCase());
          return (
            <article className="import-card" key={r.id}>
              <img src={`${r.photo}/preview`} alt="" loading="lazy" onError={(e) => { e.currentTarget.src = r.photo; }} />
              <div>
                <h4>{r.name}</h4>
                {r.name.toLowerCase() !== r.original.toLowerCase() && <p className="import-original">{r.original}</p>}
              </div>
              <button className="btn btn-small btn-primary" type="button" disabled={already || importing === r.id} onClick={() => add(r)}>
                {importing === r.id ? <><span className="spinner" />Traduciendo…</> : already ? 'Guardada' : 'Guardar'}
              </button>
            </article>
          );
        })}
      </div>

      <p className="import-credit">Recetas de TheMealDB. Traducción automática de MyMemory: revisá que todo esté bien después de guardar.</p>
    </div>
  );
}

export default ImportRecipe;
