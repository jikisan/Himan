import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto w-full max-w-md px-6">
        <div className="text-center mb-8">
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Welcome to Himan
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Your personal productivity workspace
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};
