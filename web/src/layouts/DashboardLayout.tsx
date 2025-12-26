import { Outlet } from 'react-router-dom';
import { Navbar } from './components/Navbar';

export const DashboardLayout = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navbar */}
      <Navbar/>

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto bg-white dark:bg-gray-800">
        <Outlet />
      </main>
    </div>
  );
};
