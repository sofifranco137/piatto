import { useEffect, useState } from 'react';
import { subscribeMoments } from '../services/moments';

// Las fotos de un álbum (null = privado, o el id de un grupo), en tiempo real
export function useMoments(uid, album) {
  const [state, setState] = useState({ data: [], loading: true, error: null });

  useEffect(() => {
    if (!uid) return undefined;
    setState({ data: [], loading: true, error: null });
    return subscribeMoments(
      uid, album,
      (data) => setState({ data, loading: false, error: null }),
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
  }, [uid, album]);

  return state;
}
