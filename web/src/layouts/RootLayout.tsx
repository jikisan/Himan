import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@auth/presentation/hooks';

export const RootLayout = () => {
  const { checkSession } = useAuth();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
};
