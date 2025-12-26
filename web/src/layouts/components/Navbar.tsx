import { User, Settings } from 'lucide-react';
import { useAuth } from '@auth/presentation/hooks';
import { useNavigate, Link } from 'react-router-dom';


export const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6 lg:px-8">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* App Title/Logo */}
        <Link
          to="/dashboard"
          className="text-xl font-bold text-foreground hover:text-primary transition-colors"
        >
          Himan
        </Link>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">

        {/* User Menu */}
        <div className="relative group">
          <button className="flex items-center gap-2 p-2 hover:bg-accent rounded-lg transition-colors">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            {user?.email && (
              <span className="hidden md:block text-sm font-medium text-foreground">
                {user.email.split('@')[0]}
              </span>
            )}
          </button>

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-lg border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
            <div className="p-3 border-b border-border">
              <p className="text-sm font-medium text-foreground">
                {user?.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>
            <div className="py-2">
              <button
                onClick={() => navigate('/profile')}
                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors flex items-center gap-2"
              >
                <User size={16} />
                Profile
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors flex items-center gap-2"
              >
                <Settings size={16} />
                Settings
              </button>
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-accent transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
