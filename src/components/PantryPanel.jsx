import { useState } from 'react';
import AsyncButton from './AsyncButton';
import { useToast } from './Toasts';
import { friendlyError } from '../lib/errors';
import { hasIn, matchOf } from '../lib/ingredients';

function PantryPanel({ pantry, recipes, loading, onAdd, onRemove, onOpen, onAddMissing }) {
  const toast = useToast();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const names = [...new Set(value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))];
    if (!names.length) return setError('Escribí al menos un ingrediente.');
    const fresh = names.filter((n) => !hasIn(pantry, n));
    if (!fresh.length) return setError('Eso ya está en tu alacena.');
    setError(''); setSaving(true);
    try {
      await onAdd(fresh);
      setValue('');
      toast(`Agregaste ${fresh.join(', ')} a tu alacena.`);
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  const suggestions = [...new Set(recipes.flatMap((r) => r.ingredients.map((i) => i.name)).filter((n) => !hasIn(pantry, n)))].slice(0, 10);
  const ranked = recipes.map((r) => ({ r, ...matchOf(r, pantry) }))
    .sort((a, b) => b.pct - a.pct || a.missing.length - b.missing.length);

  return (
    <section className="panel" role="tabpanel">
      <div className="pantry-layout">
        <div className="pantry-box">
          <h2>Lo que tenés en casa</h2>
          <p className="muted">Sumá ingredientes y te decimos qué receta te queda más cerca.</p>
          <form className="inline-form" onSubmit={submit} noValidate>
            <input type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ej: arroz, tomate, queso" aria-label="Ingredientes que tenés" aria-invalid={!!error} autoComplete="off" />
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? <span className="spinner" /> : 'Agregar'}</button>
          </form>
          <p className="field-error" role="alert">{error}</p>

          <div className="jars">
            {loading && <span className="muted">Cargando tu alacena…</span>}
            {!loading && !pantry.length && <p className="muted">Todavía no cargaste nada. Empezá por lo que seguro tenés: sal, aceite, huevos.</p>}
            {pantry.map((p) => (
              <span className="jar" key={p.id}>
                {p.name}
                <AsyncButton aria-label={`Quitar ${p.name}`} onClick={() => onRemove(p)}>✕</AsyncButton>
              </span>
            ))}
          </div>

          {suggestions.length > 0 && (
            <div className="suggest">
              ¿Tenés alguno de estos?
              <div className="suggest-list">
                {suggestions.map((n) => (
                  <AsyncButton key={n} onClick={async () => { await onAdd([n]); toast(`Agregaste ${n} a tu alacena.`); }}>+ {n}</AsyncButton>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="match-box">
          <h2>Qué podés cocinar hoy</h2>
          <ol className="matches">
            {!ranked.length && <li className="empty"><strong>Sin recetas</strong>Cargá recetas para ver cuál te queda más cerca.</li>}
            {ranked.map((x, i) => {
              const best = i === 0 && x.pct > 0;
              return (
                <li key={x.r.id} className={`match ${best ? 'best' : ''}`}>
                  <div className="ring" style={{ '--p': x.pct }}><span>{x.pct}%</span></div>
                  <div>
                    <h3>{x.r.name}{best && <span className="best-badge">La más cercana</span>}</h3>
                    <p className="match-line">
                      {x.missing.length ? `Te ${x.missing.length === 1 ? 'falta' : 'faltan'} ${x.missing.length}:` : 'Tenés todo para hacerla hoy.'}
                    </p>
                    {x.missing.length > 0 && (
                      <div className="missing">{x.missing.map((m) => <span key={m.name} className="mini-chip">{m.name}</span>)}</div>
                    )}
                  </div>
                  <div className="match-actions">
                    <button className="link-btn" type="button" onClick={() => onOpen(x.r.id)}>Ver receta</button>
                    {x.missing.length > 0 && <AsyncButton className="link-btn" pendingLabel="Sumando…" onClick={() => onAddMissing(x.r)}>Sumar a la lista</AsyncButton>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

export default PantryPanel;
