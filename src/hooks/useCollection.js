import { useEffect, useState } from 'react';
import { subscribe } from '../services/db';

// Trae una colección de Firestore y la mantiene actualizada en tiempo real
export function useCollection(uid, name, direction = 'asc') {
  const [state, setState] = useState({ data: [], loading: true, error: null });

  useEffect(() => {
    if (!uid) return undefined;
    setState((s) => ({ ...s, loading: true }));
    return subscribe(
      uid, name, direction,
      (data) => setState({ data, loading: false, error: null }),
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
  }, [uid, name, direction]);

  return state;
}
