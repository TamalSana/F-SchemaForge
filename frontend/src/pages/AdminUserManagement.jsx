import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchProjects();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      toast.error('Failed to load users');
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects/all');
      setProjects(res.data);
    } catch (err) {
      toast.error('Failed to load projects');
    }
  };

  const toggleSuperAdmin = async (userId, currentStatus) => {
    setLoading(true);
    try {
      await api.post('/admin/users/role', { user_id: userId, is_super_admin: !currentStatus });
      toast.success('User role updated');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const updateCreateProjectPerm = async (userId, canCreate) => {
    setLoading(true);
    try {
      await api.post('/admin/permissions/create-project', { user_id: userId, can_create: canCreate });
      toast.success(`Project creation permission ${canCreate ? 'granted' : 'revoked'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleBlacklist = async (userId, isCurrentlyBlacklisted, userEmail) => {
    setLoading(true);
    try {
      if (isCurrentlyBlacklisted) {
        await api.delete(`/admin/blacklist/remove/${userId}`);
        toast.success(`${userEmail} removed from blacklist`);
      } else {
        await api.post('/admin/blacklist/add', { user_id: userId, reason: 'Admin action' });
        toast.success(`${userEmail} blacklisted`);
      }
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const manageProjectAccess = async (action) => {
    if (!selectedUserId || !selectedProjectId) {
      toast.error('Select both a user and a project');
      return;
    }
    setLoading(true);
    try {
      await api.post('/admin/project-access', {
        user_id: parseInt(selectedUserId),
        project_id: parseInt(selectedProjectId),
        role: selectedRole,
        action
      });
      toast.success(`Access ${action}ed`);
      setSelectedUserId('');
      setSelectedProjectId('');
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to ${action} access`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">User & Project Management</h2>

      {/* Users Table */}
      <div className="bg-white p-4 rounded shadow overflow-x-auto">
        <h3 className="text-lg font-semibold mb-3">All Users</h3>
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">ID</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Super Admin</th>
              <th className="border p-2">Can Create Project</th>
              <th className="border p-2">Blacklisted</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className={u.is_blacklisted ? 'bg-red-50' : ''}>
                <td className="border p-2 text-center">{u.id}</td>
                <td className="border p-2">{u.email}</td>
                <td className="border p-2 text-center">
                  <button
                    onClick={() => toggleSuperAdmin(u.id, u.is_super_admin)}
                    disabled={loading}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      u.is_super_admin 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                  >
                    {u.is_super_admin ? 'Super Admin' : 'Make Admin'}
                  </button>
                </td>
                <td className="border p-2 text-center">
                  <div className="flex gap-1 justify-center">
                    <button
                      onClick={() => updateCreateProjectPerm(u.id, true)}
                      disabled={loading}
                      className="bg-green-500 text-white px-2 py-1 rounded text-xs"
                    >
                      Allow
                    </button>
                    <button
                      onClick={() => updateCreateProjectPerm(u.id, false)}
                      disabled={loading}
                      className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                    >
                      Revoke
                    </button>
                  </div>
                </td>
                <td className="border p-2 text-center">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${u.is_blacklisted ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                    {u.is_blacklisted ? 'Yes' : 'No'}
                  </span>
                  {u.blacklist_reason && <div className="text-xs text-gray-500 mt-1">{u.blacklist_reason}</div>}
                </td>
                <td className="border p-2 text-center">
                  <button
                    onClick={() => toggleBlacklist(u.id, u.is_blacklisted, u.email)}
                    disabled={loading}
                    className={`px-3 py-1 rounded text-white text-xs ${
                      u.is_blacklisted 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {u.is_blacklisted ? 'Unblacklist' : 'Blacklist'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Project Access Management */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-3">Manage Project Access</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <select
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">Select User</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.email} {u.is_blacklisted ? '(Blacklisted)' : ''}
              </option>
            ))}
          </select>
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">Select Project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="member">Member (read-only)</option>
            <option value="admin">Admin (full control)</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => manageProjectAccess('add')}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            Add Access
          </button>
          <button
            onClick={() => manageProjectAccess('remove')}
            disabled={loading}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            Remove Access
          </button>
        </div>
      </div>
    </div>
  );
}