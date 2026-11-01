import { useState } from 'react';
import AsyncButton from './AsyncButton';
import { useToast } from './Toasts';
import { friendlyError } from '../lib/errors';
import { hasIn, norm, plural, tagColor } from '../lib/ingredients';

export const DAYS = [['lun', 'Lunes'], ['mar', 'Martes'], ['mie', 'Miércoles'], ['jue', 'Jueves'], ['vie', 'Viernes'], ['sab', 'Sábado'], ['dom', 'Domingo']];

// Junta lo que falta para toda la semana; si un ingrediente se repite con la misma unidad, suma las cantidades
export function weekNeeds(days, recipes, pantry, list) {
  const acc = new Map(); let meals = 0;
  DAYS.forEach(([key]) => (days[key] || []).forEach((id) => {
    const r = recipes.find((x) => x.id === id);
    if (!r) return;
    meals++;
    r.ingredients.filter((i) => !hasIn(pantry, i.name) && !hasIn(list, i.name)).forEach((i) => {
      const k = `${norm(i.name)}|${i.unit}`;
      const prev = acc.get(k);
      if (prev) { if (prev.qty != null && i.qty != null) prev.qty += i.qty; } else acc.set(k, { name: i.name, qty: i.qty, unit: i.unit });
    });
  }));
  return { meals, items: [...acc.values()] };
}

// Plan de la semana: arrastrá recetas a los días (o tocá la receta y después el día)
function WeekPanel({ days, recipes, pantry, list, loading, onSave, onOpen, onToList }) {
  const toast = useToast();
  const [picked, setPicked] = useState(null);
  const [over, setOver] = useState(null);
  const today = DAYS[(new Date().getDay() + 6) % 7][0];
  const { meals, items } = weekNeeds(days, recipes, pantry, list);

  async function save(next, message, undoPrev) {
    try {
      await onSave(next);
      if (message) toast(message, undoPrev ? { undo: () => onSave(undoPrev) } : undefined);
    } catch (err) {
      toast(friendlyError(err), 'error');
    }
  }

  function add(day, id) {
    setPicked(null); setOver(null);
    const r = recipes.find((x) => x.id === id);
    if (!r) return;
    const next = { ...days, [day]: [...(days[day] || []), id] };
    save(next, `${r.name} para el ${DAYS.find((d) => d[0] === day)[1].toLowerCase()}.`);
  }

  function remove(day, index) {
    const next = { ...days, [day]: (days[day] || []).filter((_, k) => k !== index) };
    save(next);
  }

  async function clearWeek() {
    if (!meals) return toast('La semana ya está vacía.');
    await save({}, 'Vaciaste la semana.', days);
  }

  return (
    <section className="panel" role="tabpanel">
      <div className="panel-head">
        <div>
          <h2>Tu semana</h2>
          <p className="muted">Arrastrá una receta a un día. En el celular, tocá la receta y después el día.</p>
        </div>
        <div className="panel-tools">
          <AsyncButton className="btn btn-text" onClick={clearWeek}>Vaciar semana</AsyncButton>
          <AsyncButton className="btn btn-primary" pendingLabel="Armando…" onClick={() => onToList(items, meals)}>Armar lista de la semana</AsyncButton>
        </div>
      </div>

      <div className="tray">
        {!recipes.length && <p className="muted">Cargá recetas para planear la semana.</p>}
        {recipes.map((r) => (
          <button
            key={r.id} type="button" className="pick" draggable aria-pressed={picked === r.id}
            style={{ '--tag': tagColor(r.tag) }}
            onClick={() => setPicked(picked === r.id ? null : r.id)}
            onDragStart={(e) => { e.dataTransfer.setData('text/plain', r.id); e.dataTransfer.effectAllowed = 'copy'; }}
          >
            {r.name}
          </button>
        ))}
      </div>

      <div className={`week ${picked ? 'awaiting' : ''}`}>
        {DAYS.map(([key, label]) => {
          const dayMeals = (days[key] || []).map((id, k) => ({ r: recipes.find((x) => x.id === id), k })).filter((x) => x.r);
          return (
            <div
              key={key}
              className={`day ${key === today ? 'is-today' : ''} ${over === key ? 'over' : ''}`}
              onClick={(e) => { if (picked && !e.target.closest('button')) add(key, picked); }}
              onDragOver={(e) => { e.preventDefault(); setOver(key); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null); }}
              onDrop={(e) => { e.preventDefault(); add(key, e.dataTransfer.getData('text/plain')); }}
            >
              <div className="day-head"><span>{label}</span>{key === today && <span className="today-pill">Hoy</span>}</div>
              {dayMeals.map(({ r, k }) => (
                <div className="meal" key={`${r.id}-${k}`} style={{ '--tag': tagColor(r.tag) }}>
                  <button type="button" className="meal-name" onClick={() => onOpen(r.id)}>{r.name}</button>
                  <button type="button" data-unplan aria-label={`Quitar ${r.name} del ${label}`} onClick={() => remove(key, k)}>✕</button>
                </div>
              ))}
              <span className="day-hint">{picked ? 'Tocá para sumarla' : dayMeals.length ? '' : 'Sin plan'}</span>
            </div>
          );
        })}
      </div>

      <p className="week-summary">
        {loading ? 'Cargando tu semana…'
          : meals ? `Planeaste ${plural(meals, 'comida', 'comidas')}. ${items.length ? `Te ${items.length === 1 ? 'falta' : 'faltan'} ${plural(items.length, 'ingrediente', 'ingredientes')} que todavía no están en tu lista.` : 'Tenés todo o ya está en tu lista.'}`
            : 'Todavía no planeaste nada para esta semana.'}
      </p>
    </section>
  );
}

export default WeekPanel;
