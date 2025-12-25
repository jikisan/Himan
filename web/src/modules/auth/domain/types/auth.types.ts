import type { User } from '../entities';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  fullName?: string;
}

export interface AuthError {
  code: string;
  message: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  expiresAt: Date;
}

export interface AuthRepository {
  signInWithEmail(credentials: LoginCredentials): Promise<AuthSession>;
  signInWithGoogle(): Promise<void>;
  signUp(credentials: SignUpCredentials): Promise<AuthSession>;
  signOut(): Promise<void>;
  getCurrentSession(): Promise<AuthSession | null>;
  resetPassword(email: string): Promise<void>;
}
