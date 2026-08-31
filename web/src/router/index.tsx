import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';

// Layouts
import { RootLayout, AuthLayout, DashboardLayout } from '@/layouts';

// Pages
import { LoginPage, SignUpPage } from '@auth/presentation/pages';
import { DashboardPage } from '@dashboard/presentation/pages';
import { ProfilePage, SettingsPage } from '@settings/presentation/pages';
import { NotesPage } from '@notes/presentation/pages/NotesPage';
import { PasswordsPage } from '@passwords/presentation/pages';
import { CardsPage } from '@cards/presentation/pages';
import { StoragePage } from '@storage/presentation/pages';
import { NotFoundPage } from '@core/presentation/pages';
import { InvoiceGeneratorPage } from '@invoice-generator/presentation/pages';
import { GroceryPage } from '@grocery/presentation/pages';
import { ItemsPage as CareerItemsPage, ItemEditorPage as CareerItemEditorPage, BlocksPage as CareerBlocksPage } from '@career/presentation/pages';

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
            <Route path="/cards" element={<CardsPage />} />
            <Route path="/storage" element={<StoragePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/invoice-generator" element={<InvoiceGeneratorPage />} />
            <Route path="/grocery" element={<GroceryPage />} />
            <Route path="/career" element={<CareerItemsPage />} />
            <Route path="/career/blocks" element={<CareerBlocksPage />} />
            <Route path="/career/new" element={<CareerItemEditorPage />} />
            <Route path="/career/:itemId" element={<CareerItemEditorPage />} />
          </Route>
        </Route>

        {/* Default Routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
