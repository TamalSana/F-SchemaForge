import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  
  console.log('Current user:', user);
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Welcome, {user?.email}</h1>
      <p className="text-gray-600">Your role: <strong>{user?.role || 'unknown'}</strong></p>
      
      {user?.role === 'super_admin' && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          🔑 You have Super Admin access
        </div>
      )}
      
      {user?.role === 'admin' && (
        <div className="mt-4 p-3 bg-blue-100 text-blue-700 rounded">
          👑 You have Admin access
        </div>
      )}
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <ul className="mt-2 space-y-2">
            <li><a href="/projects" className="text-blue-600">→ View My Projects</a></li>
            <li><a href="/projects" className="text-blue-600">→ Create New Project</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
}