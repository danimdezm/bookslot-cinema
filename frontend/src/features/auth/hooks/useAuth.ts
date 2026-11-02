import { useContext } from 'react';
import type { AuthContextValue } from '@/types';
import { AuthContext } from '../context/AuthContext';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}
