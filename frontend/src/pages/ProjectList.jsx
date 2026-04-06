import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [newName, setNewName] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const navigate = useNavigate();

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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">My Projects</h1>
      <div className="grid gap-4 mb-8">
        {projects.map(p => (
          <div key={p.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
            <div><strong>{p.name}</strong> <span className="text-sm text-gray-500">(Role: {p.role})</span></div>
            <button onClick={() => navigate(`/project/${p.id}`)} className="bg-blue-500 text-white px-3 py-1 rounded">Open</button>
          </div>
        ))}
        {projects.length === 0 && <p className="text-gray-500">No projects yet. Create or join one.</p>}
      </div>
      <div className="bg-white p-4 rounded shadow mb-4">
        <h2 className="text-xl mb-2">Create Project</h2>
        <form onSubmit={createProject} className="flex gap-2">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Project Name" className="border p-2 flex-1 rounded" required />
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Create</button>
        </form>
      </div>
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl mb-2">Join Project</h2>
        <form onSubmit={joinProject} className="flex gap-2">
          <input type="text" value={secretKey} onChange={e => setSecretKey(e.target.value)} placeholder="Secret Key" className="border p-2 flex-1 rounded" required />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Request Join</button>
        </form>
      </div>
    </div>
  );
}