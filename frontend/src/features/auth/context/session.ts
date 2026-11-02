import { setAuthHeaders } from '@/lib/api';
import type { SessionUser } from '@/types';

const STORAGE_KEY = 'bookslot.user';

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function load(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

let current: SessionUser | null = load();
setAuthHeaders(() =>
  current
    ? {
        'x-user-id': current.id,
        'x-user-email': current.email,
        ...(current.isAdmin ? { 'x-user-groups': 'admin' } : {}),
      }
    : {},
);

export const currentUser = () => current;

export function saveUser(data: Omit<SessionUser, 'id'>): SessionUser {
  const next = { ...data, id: `local-${slug(data.email)}` };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
  }
  current = next;
  return next;
}

export function clearUser() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
  current = null;
}
