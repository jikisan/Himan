# Google Sign-In Implementation Plan

## Context

Mobile app has placeholder login screen — Google button navigates directly to dashboard, email login uses `setTimeout` stub. No Supabase initialization, no auth state management, no protected routes. Need to wire up real auth matching web implementation.

Shared package already has `User` entity + all auth types (`LoginCredentials`, `AuthSession`, `AuthRepository`, etc.) exported from `@himan/shared/auth`. Web works fine as-is — we don't touch it.

## Approach

Use `@react-native-google-signin/google-signin` for native Google Sign-In + `supabase.auth.signInWithIdToken()`. Gives native UX (Google's own sign-in sheet) vs webview-based flow. Requires `expo prebuild`.

**Web is not touched.** Mobile implements `AuthRepository` from `@himan/shared/auth` directly with its own `MobileAuthRepository`.

Only two shared package changes needed — both additive/backward-compatible:
1. Optional `authStorage` param on `initSupabase` (web passes nothing → unchanged)
2. (Optional) `BaseAuthRepository` abstract class in shared for code reuse

---

## Step 1: Extend `initSupabase` for Custom Storage

**File**: `packages/shared/src/config/supabase.ts`

**Why**: Mobile needs `expo-secure-store` as Supabase auth storage (not `localStorage`). Change is backward-compatible — web passes no `authStorage`, behavior unchanged.

```typescript
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  authStorage?: {
    getItem: (key: string) => Promise<string | null> | string | null;
    setItem: (key: string, value: string) => Promise<void> | void;
    removeItem: (key: string) => Promise<void> | void;
  };
}

export function initSupabase(config: SupabaseConfig): SupabaseClient {
  _supabase = createClient(config.url, config.anonKey, {
    auth: {
      ...(config.authStorage && { storage: config.authStorage }),
    },
  });
  return _supabase;
}
```

## Step 2: Install Dependencies

```bash
# From mobile/ directory
npx expo install @react-native-google-signin/google-signin
```

`@supabase/supabase-js` already available via `@himan/shared`. `expo-secure-store` already installed.

## Step 3: Mobile Supabase Initialization

**Create `mobile/src/modules/shared/infrastructure/config/supabase.ts`:**

```typescript
import { initSupabase } from '@himan/shared';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = initSupabase({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  authStorage: ExpoSecureStoreAdapter,
});
```

## Step 4: Mobile Auth Repository

**Create `mobile/src/modules/auth/infrastructure/api/MobileAuthRepository.ts`:**

Implements `AuthRepository` from `@himan/shared/auth` directly. All Supabase calls are platform-agnostic except `signInWithGoogle` which uses the native ID token flow.

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';
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
    await GoogleSignin.hasPlayServices();
    const { data } = await GoogleSignin.signIn();
    const idToken = data?.idToken;
    if (!idToken) throw new Error('Google sign-in failed: no ID token');
    const { error } = await getSupabase().auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) throw new Error(this.getErrorMessage(error.message));
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
```

## Step 5: Mobile Auth Context/Provider

**Create `mobile/src/modules/auth/presentation/contexts/AuthContext.tsx`:**

- Initialize Supabase on mount (import from Step 3)
- Listen to `supabase.auth.onAuthStateChange()`
- Expose `{ user, loading, signOut }`
- No URL hash parsing (web-only)

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabase } from '@himan/shared';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: SupabaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await getSupabase().auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
```

## Step 6: useLogin Hook

**Create `mobile/src/modules/auth/presentation/hooks/useLogin.ts`:**

```typescript
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { MobileAuthRepository } from '../../infrastructure/api/MobileAuthRepository';

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const repository = useMemo(() => new MobileAuthRepository(), []);

  const loginWithEmail = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      await repository.signInWithEmail({ email, password });
      router.replace('/(app)/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await repository.signInWithGoogle();
      router.replace('/(app)/dashboard');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return { loading, error, loginWithEmail, loginWithGoogle };
};
```

## Step 7: Wire Up Login Screen

**Modify `mobile/app/login.tsx`** — swap stubs for `useLogin`:

```typescript
const { loading, error, loginWithEmail, loginWithGoogle } = useLogin();

// handleLogin:
const handleLogin = async () => {
  if (!email || !password) { setError('Please fill in all fields.'); return; }
  await loginWithEmail(email, password);
};

// Google button onPress:
onPress={loginWithGoogle}
```

Remove local `loading`/`error` state — hook provides them.

## Step 8: Root Layout — AuthProvider + GoogleSignin Config

**Modify `mobile/app/_layout.tsx`:**

```typescript
import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AuthProvider } from '@/modules/auth/presentation/contexts/AuthContext';
// Supabase init must be imported to run initSupabase before anything else
import '@/modules/shared/infrastructure/config/supabase';

GoogleSignin.configure({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
```

## Step 9: Protected Routing

Restructure route groups so auth state controls navigation:

```
app/
├── _layout.tsx          # AuthProvider + GoogleSignin config (Step 8)
├── index.tsx            # Redirect based on auth state
├── (auth)/
│   ├── _layout.tsx      # Plain Stack
│   └── login.tsx        # Login screen (moved from app/login.tsx)
└── (app)/
    ├── _layout.tsx      # ThemeProvider + auth guard
    ├── dashboard.tsx
    ├── settings.tsx
    └── grocery.tsx
```

**`app/index.tsx`** — check auth, redirect accordingly:
```typescript
import { Redirect } from 'expo-router';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Redirect href={user ? '/(app)/dashboard' : '/(auth)/login'} />;
}
```

**`app/(app)/_layout.tsx`** — add auth guard:
```typescript
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { Redirect, Stack } from 'expo-router';

export default function AppLayout() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
```

## Step 10: Expo Config

**Modify `mobile/app.json`** — add plugin:
```json
{
  "expo": {
    "plugins": [
      "@react-native-google-signin/google-signin"
    ]
  }
}
```

Then: `npx expo prebuild`

## Step 11: External Config (Manual — do before testing)

1. **Google Cloud Console**: Create iOS OAuth client ID → add to `.env` as `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
2. **Google Cloud Console**: Verify Android client ID has correct SHA-1 fingerprint for your keystore
3. **Supabase Dashboard**: Confirm Google provider enabled with Web Client ID + Secret

---

## Build Sequence

1. Extend `initSupabase` with optional `authStorage` — `packages/shared/src/config/supabase.ts` (Step 1)
2. Verify web still builds: `cd web && npm run build`
3. Install dependency: `cd mobile && npx expo install @react-native-google-signin/google-signin` (Step 2)
4. Create mobile Supabase init with secure store (Step 3)
5. Create `MobileAuthRepository` (Step 4)
6. Create `AuthProvider` + `useAuth` (Step 5)
7. Create `useLogin` hook (Step 6)
8. Wire up login screen (Step 7)
9. Update root `_layout.tsx` with `AuthProvider` + `GoogleSignin.configure` (Step 8)
10. Restructure routes — create `(auth)/` group, move `login.tsx`, update `index.tsx` + `(app)/_layout.tsx` (Step 9)
11. Add Expo plugin to `app.json` (Step 10)
12. Complete external config (Step 11)
13. `npx expo prebuild && npx expo run:ios`

## Risk Assessment

| Change | Touches Web? | Risk |
|--------|-------------|------|
| `initSupabase` optional `authStorage` param | No (web passes nothing) | Near zero |
| All other changes | No | Zero |

## Verification

1. `cd web && npm run build` — no regression
2. `cd mobile && npm run typecheck` — types clean
3. Email login: credentials → dashboard (bad creds → error message)
4. Google Sign-In: tap → native Google sheet → dashboard
5. Kill app, reopen → still logged in (secure store)
6. Sign out → back to login
7. Navigate to `/(app)/dashboard` while logged out → redirected to login
