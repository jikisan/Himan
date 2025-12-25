import { Link } from 'react-router-dom';

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
        <Link
          to="/dashboard"
          className="inline-block mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
};
