import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { signIn as cognitoSignIn } from '@/lib/cognito';
import type { SessionUser } from '@/types';
import { AuthContext } from './AuthContext';
import { clearSession, currentUser, onSessionChange, saveDemoUser, saveTokens } from './session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(currentUser);

  useEffect(() => {
    const unsubscribe = onSessionChange(setUser);
    return () => void unsubscribe();
  }, []);

  const signInDemo = useCallback((data: Omit<SessionUser, 'id'>) => void saveDemoUser(data), []);

  const signIn = useCallback(async (email: string, password: string) => {
    saveTokens(await cognitoSignIn(email, password));
  }, []);

  const signOut = useCallback(() => clearSession(), []);

  const value = useMemo(() => ({ user, signInDemo, signIn, signOut }), [user, signInDemo, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
