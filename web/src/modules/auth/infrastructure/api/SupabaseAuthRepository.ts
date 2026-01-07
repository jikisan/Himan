import { supabase } from '@core/infrastructure/config';
import { User } from '../../domain/entities';
import type {
  AuthRepository,
  LoginCredentials,
  SignUpCredentials,
  AuthSession,
} from '../../domain/types';

export class SupabaseAuthRepository implements AuthRepository {
  async signInWithEmail(credentials: LoginCredentials): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw new Error(this.getErrorMessage(error.message));
    }

    if (!data.user || !data.session) {
      throw new Error('Authentication failed');
    }

    return {
      user: User.fromSupabaseUser(data.user),
      accessToken: data.session.access_token,
      expiresAt: new Date(data.session.expires_at! * 1000),
    };
  }

  async signInWithGoogle(): Promise<void> {
    const redirectUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${redirectUrl}/dashboard`,
      },
    });

    if (error) {
      throw new Error(this.getErrorMessage(error.message));
    }
  }

  async signUp(credentials: SignUpCredentials): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          full_name: credentials.fullName,
        },
      },
    });

    if (error) {
      throw new Error(this.getErrorMessage(error.message));
    }

    if (!data.user || !data.session) {
      throw new Error('Sign up failed');
    }

    return {
      user: User.fromSupabaseUser(data.user),
      accessToken: data.session.access_token,
      expiresAt: new Date(data.session.expires_at! * 1000),
    };
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(this.getErrorMessage(error.message));
    }
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Session check error:', error);
      return null;
    }

    if (!data.session || !data.session.user) {
      return null;
    }

    return {
      user: User.fromSupabaseUser(data.session.user),
      accessToken: data.session.access_token,
      expiresAt: new Date(data.session.expires_at! * 1000),
    };
  }

  async resetPassword(email: string): Promise<void> {
    const redirectUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${redirectUrl}/reset-password`,
    });

    if (error) {
      throw new Error(this.getErrorMessage(error.message));
    }
  }

  private getErrorMessage(error: string): string {
    // Map Supabase errors to user-friendly messages
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Invalid email or password',
      'Email not confirmed': 'Please verify your email address',
      'User already registered': 'An account with this email already exists',
      'Password should be at least 6 characters': 'Password must be at least 6 characters',
    };

    return errorMap[error] || error;
  }
}
