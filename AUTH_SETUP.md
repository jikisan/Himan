# Login Screen Implementation Prompt

## Project Context
I have a React + Vite + TypeScript web application with a modular Clean Architecture structure using:
- **Styling**: Tailwind CSS and shadcn/ui components
- **Database/Auth**: Supabase Authentication
- **State Management**: React hooks with custom repository pattern
- **Architecture**: Domain-driven design with separate domain, infrastructure, and presentation layers
- **Routing**: React Router

## Current Project Structure
```
web/src/modules/
├── auth/ (@auth)
│   ├── domain/
│   ├── infrastructure/
│   └── presentation/
├── dashboard/ (@dashboard)
└── shared/ (@core)
    └── presentation/
        └── components/
            └── ui/ (shadcn components)
```

## Feature Requirements
Create a modern, responsive login screen with email and Google authentication that redirects to the dashboard upon successful login.

### Core Features

#### 1. Authentication Methods
- **Email/Password Login**:
  - Email input with validation
  - Password input with show/hide toggle
  - Remember me checkbox (optional)
  - Form validation with error messages
  
- **Google OAuth Login**:
  - "Sign in with Google" button
  - OAuth flow handling
  - Error handling for failed OAuth

#### 2. UI/UX Requirements
- Clean, modern design centered on screen
- Company logo/brand at top
- Welcome message/tagline
- Loading states during authentication
- Error messages for failed attempts
- Success feedback before redirect
- Responsive design (mobile-first)
- Dark mode support

#### 3. Additional Features
- "Forgot Password?" link
- "Don't have an account? Sign up" link
- Terms of Service and Privacy Policy links
- Auto-redirect if user already logged in
- Session persistence option

### Technical Implementation

#### 1. File Structure
Create/update these files in the auth module:
```
web/src/modules/auth/
├── domain/
│   ├── entities/
│   │   └── User.ts
│   ├── types/
│   │   └── auth.types.ts
│   └── usecases/
│       ├── LoginWithEmail.ts
│       ├── LoginWithGoogle.ts
│       └── Logout.ts
├── infrastructure/
│   ├── api/
│   │   └── SupabaseAuthRepository.ts
│   └── storage/
│       └── AuthTokenStorage.ts
└── presentation/
    ├── components/
    │   ├── LoginForm.tsx
    │   ├── GoogleLoginButton.tsx
    │   └── AuthLayout.tsx
    ├── hooks/
    │   ├── useAuth.ts
    │   └── useAuthRedirect.ts
    └── pages/
        └── LoginPage.tsx
```

#### 2. Supabase Configuration
```typescript
// Email/Password login
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password,
})

// Google OAuth login
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/dashboard`
  }
})
```

#### 3. Component Requirements

##### LoginPage Component
```typescript
// Should include:
- AuthLayout wrapper
- LoginForm component
- Google login option
- Links to signup/forgot password
- Error handling
- Loading states
- Auto-redirect logic
```

##### LoginForm Component
```typescript
// Form fields:
- Email input (type="email", required)
- Password input (type="password", required)
- Remember me checkbox (optional)
- Submit button with loading state
- Form validation using react-hook-form or similar
```

##### GoogleLoginButton Component
```typescript
// Features:
- Google branded button (following Google's branding guidelines)
- Loading state during OAuth flow
- Error handling
- Proper OAuth redirect handling
```

#### 4. Routing Setup
```typescript
// App.tsx or router configuration
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/dashboard" element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  } />
</Routes>

// ProtectedRoute component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;
  
  return children;
};
```

#### 5. Auth Hook Implementation
```typescript
// useAuth.ts
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Check current session
  // Handle login methods
  // Handle logout
  // Return auth state and methods
};
```

### Design Specifications

#### Layout Structure
```
┌─────────────────────────────────────┐
│                                     │
│         [Company Logo]              │
│                                     │
│      Welcome Back                   │
│   Sign in to your account           │
│                                     │
│   ┌─────────────────────────┐       │
│   │ Email                   │       │
│   └─────────────────────────┘       │
│                                     │
│   ┌─────────────────────────┐       │
│   │ Password                │       │
│   └─────────────────────────┘       │
│                                     │
│   □ Remember me   Forgot password?  │
│                                     │
│   ┌─────────────────────────┐       │
│   │      Sign In            │       │
│   └─────────────────────────┘       │
│                                     │
│          ─── OR ───                 │
│                                     │
│   ┌─────────────────────────┐       │
│   │  🔷 Sign in with Google │       │
│   └─────────────────────────┘       │
│                                     │
│   Don't have account? Sign up       │
│                                     │
└─────────────────────────────────────┘
```

#### Tailwind Classes to Use
```css
/* Main Container */
"min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"

/* Login Card */
"bg-white dark:bg-gray-800 shadow-xl rounded-lg px-8 py-10 w-full max-w-md"

/* Form Elements */
"w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"

/* Buttons */
"w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
"w-full border border-gray-300 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors"

/* Text */
"text-2xl font-bold text-gray-900 dark:text-white"
"text-sm text-gray-600 dark:text-gray-400"
"text-sm text-blue-600 hover:text-blue-500"

/* Error Messages */
"text-red-500 text-sm mt-1"

/* Loading States */
"animate-spin" "opacity-50 cursor-not-allowed"
```

### shadcn/ui Components to Use
- `Button` - for submit and OAuth buttons
- `Input` - for email and password fields
- `Label` - for form labels
- `Checkbox` - for remember me option
- `Alert` - for error messages
- `Card, CardContent, CardDescription, CardHeader, CardTitle` - for login card
- `Form, FormControl, FormField, FormItem, FormLabel, FormMessage` - if using react-hook-form
- `Icons` - for loading spinners and social icons

### Validation Requirements
- Email: Required, valid email format
- Password: Required, minimum 8 characters
- Show inline validation errors
- Disable submit button while loading
- Clear error messages on new attempt

### Error Handling
Handle these error cases:
- Invalid credentials
- Network errors
- OAuth failures
- Account not verified
- Account suspended/deleted
- Too many login attempts

### Security Considerations
- Never store password in plain text
- Use HTTPS for all requests
- Implement rate limiting (if not handled by Supabase)
- Add CSRF protection if needed
- Sanitize all inputs
- Use secure session storage

### Success Flow
1. User enters credentials or clicks Google login
2. Show loading state
3. Validate inputs (for email/password)
4. Call Supabase auth
5. On success:
   - Store auth token
   - Update auth context
   - Show success message briefly
   - Redirect to dashboard
6. On failure:
   - Show specific error message
   - Allow retry

### Example Implementation Snippets

#### LoginPage.tsx
```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../components/LoginForm';
import { GoogleLoginButton } from '../components/GoogleLoginButton';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        {/* Login form and OAuth options */}
      </div>
    </div>
  );
};
```

#### useAuth.ts
```typescript
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    // Implementation
  };

  const signInWithGoogle = async () => {
    // Implementation
  };

  const signOut = async () => {
    // Implementation
  };

  return {
    user,
    loading,
    error,
    signInWithEmail,
    signInWithGoogle,
    signOut
  };
};
```

## Deliverables
1. Complete login page with email and Google authentication
2. Auth repository implementation with Supabase
3. Auth hooks for state management
4. Protected route component
5. Proper TypeScript types
6. Error handling and validation
7. Loading states and feedback
8. Responsive design
9. Dark mode support
10. Auto-redirect logic

## Success Criteria
- [ ] User can login with email/password
- [ ] User can login with Google OAuth
- [ ] Form validation works properly
- [ ] Error messages display correctly
- [ ] Loading states show during auth
- [ ] Successful login redirects to dashboard
- [ ] Already logged in users auto-redirect
- [ ] Responsive on mobile devices
- [ ] Dark mode styling works
- [ ] TypeScript types are properly defined
- [ ] Clean Architecture principles maintained