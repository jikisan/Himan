# Auth Implementation TODO

## Current Status

✅ Domain layer complete (User entity, types)
✅ Infrastructure layer complete (SupabaseAuthRepository)
✅ Basic auth context and hooks created
✅ Basic login/signup pages created
⏳ Waiting for dependencies to complete enhanced UI

## Required Dependencies

Install these before continuing:

```bash
cd web
npm install react-hook-form @hookform/resolvers zod
```

Optional (for shadcn/ui components):
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input label checkbox alert form card
```

## Remaining Tasks

### 1. Enhanced Auth Context
**File**: `web/src/modules/auth/presentation/contexts/AuthContext.tsx`

Add methods:
- `signInWithEmail(email, password, rememberMe?)`
- `signInWithGoogle()`
- `signUp(email, password, fullName?)`
- `resetPassword(email)`
- Better error handling
- Loading states per action

### 2. Google Login Button
**File**: `web/src/modules/auth/presentation/components/GoogleLoginButton.tsx`

```typescript
import { useState } from 'react';
import { SupabaseAuthRepository } from '../../infrastructure/api';

export const GoogleLoginButton = () => {
  const [loading, setLoading] = useState(false);
  const repository = new SupabaseAuthRepository();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await repository.signInWithGoogle();
    } catch (error) {
      console.error('Google login error:', error);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
    >
      {loading ? (
        <span>Loading...</span>
      ) : (
        <>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            {/* Google logo SVG */}
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </>
      )}
    </button>
  );
};
```

### 3. Login Form Component
**File**: `web/src/modules/auth/presentation/components/LoginForm.tsx`

With react-hook-form:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm = ({ onSubmit, loading }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Email input with error */}
      {/* Password input with error */}
      {/* Remember me checkbox */}
      {/* Submit button */}
    </form>
  );
};
```

### 4. Enhanced LoginPage
**File**: `web/src/modules/auth/presentation/pages/LoginPage.tsx`

Features to add:
- Use LoginForm component
- Add GoogleLoginButton
- Add "Forgot Password?" link
- Add "Sign up" link
- Better error display
- Success feedback
- Auto-redirect logic

Layout:
```tsx
<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
  <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg px-8 py-10 w-full max-w-md">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold">Welcome Back</h2>
      <p className="text-sm text-gray-600">Sign in to your account</p>
    </div>

    {error && <Alert variant="destructive">{error}</Alert>}

    <LoginForm onSubmit={handleLogin} loading={loading} />

    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-300"></div>
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-2 bg-white text-gray-500">OR</span>
      </div>
    </div>

    <GoogleLoginButton />

    <div className="mt-6 text-center text-sm">
      <Link to="/signup">Don't have an account? Sign up</Link>
    </div>
  </div>
</div>
```

### 5. Enhanced SignUpPage
**File**: `web/src/modules/auth/presentation/pages/SignUpPage.tsx`

Add:
- Full name field
- Password confirmation
- Terms of service checkbox
- Better validation
- Google signup option

### 6. Forgot Password Page
**File**: `web/src/modules/auth/presentation/pages/ForgotPasswordPage.tsx`

```tsx
export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const repository = new SupabaseAuthRepository();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await repository.resetPassword(email);
      setSent(true);
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return <div>Check your email for reset link</div>;
  }

  return (
    <div>
      {/* Reset password form */}
    </div>
  );
};
```

### 7. Update Router
**File**: `web/src/router/index.tsx`

Add route:
```tsx
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

### 8. Form Validation Utilities
**File**: `web/src/modules/auth/presentation/utils/validation.ts`

```typescript
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePassword = (password: string): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('At least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('One uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('One lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('One number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
```

### 9. Enhanced AuthContext
Update to use the repository:

```tsx
import { SupabaseAuthRepository } from '../../infrastructure/api';

const repository = new SupabaseAuthRepository();

const signInWithEmail = async (email: string, password: string, rememberMe?: boolean) => {
  setLoading(true);
  setError(null);
  try {
    const session = await repository.signInWithEmail({ email, password, rememberMe });
    setUser(session.user);
  } catch (err) {
    setError(err.message);
    throw err;
  } finally {
    setLoading(false);
  }
};

const signInWithGoogle = async () => {
  setLoading(true);
  setError(null);
  try {
    await repository.signInWithGoogle();
    // Redirect happens automatically
  } catch (err) {
    setError(err.message);
    setLoading(false);
    throw err;
  }
};
```

### 10. Loading States
**File**: `web/src/modules/auth/presentation/components/AuthLoadingScreen.tsx`

```tsx
export const AuthLoadingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Authenticating...</p>
      </div>
    </div>
  );
};
```

## Testing Checklist

After implementation:

- [ ] Email/password login works
- [ ] Google OAuth login works
- [ ] Sign up creates new account
- [ ] Email validation works
- [ ] Password validation works
- [ ] Error messages display correctly
- [ ] Loading states show
- [ ] Redirect after login works
- [ ] Already logged-in users skip login
- [ ] Forgot password sends email
- [ ] Remember me persists session
- [ ] Responsive on mobile
- [ ] Dark mode works
- [ ] Keyboard navigation works
- [ ] Form submission on Enter works

## Supabase Setup Required

### Enable Google OAuth:
1. Go to Supabase Dashboard
2. Authentication > Providers
3. Enable Google
4. Add OAuth credentials from Google Cloud Console
5. Set authorized redirect URIs

### Configure Email Templates:
1. Authentication > Email Templates
2. Customize password reset email
3. Customize confirmation email

## Security Considerations

- [ ] HTTPS only in production
- [ ] Rate limiting on login attempts
- [ ] Email verification required
- [ ] Strong password requirements
- [ ] Secure session storage
- [ ] CSRF protection
- [ ] XSS prevention
- [ ] SQL injection prevention (handled by Supabase)

## UI Improvements

### Add Animations:
- Fade in/out for error messages
- Slide in for OAuth buttons
- Loading spinner animations
- Success checkmark animation

### Add Accessibility:
- ARIA labels on all inputs
- Focus management
- Keyboard shortcuts
- Screen reader support
- High contrast mode support

### Add Polish:
- Toast notifications for success/error
- Smooth page transitions
- Micro-interactions on buttons
- Password strength indicator
- Email format indicator (valid/invalid icon)

## Files to Create/Update

### Create:
- `GoogleLoginButton.tsx`
- `LoginForm.tsx`
- `ForgotPasswordPage.tsx`
- `ResetPasswordPage.tsx`
- `AuthLoadingScreen.tsx`
- `validation.ts`

### Update:
- `LoginPage.tsx` - enhance with new components
- `SignUpPage.tsx` - add full name, validation
- `AuthContext.tsx` - add repository methods
- `useAuth.ts` - expose new methods
- `router/index.tsx` - add forgot/reset routes

## Priority Order

1. **High Priority** (Core functionality):
   - Enhanced AuthContext with repository
   - Google Login Button
   - Form validation
   - Error handling

2. **Medium Priority** (UX):
   - Forgot password flow
   - Better loading states
   - Success feedback
   - Responsive design improvements

3. **Low Priority** (Polish):
   - Animations
   - Password strength indicator
   - Advanced accessibility
   - Remember me functionality

## Estimated Time

- Core enhancements: 2-3 hours
- UX improvements: 1-2 hours
- Polish and testing: 1-2 hours
- **Total**: 4-7 hours

## Next Steps

1. Install dependencies (see top of file)
2. Start with enhanced AuthContext
3. Create Google Login Button
4. Enhance LoginPage
5. Test auth flow
6. Add remaining features

---

**Status**: Ready to implement after dependencies are installed
**Last Updated**: Current session
