import { Outlet } from 'react-router-dom';
import { Navbar } from './components/Navbar';

export const DashboardLayout = () => {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Navbar */}
      <Navbar/>

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
};
