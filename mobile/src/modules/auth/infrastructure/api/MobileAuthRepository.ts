import { User } from '@himan/shared/auth';
import { getSupabase } from '@himan/shared';
import type {
  AuthRepository,
  AuthSession,
  LoginCredentials,
  SignUpCredentials,
} from '@himan/shared/auth';

export class MobileAuthRepository implements AuthRepository {
  async signInWithEmail(credentials: LoginCredentials): Promise<AuthSession> {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    if (error) throw new Error(this.getErrorMessage(error.message));
    if (!data.user || !data.session) throw new Error('Authentication failed');
    return {
      user: User.fromSupabaseUser(data.user),
      accessToken: data.session.access_token,
      expiresAt: new Date(data.session.expires_at! * 1000),
    };
  }

  async signInWithGoogle(): Promise<void> {
    throw new Error('Use useLogin hook for Google sign-in on mobile');
  }

  async signOut(): Promise<void> {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw new Error(this.getErrorMessage(error.message));
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    const { data } = await getSupabase().auth.getSession();
    if (!data.session?.user) return null;
    return {
      user: User.fromSupabaseUser(data.session.user),
      accessToken: data.session.access_token,
      expiresAt: new Date(data.session.expires_at! * 1000),
    };
  }

  async signUp(credentials: SignUpCredentials): Promise<AuthSession> {
    const { data, error } = await getSupabase().auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: { data: { full_name: credentials.fullName } },
    });
    if (error) throw new Error(this.getErrorMessage(error.message));
    if (!data.user || !data.session) throw new Error('Sign up failed');
    return {
      user: User.fromSupabaseUser(data.user),
      accessToken: data.session.access_token,
      expiresAt: new Date(data.session.expires_at! * 1000),
    };
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email);
    if (error) throw new Error(this.getErrorMessage(error.message));
  }

  private getErrorMessage(error: string): string {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Invalid email or password',
      'Email not confirmed': 'Please verify your email address',
      'User already registered': 'An account with this email already exists',
      'Password should be at least 6 characters': 'Password must be at least 6 characters',
    };
    return errorMap[error] || error;
  }
}
