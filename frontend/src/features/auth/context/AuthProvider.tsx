import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { SessionUser } from '@/types';
import { AuthContext } from './AuthContext';
import { clearUser, currentUser, saveUser } from './session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(currentUser);

  const signIn = useCallback((data: Omit<SessionUser, 'id'>) => setUser(saveUser(data)), []);

  const signOut = useCallback(() => {
    clearUser();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, signIn, signOut }), [user, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
