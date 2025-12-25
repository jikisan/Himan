# Navigation Setup with React Router

## Project Context
React + Vite + TypeScript application with:
- **Routing**: React Router v6
- **Auth**: Supabase Authentication
- **Styling**: Tailwind CSS and shadcn/ui
- **Architecture**: Modular Clean Architecture

## Current Module Structure
```
web/src/modules/
├── auth/
├── dashboard/
├── notes/
└── shared/ (@core)
```

## Navigation Requirements
Implement a complete routing system with:
1. Public routes (accessible without authentication)
2. Protected routes (require authentication)
3. Layout components with persistent navigation
4. Role-based access control (optional)
5. 404 and error pages
6. Loading states during route transitions

## Implementation Structure

### 1. File Organization
```
web/src/
├── App.tsx (main routing setup)
├── router/
│   ├── index.tsx
│   ├── routes.tsx
│   ├── ProtectedRoute.tsx
│   └── PublicRoute.tsx
├── layouts/
│   ├── RootLayout.tsx
│   ├── AuthLayout.tsx
│   ├── DashboardLayout.tsx
│   └── components/
│       ├── Navbar.tsx
│       ├── Sidebar.tsx
│       ├── Footer.tsx
│       └── MobileNav.tsx
└── modules/
    └── [existing modules]
```

### 2. Route Configuration

#### Main App Router Setup
```typescript
// web/src/App.tsx
import { BrowserRouter } from 'react-router-dom';
import { Router } from './router';
import { AuthProvider } from '@auth/presentation/contexts/AuthContext';
import { Toaster } from '@core/presentation/components/ui/toaster';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

#### Router Component
```typescript
// web/src/router/index.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';
import { routes } from './routes';

// Layouts
import { RootLayout } from '@/layouts/RootLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';

// Pages
import { LoginPage } from '@auth/presentation/pages/LoginPage';
import { SignUpPage } from '@auth/presentation/pages/SignUpPage';
import { ForgotPasswordPage } from '@auth/presentation/pages/ForgotPasswordPage';
import { DashboardPage } from '@dashboard/presentation/pages/DashboardPage';
import { NotesPage } from '@notes/presentation/pages/NotesPage';
import { ProfilePage } from '@auth/presentation/pages/ProfilePage';
import { SettingsPage } from '@dashboard/presentation/pages/SettingsPage';
import { NotFoundPage } from '@core/presentation/pages/NotFoundPage';

export const Router = () => {
  return (
    <Routes>
      {/* Root Layout - wraps everything */}
      <Route element={<RootLayout />}>
        
        {/* Public Routes with Auth Layout */}
        <Route element={<PublicRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>
        </Route>

        {/* Protected Routes with Dashboard Layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/notes/:folderId" element={<NotesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Default Routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
```

### 3. Route Guards

#### Protected Route Component
```typescript
// web/src/router/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { LoadingScreen } from '@core/presentation/components/LoadingScreen';

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    // Redirect to login page but save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
```

#### Public Route Component
```typescript
// web/src/router/PublicRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { LoadingScreen } from '@core/presentation/components/LoadingScreen';

export const PublicRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // If user is already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
```

### 4. Layout Components

#### Root Layout
```typescript
// web/src/layouts/RootLayout.tsx
import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@auth/presentation/hooks/useAuth';

export const RootLayout = () => {
  const { checkSession } = useAuth();

  useEffect(() => {
    checkSession();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
};
```

#### Auth Layout
```typescript
// web/src/layouts/AuthLayout.tsx
import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="/logo.svg" 
            alt="Logo" 
            className="mx-auto h-12 w-auto"
          />
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Welcome
          </h2>
        </div>
        <Outlet />
      </div>
    </div>
  );
};
```

#### Dashboard Layout
```typescript
// web/src/layouts/DashboardLayout.tsx
import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { cn } from '@core/presentation/utils';

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        className="hidden lg:block"
      />

      {/* Mobile Navigation */}
      <MobileNav 
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <Navbar 
          onMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Page Content */}
        <main className={cn(
          "flex-1 overflow-y-auto bg-white dark:bg-gray-800",
          "transition-all duration-300",
          sidebarOpen ? "lg:ml-64" : "lg:ml-20"
        )}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
```

### 5. Navigation Components

#### Sidebar Component
```typescript
// web/src/layouts/components/Sidebar.tsx
import { NavLink } from 'react-router-dom';
import { cn } from '@core/presentation/utils';
import {
  Home,
  FileText,
  User,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@auth/presentation/hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export const Sidebar = ({ isOpen, onToggle, className }: SidebarProps) => {
  const { signOut } = useAuth();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/notes', label: 'Notes', icon: FileText },
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 flex flex-col bg-gray-900 text-white transition-all duration-300",
      isOpen ? "w-64" : "w-20",
      className
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-800">
        {isOpen && (
          <span className="text-xl font-bold">YourApp</span>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
              "hover:bg-gray-800",
              isActive && "bg-gray-800 text-blue-400"
            )}
          >
            <item.icon size={20} />
            {isOpen && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-800 p-4">
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <LogOut size={20} />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};
```

#### Navbar Component
```typescript
// web/src/layouts/components/Navbar.tsx
import { Menu, Bell, Search } from 'lucide-react';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@core/presentation/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@core/presentation/components/ui/avatar';
import { Button } from '@core/presentation/components/ui/button';
import { Input } from '@core/presentation/components/ui/input';

interface NavbarProps {
  onMenuClick: () => void;
  onSidebarToggle: () => void;
}

export const Navbar = ({ onMenuClick, onSidebarToggle }: NavbarProps) => {
  const { user, signOut } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white dark:bg-gray-800 px-4 sm:px-6 lg:px-8">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onSidebarToggle}
          className="hidden lg:flex"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-10 w-64"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-gray-500">
                  {user?.user_metadata?.full_name || 'User'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/profile">Profile</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/settings">Settings</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-red-600">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
```

#### Mobile Navigation
```typescript
// web/src/layouts/components/MobileNav.tsx
import { X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@core/presentation/components/ui/sheet';
import { cn } from '@core/presentation/utils';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav = ({ isOpen, onClose }: MobileNavProps) => {
  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/notes', label: 'Notes' },
    { path: '/profile', label: 'Profile' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-64">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => cn(
                "block px-4 py-2 rounded-lg transition-colors",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                isActive && "bg-gray-100 dark:bg-gray-800 font-medium"
              )}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
};
```

### 6. Route Configuration File
```typescript
// web/src/router/routes.tsx
import { RouteObject } from 'react-router-dom';
import { lazy } from 'react';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('@auth/presentation/pages/LoginPage'));
const SignUpPage = lazy(() => import('@auth/presentation/pages/SignUpPage'));
const DashboardPage = lazy(() => import('@dashboard/presentation/pages/DashboardPage'));
const NotesPage = lazy(() => import('@notes/presentation/pages/NotesPage'));
const ProfilePage = lazy(() => import('@auth/presentation/pages/ProfilePage'));
const SettingsPage = lazy(() => import('@dashboard/presentation/pages/SettingsPage'));
const NotFoundPage = lazy(() => import('@core/presentation/pages/NotFoundPage'));

export interface AppRoute extends RouteObject {
  name?: string;
  requiresAuth?: boolean;
  roles?: string[];
}

export const routes: AppRoute[] = [
  {
    path: '/login',
    element: <LoginPage />,
    name: 'Login',
    requiresAuth: false,
  },
  {
    path: '/signup',
    element: <SignUpPage />,
    name: 'Sign Up',
    requiresAuth: false,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
    name: 'Dashboard',
    requiresAuth: true,
  },
  {
    path: '/notes',
    element: <NotesPage />,
    name: 'Notes',
    requiresAuth: true,
  },
  {
    path: '/profile',
    element: <ProfilePage />,
    name: 'Profile',
    requiresAuth: true,
  },
  {
    path: '/settings',
    element: <SettingsPage />,
    name: 'Settings',
    requiresAuth: true,
  },
  {
    path: '*',
    element: <NotFoundPage />,
    name: 'Not Found',
  },
];
```

### 7. Navigation Utilities

#### Breadcrumbs Component
```typescript
// web/src/layouts/components/Breadcrumbs.tsx
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav className="flex items-center space-x-2 text-sm">
      <Link
        to="/"
        className="flex items-center hover:text-blue-600 transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const label = value.charAt(0).toUpperCase() + value.slice(1);

        return (
          <span key={to} className="flex items-center">
            <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
            {isLast ? (
              <span className="text-gray-600 dark:text-gray-400">{label}</span>
            ) : (
              <Link
                to={to}
                className="hover:text-blue-600 transition-colors"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
};
```

#### Active Link Component
```typescript
// web/src/layouts/components/ActiveLink.tsx
import { NavLink, NavLinkProps } from 'react-router-dom';
import { cn } from '@core/presentation/utils';

interface ActiveLinkProps extends NavLinkProps {
  activeClassName?: string;
  inactiveClassName?: string;
}

export const ActiveLink = ({
  className,
  activeClassName = 'text-blue-600 font-medium',
  inactiveClassName = 'text-gray-600 hover:text-gray-900',
  ...props
}: ActiveLinkProps) => {
  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          className,
          isActive ? activeClassName : inactiveClassName
        )
      }
      {...props}
    />
  );
};
```

### 8. Loading & Error Pages

#### Loading Screen
```typescript
// web/src/core/presentation/components/LoadingScreen.tsx
export const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
};
```

#### 404 Page
```typescript
// web/src/core/presentation/pages/NotFoundPage.tsx
import { Link } from 'react-router-dom';
import { Button } from '@core/presentation/components/ui/button';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-200 dark:text-gray-700">404</h1>
        <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-4">
          Page not found
        </p>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          The page you're looking for doesn't exist.
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};
```

### 9. Advanced Features

#### Role-Based Route Protection
```typescript
// web/src/router/RoleProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@auth/presentation/hooks/useAuth';

interface RoleProtectedRouteProps {
  allowedRoles: string[];
}

export const RoleProtectedRoute = ({ allowedRoles }: RoleProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  const userRole = user?.user_metadata?.role || 'user';
  const hasPermission = allowedRoles.includes(userRole);

  if (!hasPermission) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
```

#### Route Transition Animation
```typescript
// web/src/router/AnimatedRoute.tsx
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedRouteProps {
  children: ReactNode;
}

export const AnimatedRoute = ({ children }: AnimatedRouteProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};
```

## Package Dependencies
```json
{
  "dependencies": {
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.0.0",
    "lucide-react": "^0.300.0",
    "framer-motion": "^10.16.0"
  }
}
```

## Environment Variables
```env
VITE_APP_BASE_URL=http://localhost:5173
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Usage Instructions

1. **Install dependencies**:
```bash
npm install react-router-dom lucide-react
```

2. **Set up router in main.tsx**:
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

3. **Create necessary folders and files** as outlined in the structure

4. **Implement Auth Context** to manage user state globally

5. **Add route guards** for protected routes

6. **Style with Tailwind** and shadcn/ui components

## Success Criteria
- [ ] React Router v6 properly configured
- [ ] Public and protected routes working
- [ ] Navigation persists across pages
- [ ] Mobile responsive navigation
- [ ] Loading states during navigation
- [ ] 404 page for unknown routes
- [ ] Breadcrumbs showing current location
- [ ] Active link highlighting
- [ ] Smooth transitions between routes
- [ ] TypeScript types properly defined
- [ ] Auth state persists on refresh
- [ ] Redirect to login when unauthorized
- [ ] Return to intended page after login