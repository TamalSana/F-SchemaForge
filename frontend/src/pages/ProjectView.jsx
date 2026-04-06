import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ProjectView() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [pendingMembers, setPendingMembers] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchProject = async () => {
    try {
      const res = await api.get('/projects/my');
      const found = res.data.find(p => p.id === parseInt(id));
      setProject(found);
    } catch (err) {
      toast.error('Failed to load project');
    }
  };

  const fetchPending = async () => {
    try {
      const res = await api.get(`/projects/${id}/members/pending`);
      setPendingMembers(res.data);
    } catch (err) {
      // ignore if not admin
    }
  };

  const approveUser = async (userId, role) => {
    try {
      await api.post('/projects/approve', { project_id: parseInt(id), user_id: userId, role });
      toast.success('User approved');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.detail);
    }
  };

  useEffect(() => {
    fetchProject();
    fetchPending();
  }, [id]);

  if (!project) return <div>Loading...</div>;

  const isAdmin = project.role === 'admin';

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
      <p className="text-gray-600 mb-4">Secret Key: <code className="bg-gray-200 px-2 py-1 rounded">{project.secret_key}</code></p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Link to={`/project/${id}/schema`} className="bg-blue-600 text-white p-4 rounded text-center hover:bg-blue-700">Schema Designer</Link>
        {isAdmin && <Link to={`/project/${id}/sql-preview`} className="bg-green-600 text-white p-4 rounded text-center hover:bg-green-700">Generate & Execute SQL</Link>}
        <Link to={`/project/${id}/data`} className="bg-purple-600 text-white p-4 rounded text-center hover:bg-purple-700">Data Management</Link>
      </div>
      {isAdmin && pendingMembers.length > 0 && (
        <div className="bg-white p-4 rounded shadow mt-4">
          <h2 className="text-xl font-bold mb-2">Pending Join Requests</h2>
          {pendingMembers.map(m => (
            <div key={m.id} className="flex justify-between items-center border-b py-2">
              <span>{m.email}</span>
              <div>
                <button onClick={() => approveUser(m.id, 'member')} className="bg-green-500 text-white px-3 py-1 rounded mr-2">Approve as Member</button>
                <button onClick={() => approveUser(m.id, 'admin')} className="bg-blue-500 text-white px-3 py-1 rounded">Approve as Admin</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}