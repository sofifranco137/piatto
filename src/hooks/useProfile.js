import { useEffect, useState } from 'react';
import { subscribeProfile } from '../services/profile';

// El perfil guardado en Firestore (la foto propia), en tiempo real
export function useProfile(uid) {
  const [state, setState] = useState({ data: {}, loading: true, error: null });
  useEffect(() => subscribeProfile(
    uid,
    (data) => setState({ data, loading: false, error: null }),
    (error) => setState((s) => ({ ...s, loading: false, error })),
  ), [uid]);
  return state;
}
