import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user } = useAuth();
  
  // If no user, show just the outlet (login/register pages)
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100">
        <main className="p-4">
          <Outlet />
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <main className="md:ml-72 p-4 md:p-6 transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}