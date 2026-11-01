import { useEffect, useState } from 'react';
import { subscribePlan } from '../services/db';

// Trae el plan de la semana y lo mantiene actualizado en tiempo real
export function usePlan(uid) {
  const [state, setState] = useState({ days: {}, loading: true, error: null });
  useEffect(() => subscribePlan(
    uid,
    (days) => setState({ days, loading: false, error: null }),
    (error) => setState((s) => ({ ...s, loading: false, error })),
  ), [uid]);
  return state;
}
