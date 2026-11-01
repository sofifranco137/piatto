import { useState } from 'react';
import AsyncButton from './AsyncButton';
import { useToast } from './Toasts';
import { friendlyError } from '../lib/errors';
import { cap, fmtAmount, hasIn, parseIng, sectionOf, SECTION_ORDER } from '../lib/ingredients';

function ShoppingList({ list, loading, onAdd, onToggle, onDelete, onMoveBought, onClear }) {
  const toast = useToast();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null); // id del ítem que se está guardando
  const [groupBy, setGroupBy] = useState('section'); // 'section' | 'recipe'

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

  // Agrupa por sección del súper (en el orden en que se recorre) o por receta de origen
  const groups = new Map();
  list.forEach((it) => {
    const key = groupBy === 'section' ? sectionOf(it.name) : (it.from || 'Agregado a mano');
    groups.set(key, [...(groups.get(key) || []), it]);
  });
  const entries = [...groups.entries()];
  if (groupBy === 'section') entries.sort((a, b) => SECTION_ORDER.indexOf(a[0]) - SECTION_ORDER.indexOf(b[0]));
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
          {list.length > 0 && (
            <div className="seg" role="group" aria-label="Agrupar la lista">
              <button type="button" aria-pressed={groupBy === 'section'} onClick={() => setGroupBy('section')}>Por sección</button>
              <button type="button" aria-pressed={groupBy === 'recipe'} onClick={() => setGroupBy('recipe')}>Por receta</button>
            </div>
          )}
        </div>

        <ul className="shop-list">
          {loading && <li className="muted">Cargando la lista…</li>}
          {!loading && !list.length && (
            <li className="empty"><strong>La lista está vacía</strong>Sumá los faltantes desde una receta, armá la lista de la semana o agregá algo a mano.</li>
          )}
          {entries.map(([group, items]) => [
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
                    {groupBy === 'section' && it.from && <span className="sub">{it.from}</span>}
                  </span>
                </label>
                <AsyncButton className="icon-btn del" aria-label={`Quitar ${it.name}`} onClick={() => onDelete(it)}>✕</AsyncButton>
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
