// Botones − y + para elegir cuántas porciones
function Stepper({ value, onChange, min = 1, max = 50, label = 'porciones' }) {
  return (
    <span className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`Menos ${label}`} disabled={value <= min}>−</button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`Más ${label}`} disabled={value >= max}>+</button>
    </span>
  );
}

export default Stepper;
