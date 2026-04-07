import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [newName, setNewName] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects/my');
      setProjects(res.data);
    } catch (err) {
      toast.error('Failed to load projects');
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const createProject = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Project name required');
      return;
    }
    try {
      const res = await api.post('/projects/create', { name: newName });
      toast.success('Project created');
      fetchProjects();
      setNewName('');
    } catch (err) { 
      toast.error(err.response?.data?.detail || 'Create failed'); 
    }
  };

  const joinProject = async (e) => {
    e.preventDefault();
    if (!secretKey.trim()) {
      toast.error('Secret key required');
      return;
    }
    try {
      await api.post('/projects/join', { secret_key: secretKey });
      toast.success('Join request sent to admin');
      fetchProjects();
      setSecretKey('');
    } catch (err) { 
      toast.error(err.response?.data?.detail || 'Join failed'); 
    }
  };

  const deleteProject = async (projectId, projectName) => {
    if (!window.confirm(`Delete project "${projectName}" and all its data? This cannot be undone.`)) return;
    try {
      await api.delete(`/projects/${projectId}`);
      toast.success('Project deleted');
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  const canSeeSecretKey = (project) => {
    return project.role === 'admin' || user?.is_super_admin || user?.is_admin;
  };

  const canDeleteProject = (project) => {
    return project.role === 'admin' || user?.is_super_admin;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Projects</h1>
      
      <div className="grid gap-4 mb-8">
        {projects.map(p => (
          <div key={p.id} className="bg-white p-4 rounded shadow flex flex-wrap justify-between items-center gap-2">
            <div className="flex-1">
              <div className="font-semibold text-lg">{p.name}</div>
              <div className="text-sm text-gray-500 mt-1">
                Role: <span className="font-medium">{p.role}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Secret Key: {canSeeSecretKey(p) ? (
                  <code className="bg-gray-100 px-1 rounded">{p.secret_key}</code>
                ) : (
                  <span className="italic">******** (admin only)</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => navigate(`/project/${p.id}`)} 
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Open
              </button>
              {canDeleteProject(p) && (
                <button 
                  onClick={() => deleteProject(p.id, p.name)} 
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        
        {projects.length === 0 && (
          <div className="bg-gray-50 p-8 rounded text-center text-gray-500">
            No projects yet. Create or join one below.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Project */}
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-3">🚀 Create Project</h2>
          <form onSubmit={createProject} className="space-y-3">
            <input 
              type="text" 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
              placeholder="Project Name" 
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              required 
            />
            <button 
              type="submit" 
              className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Create Project
            </button>
          </form>
        </div>

        {/* Join Project */}
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-3">🔑 Join Project</h2>
          <form onSubmit={joinProject} className="space-y-3">
            <input 
              type="text" 
              value={secretKey} 
              onChange={e => setSecretKey(e.target.value)} 
              placeholder="Secret Key" 
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              required 
            />
            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Request to Join
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}