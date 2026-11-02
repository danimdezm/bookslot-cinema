import { setAuthHeaders } from '@/lib/api';
import { decodeIdToken, refresh, type CognitoTokens } from '@/lib/cognito';
import { config } from '@/lib/config';
import type { SessionUser } from '@/types';

const STORAGE_KEY = 'bookslot.session';
const REFRESH_MARGIN_MS = 60_000;

interface Session {
  user: SessionUser;
  tokens?: CognitoTokens & { expiresAt: number };
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function load(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const session = raw ? (JSON.parse(raw) as Session) : null;
    if (!session) return null;
    const usesTokens = Boolean(session.tokens);
    return usesTokens === (config.authMode === 'cognito') ? session : null;
  } catch {
    return null;
  }
}

function persist(next: Session | null) {
  current = next;
  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
  listeners.forEach((fn) => fn(next?.user ?? null));
}

let current: Session | null = load();
const listeners = new Set<(user: SessionUser | null) => void>();

export const currentUser = () => current?.user ?? null;

export function onSessionChange(fn: (user: SessionUser | null) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function saveDemoUser(data: Omit<SessionUser, 'id'>): SessionUser {
  const user = { ...data, id: `local-${slug(data.email)}` };
  persist({ user });
  return user;
}

export function saveTokens(tokens: CognitoTokens): SessionUser {
  const claims = decodeIdToken(tokens.idToken);
  const user: SessionUser = {
    id: claims.sub,
    email: claims.email,
    name: claims.name ?? claims.email.split('@')[0]!,
    isAdmin: (claims['cognito:groups'] ?? []).includes('admin'),
  };
  persist({ user, tokens: { ...tokens, expiresAt: claims.exp * 1000 } });
  return user;
}

export function clearSession() {
  persist(null);
}

let refreshing: Promise<void> | null = null;

async function validIdToken(): Promise<string | null> {
  const tokens = current?.tokens;
  if (!tokens) return null;
  if (tokens.expiresAt - Date.now() > REFRESH_MARGIN_MS) return tokens.idToken;

  refreshing ??= refresh(tokens.refreshToken)
    .then((next) => void saveTokens(next))
    .catch(() => clearSession())
    .finally(() => (refreshing = null));
  await refreshing;
  return current?.tokens?.idToken ?? null;
}

setAuthHeaders(async (): Promise<Record<string, string>> => {
  if (config.authMode === 'cognito') {
    const token = await validIdToken();
    return token ? { authorization: `Bearer ${token}` } : {};
  }
  const user = current?.user;
  return user
    ? {
        'x-user-id': user.id,
        'x-user-email': user.email,
        ...(user.isAdmin ? { 'x-user-groups': 'admin' } : {}),
      }
    : {};
});
