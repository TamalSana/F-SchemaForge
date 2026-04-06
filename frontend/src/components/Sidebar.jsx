import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };
  return (
    <aside className="w-64 bg-gray-900 text-white p-4 flex flex-col">
      <h2 className="text-2xl font-bold mb-6">SchemaForge</h2>
      <nav className="flex-1 space-y-2">
        <Link to="/dashboard" className="block py-2 px-3 rounded hover:bg-gray-700">Dashboard</Link>
        <Link to="/projects" className="block py-2 px-3 rounded hover:bg-gray-700">Projects</Link>
        {user?.is_super_admin && <Link to="/admin" className="block py-2 px-3 rounded hover:bg-gray-700">Admin Panel</Link>}
      </nav>
      <button onClick={handleLogout} className="mt-auto bg-red-600 py-2 rounded hover:bg-red-700">Logout</button>
    </aside>
  );
}