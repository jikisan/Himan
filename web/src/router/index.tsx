import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';

// Layouts
import { RootLayout, AuthLayout, DashboardLayout } from '@/layouts';

// Pages
import { LoginPage, SignUpPage } from '@auth/presentation/pages';
import { DashboardPage } from '@dashboard/presentation/pages';
import { ProfilePage, SettingsPage } from '@settings';
import { NotesPage } from '@notes';
import { PasswordsPage } from '@passwords';
import { NotFoundPage } from '@core/presentation/pages';

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
          </Route>
        </Route>

        {/* Protected Routes with Dashboard Layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/passwords" element={<PasswordsPage />} />
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
