import { NavLink } from 'react-router-dom';
import { cn } from '@core/presentation/utils';
import {
  Home,
  FileText,
  User,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@auth/presentation/hooks';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export const Sidebar = ({ isOpen, onToggle, className }: SidebarProps) => {
  const { signOut } = useAuth();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/notes', label: 'Notes', icon: FileText },
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 flex flex-col bg-gray-900 text-white transition-all duration-300",
      isOpen ? "w-64" : "w-20",
      className
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-800">
        {isOpen && (
          <span className="text-xl font-bold">Himan</span>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
              "hover:bg-gray-800",
              isActive && "bg-gray-800 text-blue-400",
              !isOpen && "justify-center"
            )}
            title={!isOpen ? item.label : undefined}
          >
            <item.icon size={20} />
            {isOpen && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-800 p-4">
        <button
          onClick={signOut}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors",
            !isOpen && "justify-center"
          )}
          title={!isOpen ? 'Logout' : undefined}
        >
          <LogOut size={20} />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};
