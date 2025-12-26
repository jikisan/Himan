import { useAuth } from '@auth/presentation/hooks';
import { Link } from 'react-router-dom';
import { FileText, User, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

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
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {user?.email?.split('@')[0] || 'User'}!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Here's what's happening with your workspace today.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {quickLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group"
          >
            <Card className="transition-all hover:shadow-lg hover:border-primary/50">
              <CardHeader>
                <link.icon className="h-8 w-8 text-primary mb-2" />
                <CardTitle>{link.label}</CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Notes</p>
              <p className="text-2xl font-bold text-foreground">0</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Folders</p>
              <p className="text-2xl font-bold text-foreground">0</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Activity</p>
              <p className="text-2xl font-bold text-foreground">Today</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
