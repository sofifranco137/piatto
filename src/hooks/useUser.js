import { useEffect, useState } from 'react';
import { watchUser } from '../firebase';

// Devuelve la persona que inició sesión (o null) y si todavía se está verificando
export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => watchUser((u) => {
    setUser(u);
    setLoading(false);
  }), []);

  return { user, loading };
}
