import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { cn } from '@core/presentation/utils';

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        className="hidden lg:block"
      />

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          onMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Page Content */}
        <main className={cn(
          "flex-1 overflow-y-auto bg-white dark:bg-gray-800"
        )}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
