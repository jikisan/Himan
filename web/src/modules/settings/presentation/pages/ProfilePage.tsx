import { useAuth } from '@auth/presentation/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

export const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-foreground mb-6">
        Profile
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email
            </label>
            <p className="text-foreground">{user?.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              User ID
            </label>
            <p className="text-muted-foreground text-sm font-mono">{user?.id}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Created At
            </label>
            <p className="text-muted-foreground">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
