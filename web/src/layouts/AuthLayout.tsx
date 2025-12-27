import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center bg-background">
      <div className="mx-auto w-full max-w-md px-6">
        <div className="text-center mb-8">
          <h2 className="mt-6 text-3xl font-bold text-foreground">
            Welcome to Himan
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your personal productivity workspace
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};
