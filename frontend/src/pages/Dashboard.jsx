import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="text-3xl font-bold">Welcome, {user?.email}</h1>
      <p className="mt-2 text-gray-600">Use the sidebar to manage projects or access admin panel.</p>
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