import { useEffect, useRef, useState } from 'react';
import { subscribeItems, subscribeMyGroups } from '../services/groups';

// Los grupos de los que formo parte, en tiempo real
export function useMyGroups(uid) {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => subscribeMyGroups(
    uid,
    (data) => setState({ data, loading: false, error: null }),
    (error) => setState((s) => ({ ...s, loading: false, error })),
  ), [uid]);
  return state;
}

// Los ítems de un grupo, en tiempo real. onRemote se llama cuando otra persona cambia algo.
export function useGroupItems(groupId, uid, onRemote) {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  const remoteRef = useRef(onRemote);
  remoteRef.current = onRemote;

  useEffect(() => {
    if (!groupId) return undefined;
    setState({ data: [], loading: true, error: null });
    return subscribeItems(
      groupId, uid,
      (data) => setState({ data, loading: false, error: null }),
      (change) => remoteRef.current?.(change),
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
  }, [groupId, uid]);
  return state;
}
