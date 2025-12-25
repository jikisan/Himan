export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly emailVerified: boolean,
    public readonly createdAt: Date,
    public readonly metadata?: {
      fullName?: string;
      avatarUrl?: string;
      provider?: string;
    }
  ) {}

  static fromSupabaseUser(supabaseUser: any): User {
    return new User(
      supabaseUser.id,
      supabaseUser.email,
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
