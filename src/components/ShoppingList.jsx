import { useState } from 'react';
import AsyncButton from './AsyncButton';
import { useToast } from './Toasts';
import { friendlyError } from '../lib/errors';
import { cap, fmtAmount, hasIn, parseIng } from '../lib/ingredients';

function ShoppingList({ list, loading, onAdd, onToggle, onDelete, onMoveBought, onClear }) {
  const toast = useToast();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null); // id del ítem que se está guardando

  async function submit(e) {
    e.preventDefault();
    if (!value.trim()) return setError('Escribí qué querés comprar.');
    const items = value.split(',').map((s) => s.trim()).filter(Boolean).map(parseIng).filter((i) => !hasIn(list, i.name));
    if (!items.length) return setError('Eso ya está en la lista.');
    setError(''); setSaving(true);
    try {
      await onAdd(items);
      setValue('');
      toast('Agregado a la lista.');
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item) {
    setBusy(item.id);
    try { await onToggle(item); } catch (err) { toast(friendlyError(err), 'error'); } finally { setBusy(null); }
  }

  // Agrupa por receta de origen
  const groups = new Map();
  list.forEach((it) => {
    const key = it.from || 'Agregado a mano';
    groups.set(key, [...(groups.get(key) || []), it]);
  });
  const bought = list.filter((i) => i.checked);

  return (
    <section className="panel" role="tabpanel">
      <div className="list-paper">
        <div className="list-head">
          <h2>Lista del súper</h2>
          <form className="inline-form" onSubmit={submit} noValidate>
            <input type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Agregar algo a mano. Ej: 1 kg yerba" aria-label="Agregar a la lista" aria-invalid={!!error} autoComplete="off" />
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? <span className="spinner" /> : 'Agregar'}</button>
          </form>
          <p className="field-error" role="alert">{error}</p>
        </div>

        <ul className="shop-list">
          {loading && <li className="muted">Cargando la lista…</li>}
          {!loading && !list.length && (
            <li className="empty"><strong>La lista está vacía</strong>Sumá los faltantes desde una receta o agregá algo a mano.</li>
          )}
          {[...groups.entries()].map(([group, items]) => [
            <li key={`g-${group}`} className="shop-group">{group}</li>,
            ...items.map((it) => (
              <li key={it.id} className="shop-item">
                <label>
                  <input type="checkbox" checked={it.checked} disabled={busy === it.id} onChange={() => toggle(it)} />
                  <span className="info">
                    <span>
                      <span className="name">{cap(it.name)}</span>
                      {fmtAmount(it) && <span className="qty">{fmtAmount(it)}</span>}
                    </span>
                  </span>
                </label>
                <AsyncButton className="icon-btn del" aria-label={`Quitar ${it.name}`} onClick={async () => { await onDelete([it.id]); toast(`Sacaste ${it.name} de la lista.`); }}>✕</AsyncButton>
              </li>
            )),
          ])}
        </ul>

        {list.length > 0 && (
          <div className="list-foot">
            <AsyncButton className="btn btn-butter" pendingLabel="Guardando…" disabled={!bought.length} onClick={onMoveBought}>
              {bought.length ? `Pasar ${bought.length} comprado${bought.length > 1 ? 's' : ''} a la alacena` : 'Marcá lo que compraste'}
            </AsyncButton>
            <AsyncButton className="btn btn-text" pendingLabel="Vaciando…" onClick={onClear}>Vaciar lista</AsyncButton>
          </div>
        )}
      </div>
    </section>
  );
}

export default ShoppingList;
