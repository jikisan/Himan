import { useAuth } from '@auth/presentation/hooks';
import { Link } from 'react-router-dom';
import { FileText, User, Settings } from 'lucide-react';

export const DashboardPage = () => {
  const { user } = useAuth();

  const quickLinks = [
    { to: '/notes', icon: FileText, label: 'Notes', description: 'Manage your notes' },
    { to: '/profile', icon: User, label: 'Profile', description: 'View your profile' },
    { to: '/settings', icon: Settings, label: 'Settings', description: 'App settings' },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.email?.split('@')[0] || 'User'}!
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Here's what's happening with your workspace today.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {quickLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
          >
            <link.icon className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {link.label}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {link.description}
            </p>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Quick Stats
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Notes</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Folders</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Last Activity</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">Today</p>
          </div>
        </div>
      </div>
    </div>
  );
};
