import type { User as SupabaseUser } from '@supabase/supabase-js';

export class User {
  readonly id: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly createdAt: Date;
  readonly metadata?: {
    fullName?: string;
    avatarUrl?: string;
    provider?: string;
  };

  constructor(
    id: string,
    email: string,
    emailVerified: boolean,
    createdAt: Date,
    metadata?: {
      fullName?: string;
      avatarUrl?: string;
      provider?: string;
    }
  ) {
    this.id = id;
    this.email = email;
    this.emailVerified = emailVerified;
    this.createdAt = createdAt;
    this.metadata = metadata;
  }

  static fromSupabaseUser(supabaseUser: SupabaseUser): User {
    return new User(
      supabaseUser.id,
      supabaseUser.email ?? '',
      supabaseUser.email_confirmed_at != null,
      new Date(supabaseUser.created_at),
      {
        fullName: supabaseUser.user_metadata?.full_name,
        avatarUrl: supabaseUser.user_metadata?.avatar_url,
        provider: supabaseUser.app_metadata?.provider,
      }
    );
  }

  get displayName(): string {
    return this.metadata?.fullName || this.email.split('@')[0];
  }

  get initials(): string {
    if (this.metadata?.fullName) {
      const names = this.metadata.fullName.split(' ');
      return names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return this.email[0].toUpperCase();
  }
}
