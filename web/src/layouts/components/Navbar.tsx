import { useState, useRef, useEffect } from 'react';
import { User, Settings } from 'lucide-react';
import { useAuth } from '@auth/presentation/hooks';
import { useNavigate, Link } from 'react-router-dom';


export const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6 lg:px-8">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* App Title/Logo */}
        <Link
          to="/dashboard"
          className="flex items-center gap-3 text-xl font-bold text-foreground hover:text-primary transition-colors"
        >
          <img
            src="/assets/images/himan_logo.webp"
            alt="Himan Logo"
            className="h-8 w-8 object-contain"
          />
          <span>Himan</span>
        </Link>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">

        {/* User Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium border-2 border-primary-foreground/20">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            {/* {user?.email && (
              <span className="hidden md:block text-sm font-medium text-foreground">
                {user.email.split('@')[0]}
              </span>
            )} */}
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div
              className="bg-background absolute right-0 mt-2 w-56 rounded-lg shadow-lg border border-border z-50"
            >
            <div className="p-3 border-b border-border">
              <p className="text-sm font-medium">
                {user?.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>
            <div className="py-2">
              <button
                onClick={() => {
                  navigate('/profile');
                  setIsDropdownOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
              >
                <User size={16} />
                Profile
              </button>
              <button
                onClick={() => {
                  navigate('/settings');
                  setIsDropdownOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
              >
                <Settings size={16} />
                Settings
              </button>
              <button
                onClick={() => {
                  handleSignOut();
                  setIsDropdownOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
    </header>
  );
};
