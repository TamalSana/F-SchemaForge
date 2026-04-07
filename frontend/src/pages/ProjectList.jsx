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
    try {
      const res = await api.post('/projects/create', { name: newName });
      toast.success('Project created');
      fetchProjects();
      setNewName('');
    } catch (err) { toast.error(err.response?.data?.detail); }
  };

  const joinProject = async (e) => {
    e.preventDefault();
    try {
      await api.post('/projects/join', { secret_key: secretKey });
      toast.success('Join request sent');
      fetchProjects();
      setSecretKey('');
    } catch (err) { toast.error(err.response?.data?.detail); }
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

  const isAdmin = (project) => project.role === 'admin' || user?.is_super_admin;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Projects</h1>
      <div className="grid gap-4 mb-8">
        {projects.map(p => (
          <div key={p.id} className="bg-white p-4 rounded shadow flex flex-wrap justify-between items-center gap-2">
            <div>
              <strong>{p.name}</strong>
              <span className="text-sm text-gray-500 ml-2">(Role: {p.role})</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate(`/project/${p.id}`)} className="bg-blue-500 text-white px-3 py-1 rounded">
                Open
              </button>
              {isAdmin(p) && (
                <button onClick={() => deleteProject(p.id, p.name)} className="bg-red-500 text-white px-3 py-1 rounded">
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {projects.length === 0 && <p className="text-gray-500">No projects yet. Create or join one.</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl mb-2">Create Project</h2>
          <form onSubmit={createProject} className="flex flex-col gap-2">
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Project Name" className="border p-2 rounded" required />
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Create</button>
          </form>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl mb-2">Join Project</h2>
          <form onSubmit={joinProject} className="flex flex-col gap-2">
            <input type="text" value={secretKey} onChange={e => setSecretKey(e.target.value)} placeholder="Secret Key" className="border p-2 rounded" required />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Request Join</button>
          </form>
        </div>
      </div>
    </div>
  );
}