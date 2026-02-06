import { Outlet } from 'react-router-dom';
import { Navbar } from './components/Navbar';

// Layout variant for pages that should use the browser's
// native scroll instead of the dashboard's inner scroll area.
export const InvoiceLayout = () => {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Navbar */}
      <Navbar />

      {/* Page Content - no inner overflow scrolling */}
      <main className="flex-1 bg-background">
        <Outlet />
      </main>
    </div>
  );
};

