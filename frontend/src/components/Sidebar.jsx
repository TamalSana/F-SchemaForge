import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: projectId } = useParams();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const handleLogout = () => { 
    logout(); 
    navigate('/login'); 
  };
  
  const isProjectPage = location.pathname.includes('/project/');
  const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin';
  const isSuperAdmin = user?.role === 'super_admin';
  
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'super_admin':
        return <span className="ml-2 text-xs bg-red-600 px-1.5 py-0.5 rounded-full">Super Admin</span>;
      case 'admin':
        return <span className="ml-2 text-xs bg-blue-600 px-1.5 py-0.5 rounded-full">Admin</span>;
      default:
        return <span className="ml-2 text-xs bg-gray-600 px-1.5 py-0.5 rounded-full">User</span>;
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="md:hidden fixed top-4 left-4 z-50 bg-gray-900 text-white p-2 rounded-lg shadow-lg"
      >
        {isMobileMenuOpen ? '✕' : '☰'}
      </button>
      
      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 w-72 bg-gray-900 text-white p-4 flex flex-col h-screen overflow-y-auto z-40 transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold">SchemaForge</h2>
            <p className="text-xs text-gray-400 mt-1">Database Creation System</p>
          </div>
          <button 
            onClick={closeMobileMenu}
            className="md:hidden text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        {/* User Info */}
        <div className="bg-gray-800 rounded-lg p-3 mb-4">
          <div className="text-sm text-gray-400">Logged in as</div>
          <div className="font-medium text-white truncate">{user?.email}</div>
          <div className="mt-1">
            {getRoleBadge()}
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          <Link 
            to="/dashboard" 
            className={`flex items-center gap-3 py-2.5 px-3 rounded transition ${
              location.pathname === '/dashboard' ? 'bg-gray-800' : 'hover:bg-gray-800'
            }`}
            onClick={closeMobileMenu}
          >
            <span>🏠</span>
            <span>Dashboard</span>
          </Link>
          
          <Link 
            to="/projects" 
            className={`flex items-center gap-3 py-2.5 px-3 rounded transition ${
              location.pathname === '/projects' ? 'bg-gray-800' : 'hover:bg-gray-800'
            }`}
            onClick={closeMobileMenu}
          >
            <span>📁</span>
            <span>Projects</span>
          </Link>
          
          {/* Project-specific links - ONLY project related links */}
          {isProjectPage && projectId && (
            <>
              <div className="border-t border-gray-700 my-2 pt-2">
                <p className="text-xs text-gray-400 px-3 mb-1 uppercase tracking-wider">
                  📌 Current Project
                </p>
                <Link 
                  to={`/project/${projectId}`} 
                  className={`flex items-center gap-3 py-2 px-3 rounded transition ${
                    location.pathname === `/project/${projectId}` ? 'bg-gray-800' : 'hover:bg-gray-800'
                  }`}
                  onClick={closeMobileMenu}
                >
                  <span>📊</span>
                  <span>Overview</span>
                </Link>
                <Link 
                  to={`/project/${projectId}/schema`} 
                  className={`flex items-center gap-3 py-2 px-3 rounded transition ${
                    location.pathname === `/project/${projectId}/schema` ? 'bg-gray-800' : 'hover:bg-gray-800'
                  }`}
                  onClick={closeMobileMenu}
                >
                  <span>✏️</span>
                  <span>Schema Designer</span>
                </Link>
                <Link 
                  to={`/project/${projectId}/sql-preview`} 
                  className={`flex items-center gap-3 py-2 px-3 rounded transition ${
                    location.pathname === `/project/${projectId}/sql-preview` ? 'bg-gray-800' : 'hover:bg-gray-800'
                  }`}
                  onClick={closeMobileMenu}
                >
                  <span>⚡</span>
                  <span>SQL Generator</span>
                </Link>
                <Link 
                  to={`/project/${projectId}/data`} 
                  className={`flex items-center gap-3 py-2 px-3 rounded transition ${
                    location.pathname === `/project/${projectId}/data` ? 'bg-gray-800' : 'hover:bg-gray-800'
                  }`}
                  onClick={closeMobileMenu}
                >
                  <span>📊</span>
                  <span>Data Management</span>
                </Link>
                <Link 
                  to={`/project/${projectId}/history`} 
                  className={`flex items-center gap-3 py-2 px-3 rounded transition ${
                    location.pathname === `/project/${projectId}/history` ? 'bg-gray-800' : 'hover:bg-gray-800'
                  }`}
                  onClick={closeMobileMenu}
                >
                  <span>📜</span>
                  <span>SQL History</span>
                </Link>
                <Link 
                  to={`/project/${projectId}/permissions`} 
                  className={`flex items-center gap-3 py-2 px-3 rounded transition ${
                    location.pathname === `/project/${projectId}/permissions` ? 'bg-gray-800' : 'hover:bg-gray-800'
                  }`}
                  onClick={closeMobileMenu}
                >
                  <span>🔐</span>
                  <span>Permissions</span>
                </Link>
              </div>
            </>
          )}
          
          {/* Administration Section - NO project links here */}
          {hasAdminAccess && (
            <>
              <div className="border-t border-gray-700 my-2 pt-2">
                <p className="text-xs text-gray-400 px-3 mb-1 uppercase tracking-wider">
                  🔧 Administration
                </p>
                <Link 
                  to="/admin" 
                  className={`flex items-center gap-3 py-2 px-3 rounded transition ${
                    location.pathname === '/admin' ? 'bg-gray-800' : 'hover:bg-gray-800'
                  }`}
                  onClick={closeMobileMenu}
                >
                  <span>⚙️</span>
                  <span>Admin Panel</span>
                </Link>
                
                {/* Change Credentials - ONLY for Super Admin, NOT in project section */}
                {isSuperAdmin && (
                  <Link 
                    to="/change-credentials" 
                    className={`flex items-center gap-3 py-2 px-3 rounded transition ${
                      location.pathname === '/change-credentials' ? 'bg-gray-800' : 'hover:bg-gray-800'
                    }`}
                    onClick={closeMobileMenu}
                  >
                    <span>🔑</span>
                    <span>Change Credentials</span>
                  </Link>
                )}
              </div>
            </>
          )}
        </nav>
        
        {/* Footer with Logout */}
        <div className="border-t border-gray-700 pt-4 mt-4">
          <button 
            onClick={handleLogout} 
            className="w-full bg-red-600 py-2.5 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
          <p className="text-xs text-gray-500 text-center mt-3">
            SchemaForge v1.0
          </p>
        </div>
      </aside>
    </>
  );
}