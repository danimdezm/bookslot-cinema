export interface SessionUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

export interface AuthContextValue {
  user: SessionUser | null;
  signInDemo(user: Omit<SessionUser, 'id'>): void;
  signIn(email: string, password: string): Promise<void>;
  signOut(): void;
}
