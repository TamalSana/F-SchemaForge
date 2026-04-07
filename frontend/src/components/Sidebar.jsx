import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: projectId } = useParams();
  
  const handleLogout = () => { logout(); navigate('/login'); };
  
  const isProjectPage = location.pathname.includes('/project/');
  
  return (
    <aside className="w-64 bg-gray-900 text-white p-4 flex flex-col h-screen fixed left-0 top-0 overflow-y-auto z-10 transform -translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out">
      <h2 className="text-2xl font-bold mb-6">SchemaForge</h2>
      <nav className="flex-1 space-y-2">
        <Link to="/dashboard" className="block py-2 px-3 rounded hover:bg-gray-700">Dashboard</Link>
        <Link to="/projects" className="block py-2 px-3 rounded hover:bg-gray-700">Projects</Link>
        
        {isProjectPage && projectId && (
          <>
            <div className="border-t border-gray-700 my-2 pt-2">
              <p className="text-xs text-gray-400 px-3 mb-1">Current Project</p>
              <Link to={`/project/${projectId}`} className="block py-2 px-3 rounded hover:bg-gray-700">Overview</Link>
              <Link to={`/project/${projectId}/schema`} className="block py-2 px-3 rounded hover:bg-gray-700">Schema Designer</Link>
              <Link to={`/project/${projectId}/sql-preview`} className="block py-2 px-3 rounded hover:bg-gray-700">SQL Generator</Link>
              <Link to={`/project/${projectId}/data`} className="block py-2 px-3 rounded hover:bg-gray-700">Data Management</Link>
            </div>
          </>
        )}
        
        {user?.is_super_admin && (
          <Link to="/admin" className="block py-2 px-3 rounded hover:bg-gray-700">Admin Panel</Link>
        )}
      </nav>
      <button onClick={handleLogout} className="mt-auto bg-red-600 py-2 rounded hover:bg-red-700">
        Logout
      </button>
    </aside>
  );
}