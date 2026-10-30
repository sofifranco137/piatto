import { useEffect, useState } from 'react';
import { fmtIng, plural, tagColor } from '../lib/ingredients';

const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// El recetario del banner: pasa las páginas solo, mostrando recetas reales
function Book({ recipes }) {
  const pages = recipes.slice(0, 4);
  const [flipped, setFlipped] = useState(0);

  useEffect(() => {
    if (reduceMotion || !pages.length) return undefined;
    const id = setInterval(() => setFlipped((k) => (k >= pages.length ? 0 : k + 1)), 2600);
    return () => clearInterval(id);
  }, [pages.length]);

  return (
    <div className="book">
      <div className="cover" />
      <div className="base base-left">
        <span className="base-kicker">Recetario de casa</span>
        <span className="base-title">Lo que se cocina acá</span>
        <span className="base-sign">desde 2026</span>
      </div>
      <div className="base base-right">
        <span className="base-title">¿Y hoy qué cocino?</span>
        <span className="base-text">Fijate en tu alacena.</span>
      </div>
      <div id="pages">
        {pages.map((r, i) => {
          const isFlipped = i < flipped;
          // Apila las hojas: sin dar vuelta, la primera arriba; dadas vuelta, la última arriba
          const z = isFlipped ? `${-(i + 1)}px` : `${pages.length - i}px`;
          return (
            <div key={r.id || r.name} className={`page ${isFlipped ? 'flipped' : ''}`} style={{ '--tag': tagColor(r.tag), '--z': z }}>
              <div className="face front">
                <span className="page-tag">{r.minutes} min</span>
                <span className="page-title">{r.name}</span>
                <span className="page-meta">{plural(r.ingredients.length, 'ingrediente', 'ingredientes')}</span>
                <ul className="page-list">
                  {r.ingredients.slice(0, 6).map((x) => <li key={x.name}>{fmtIng(x)}</li>)}
                </ul>
              </div>
              <div className="face back">
                <span className="page-title">Preparación</span>
                <ol className="page-steps">
                  {(r.steps || []).slice(0, 3).map((s) => <li key={s}>{s}</li>)}
                </ol>
                <span className="plate" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Book;
