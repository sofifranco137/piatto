import { useEffect, useRef, useState } from 'react';
import Stepper from './Stepper';
import AsyncButton from './AsyncButton';
import { cap, cleanStep, factor, fmtIng, inPantry, pantryMatch } from '../lib/ingredients';

// Detecta tiempos en un paso: "Cocinar 9 minutos" → un temporizador de 9 minutos
const TIME_RE = /(\d+)\s*(minutos?|min|horas?|hs|segundos?|seg)\b/gi;
function findTimers(text, step) {
  const found = [];
  let m; let k = 0;
  TIME_RE.lastIndex = 0;
  while ((m = TIME_RE.exec(text))) {
    const n = Number(m[1]); const u = m[2].toLowerCase();
    const secs = u.startsWith('h') ? n * 3600 : u.startsWith('s') ? n : n * 60;
    found.push({ key: `${step}-${k++}`, step, secs, label: m[0] });
  }
  return found;
}
const pad = (n) => String(n).padStart(2, '0');
const clock = (s) => (s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`);

function beep() {
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach((t) => {
      const o = a.createOscillator(); const g = a.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(a.destination);
      g.gain.setValueAtTime(0.0001, a.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, a.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + 0.25);
      o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.3);
    });
  } catch { /* sin sonido */ }
  navigator.vibrate?.([200, 100, 200]);
}

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 9v4l2.5 2M9 2h6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
);

// Pantalla completa para cocinar paso a paso
function CookMode({ recipe, pantry, startServings, onClose, onFinish }) {
  const dialogRef = useRef(null);
  const steps = recipe.steps?.length ? recipe.steps.map(cleanStep) : ['Prepará la receta a tu manera.'];
  const last = steps.length + 1; // 0 = juntar ingredientes, 1..n = pasos, last = final

  const [step, setStep] = useState(0);
  const [servings, setServings] = useState(startServings || recipe.servings || 1);
  const [ready, setReady] = useState(new Set());   // ingredientes ya juntados
  const [used, setUsed] = useState(new Set());     // ingredientes que se terminaron
  const [toList, setToList] = useState(true);
  const [timers, setTimers] = useState({});        // { key: { total, left, end, running } }
  const [awake, setAwake] = useState(false);
  const f = factor(recipe, servings);

  // Abrir como pantalla completa
  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
  }, []);

  // Que la pantalla no se apague mientras cocinás (Wake Lock API)
  useEffect(() => {
    let lock = null; let cancelled = false;
    async function request() {
      try {
        if ('wakeLock' in navigator) {
          lock = await navigator.wakeLock.request('screen');
          if (!cancelled) setAwake(true);
        }
      } catch { setAwake(false); }
    }
    const onVisible = () => { if (document.visibilityState === 'visible') request(); };
    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, []);

  // Los temporizadores avanzan cada segundo
  const timersRef = useRef(timers);
  timersRef.current = timers;
  useEffect(() => {
    const id = setInterval(() => {
      const prev = timersRef.current;
      let changed = false; let finished = false;
      const next = { ...prev };
      Object.entries(prev).forEach(([k, t]) => {
        if (!t.running) return;
        const left = Math.max(0, Math.round((t.end - Date.now()) / 1000));
        if (left !== t.left) { next[k] = { ...t, left, running: left > 0 }; changed = true; }
        if (left === 0) finished = true;
      });
      if (changed) setTimers(next);
      if (finished) beep();
    }, 1000);
    return () => clearInterval(id);
  }, []);

  function toggleTimer(t) {
    setTimers((prev) => {
      const cur = prev[t.key];
      if (!cur || cur.left === 0) return { ...prev, [t.key]: { total: t.secs, left: t.secs, end: Date.now() + t.secs * 1000, running: true } };
      if (cur.running) return { ...prev, [t.key]: { ...cur, running: false } };
      return { ...prev, [t.key]: { ...cur, running: true, end: Date.now() + cur.left * 1000 } };
    });
  }

  const toggleIn = (set, setter, value) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    setter(next);
  };

  function onKey(e) {
    if (e.target.matches('input')) return;
    if (e.key === 'ArrowRight' && step < last) setStep(step + 1);
    if (e.key === 'ArrowLeft' && step > 0) setStep(step - 1);
  }

  const activeTimers = Object.entries(timers).filter(([, t]) => t.running || t.left === 0);
  // Los productos de la alacena que usa esta receta (sin repetir)
  const usedFromPantry = [...new Map(recipe.ingredients.map((i) => pantryMatch(pantry, i.name)).filter(Boolean).map((p) => [p.id, p])).values()];

  let stage;
  if (step === 0) {
    stage = (
      <>
        <h2 className="cook-title">{recipe.name}</h2>
        <p className="cook-sub">Antes de empezar, juntá todo. Marcá cada ingrediente a medida que lo tengas a mano.</p>
        {recipe.servings && (
          <div className="cook-servings">Porciones <Stepper value={servings} onChange={setServings} /></div>
        )}
        <ul className="mise">
          {recipe.ingredients.map((ing, k) => (
            <li key={ing.name}>
              <label>
                <input type="checkbox" checked={ready.has(k)} onChange={() => toggleIn(ready, setReady, k)} />
                <span>{fmtIng(ing, f)}</span>
                {!inPantry(pantry, ing.name) && <em>No está en tu alacena</em>}
              </label>
            </li>
          ))}
        </ul>
      </>
    );
  } else if (step < last) {
    const stepTimers = findTimers(steps[step - 1], step);
    stage = (
      <>
        <p className="cook-kicker">Paso {step} de {steps.length}</p>
        <p className="cook-step">{steps[step - 1]}</p>
        {stepTimers.length > 0 && (
          <div className="timers">
            {stepTimers.map((t) => {
              const st = timers[t.key];
              const cls = !st ? '' : st.left === 0 ? 'done' : st.running ? 'running' : '';
              const text = !st ? `Temporizador de ${t.label}` : st.left === 0 ? 'Listo. Volver a empezar' : `${st.running ? 'Pausar' : 'Seguir'} ${clock(st.left)}`;
              return <button key={t.key} type="button" className={`timer-btn ${cls}`} onClick={() => toggleTimer(t)}><ClockIcon /><span>{text}</span></button>;
            })}
          </div>
        )}
      </>
    );
  } else {
    stage = (
      <>
        <h2 className="cook-title">¿Cómo quedó la alacena?</h2>
        {usedFromPantry.length ? (
          <>
            <p className="cook-sub">Marcá lo que se terminó y lo sacamos de tu alacena.</p>
            <ul className="mise">
              {usedFromPantry.map((p) => (
                <li key={p.id}>
                  <label>
                    <input type="checkbox" checked={used.has(p.id)} onChange={() => toggleIn(used, setUsed, p.id)} />
                    <span>{cap(p.name)}</span>
                  </label>
                </li>
              ))}
            </ul>
            <label className="cook-opt">
              <input type="checkbox" checked={toList} onChange={(e) => setToList(e.target.checked)} />
              Sumar lo que se terminó a la lista del súper
            </label>
          </>
        ) : <p className="cook-sub">No usaste nada de tu alacena en esta receta.</p>}
      </>
    );
  }

  return (
    <dialog ref={dialogRef} className="cook-dialog" aria-label={`Modo cocina: ${recipe.name}`} onClose={onClose} onKeyDown={onKey}>
      <div className="cook">
        <div className="cook-top">
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Salir del modo cocina">✕</button>
          <span className="cook-name">{recipe.name}</span>
          <span className="cook-bar"><span style={{ width: `${(step / last) * 100}%` }} /></span>
          {awake && <span className="awake">Pantalla siempre encendida</span>}
          {activeTimers.length > 0 && (
            <div className="timer-pills">
              {activeTimers.map(([k, t]) => (
                <button key={k} type="button" className={`timer-pill ${t.left === 0 ? 'done' : ''}`} onClick={() => setStep(Number(k.split('-')[0]))}>
                  Paso {k.split('-')[0]}: {t.left > 0 ? clock(t.left) : 'listo'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="cook-stage" aria-live="polite" key={step}>{stage}</div>

        <div className="cook-foot">
          <button className="btn btn-ghost-light" type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>Anterior</button>
          {step === last ? (
            <AsyncButton className="btn btn-butter" pendingLabel="Guardando…" onClick={() => onFinish({ used, toList })}>La cociné</AsyncButton>
          ) : (
            <button className="btn btn-butter" type="button" onClick={() => setStep(step + 1)}>
              {step === 0 ? 'Empezar' : step === last - 1 ? 'Terminar' : 'Siguiente'}
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}

export default CookMode;
