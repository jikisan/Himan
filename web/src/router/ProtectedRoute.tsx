import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@auth/presentation/hooks';
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
