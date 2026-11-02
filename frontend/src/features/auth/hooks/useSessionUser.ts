import type { SessionUser } from '@/types';
import { useAuth } from './useAuth';

export function useSessionUser(): SessionUser {
  const { user } = useAuth();
  if (!user) throw new Error('useSessionUser fuera de <RequireAuth>');
  return user;
}
