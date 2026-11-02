export interface SessionUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

export interface AuthContextValue {
  user: SessionUser | null;
  signIn(user: Omit<SessionUser, 'id'>): void;
  signOut(): void;
}
