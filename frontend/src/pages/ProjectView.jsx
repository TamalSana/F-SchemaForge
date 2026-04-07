import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ProjectView() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [entities, setEntities] = useState([]);
  const { user } = useAuth();

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

  const fetchEntities = async () => {
    try {
      const res = await api.get(`/schema/${id}`);
      const def = res.data.definition;
      if (def && def.entities) {
        setEntities(def.entities);
      }
    } catch (err) {
      // ignore
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
    fetchEntities();
  }, [id]);

  if (!project) return <div className="p-8 text-center">Loading project...</div>;

  const isAdmin = project.role === 'admin' || user?.is_super_admin || user?.is_admin;
  const canSeeSecretKey = isAdmin;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
        {canSeeSecretKey ? (
          <div className="bg-gray-50 p-3 rounded border">
            <span className="text-sm text-gray-600">Secret Key:</span>
            <code className="ml-2 bg-gray-200 px-2 py-1 rounded font-mono text-sm">{project.secret_key}</code>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(project.secret_key);
                toast.success('Secret key copied!');
              }}
              className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              📋 Copy
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 p-3 rounded border">
            <span className="text-sm text-gray-600">Secret Key:</span>
            <span className="ml-2 text-gray-400 italic">Only visible to project admins</span>
          </div>
        )}
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Link 
          to={`/project/${id}/schema`} 
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-5 rounded-lg text-center hover:from-blue-600 hover:to-blue-700 transition shadow"
        >
          <div className="text-2xl mb-1">📝</div>
          <div className="font-semibold">Schema Designer</div>
          <div className="text-xs opacity-90 mt-1">Create and edit tables</div>
        </Link>
        
        {isAdmin && (
          <Link 
            to={`/project/${id}/sql-preview`} 
            className="bg-gradient-to-r from-green-500 to-green-600 text-white p-5 rounded-lg text-center hover:from-green-600 hover:to-green-700 transition shadow"
          >
            <div className="text-2xl mb-1">⚡</div>
            <div className="font-semibold">Generate & Execute SQL</div>
            <div className="text-xs opacity-90 mt-1">Create tables in database</div>
          </Link>
        )}
        
        <Link 
          to={`/project/${id}/data`} 
          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-5 rounded-lg text-center hover:from-purple-600 hover:to-purple-700 transition shadow"
        >
          <div className="text-2xl mb-1">📊</div>
          <div className="font-semibold">Data Management</div>
          <div className="text-xs opacity-90 mt-1">Insert and view data</div>
        </Link>

        <Link 
          to={`/project/${id}/history`} 
          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-5 rounded-lg text-center hover:from-orange-600 hover:to-orange-700 transition shadow"
        >
          <div className="text-2xl mb-1">📜</div>
          <div className="font-semibold">SQL History</div>
          <div className="text-xs opacity-90 mt-1">View executed queries</div>
        </Link>
      </div>

      {/* Schema Summary */}
      {entities.length > 0 && (
        <div className="bg-white rounded shadow p-4 mb-6">
          <h2 className="font-bold text-lg mb-2">📋 Schema Summary</h2>
          <div className="flex flex-wrap gap-2">
            {entities.map(e => (
              <span key={e.name} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                {e.name} ({e.attributes?.length || 0} attr)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pending Members (Admin only) */}
      {isAdmin && pendingMembers.length > 0 && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-bold text-lg mb-3">⏳ Pending Join Requests</h2>
          <div className="space-y-2">
            {pendingMembers.map(m => (
              <div key={m.id} className="flex justify-between items-center border-b pb-2">
                <span className="font-medium">{m.email}</span>
                <div className="space-x-2">
                  <button 
                    onClick={() => approveUser(m.id, 'member')} 
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                  >
                    Approve as Member
                  </button>
                  <button 
                    onClick={() => approveUser(m.id, 'admin')} 
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                  >
                    Approve as Admin
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}