import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@auth/presentation/hooks';
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
