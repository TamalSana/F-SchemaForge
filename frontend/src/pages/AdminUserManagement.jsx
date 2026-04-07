import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuth();

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
      const res = await api.get('/admin/projects/all');
      setProjects(res.data);
    } catch (err) {
      toast.error('Failed to load projects');
    }
  };

  const promoteUser = async (userId, newRole) => {
    if (!window.confirm(`Change user role to ${newRole.toUpperCase()}?`)) return;
    
    setLoading(true);
    try {
      await api.post('/admin/users/promote', { user_id: userId, role: newRole });
      toast.success(`User role updated to ${newRole}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId, userEmail, userRole) => {
    if (userRole === 'super_admin') {
      toast.error('Cannot delete super admin');
      return;
    }
    if (!window.confirm(`⚠️ PERMANENT ACTION: Delete user "${userEmail}"?\n\nThis will remove all their data, projects, and access. This cannot be undone!`)) return;
    
    setLoading(true);
    try {
      await api.delete(`/admin/users/delete/${userId}`);
      toast.success(`User ${userEmail} permanently deleted`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleBlacklist = async (userId, isCurrentlyBlacklisted, userEmail, userRole) => {
    if (userRole === 'super_admin') {
      toast.error('Cannot blacklist super admin');
      return;
    }
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

  const updateProjectCreatePerm = async (userId, canCreate) => {
    setLoading(true);
    try {
      await api.post('/admin/permissions/create-project', { user_id: userId, can_create: canCreate });
      toast.success(`Project creation permission ${canCreate ? 'granted' : 'revoked'}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
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
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to ${action} access`);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canModifyUser = (userRole) => {
    if (currentUser?.role === 'super_admin') return true;
    if (currentUser?.role === 'admin' && userRole !== 'super_admin' && userRole !== 'admin') return true;
    return false;
  };

  const canDeleteUser = (userRole) => {
    return currentUser?.role === 'super_admin' && userRole !== 'super_admin';
  };

  const canPromoteToAdmin = (userRole) => {
    return currentUser?.role === 'super_admin' && userRole !== 'super_admin';
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 border border-gray-200 p-3 rounded text-sm text-gray-600 mb-4">
        Manage users, roles, and permissions.
        </div>

      {/* Users Table */}
      <div className="bg-white p-4 rounded shadow overflow-x-auto">
        <h3 className="text-lg font-semibold mb-3">👥 All Users</h3>
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">ID</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Role</th>
              <th className="border p-2">Blacklisted</th>
              <th className="border p-2">Can Create Project</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className={u.is_blacklisted ? 'bg-red-50' : ''}>
                <td className="border p-2 text-center">{u.id}</td>
                <td className="border p-2">
                  {u.email}
                  {u.id === currentUser?.id && <span className="ml-2 text-xs text-gray-500">(you)</span>}
                </td>
                <td className="border p-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(u.role)}`}>
                    {u.role?.toUpperCase() || 'USER'}
                  </span>
                </td>
                <td className="border p-2 text-center">
                  {u.is_blacklisted ? '🚫 Yes' : '✅ No'}
                </td>
                <td className="border p-2 text-center">
                  {u.role !== 'super_admin' && (
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => updateProjectCreatePerm(u.id, true)}
                        disabled={loading || u.role === 'super_admin'}
                        className="bg-green-500 text-white px-2 py-1 rounded text-xs"
                      >
                        Allow
                      </button>
                      <button
                        onClick={() => updateProjectCreatePerm(u.id, false)}
                        disabled={loading || u.role === 'super_admin'}
                        className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                      >
                        Revoke
                      </button>
                    </div>
                  )}
                </td>
                <td className="border p-2">
                  <div className="flex flex-wrap gap-1 justify-center">
                    {u.role !== 'super_admin' && u.role !== 'admin' && canPromoteToAdmin(u.role) && (
                      <button
                        onClick={() => promoteUser(u.id, 'admin')}
                        disabled={loading}
                        className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                      >
                        Make Admin
                      </button>
                    )}
                    {u.role === 'admin' && currentUser?.role === 'super_admin' && (
                      <button
                        onClick={() => promoteUser(u.id, 'user')}
                        disabled={loading}
                        className="bg-gray-500 text-white px-2 py-1 rounded text-xs"
                      >
                        Demote to User
                      </button>
                    )}
                    {canModifyUser(u.role) && u.id !== currentUser?.id && (
                      <button
                        onClick={() => toggleBlacklist(u.id, u.is_blacklisted, u.email, u.role)}
                        disabled={loading}
                        className={`px-2 py-1 rounded text-xs text-white ${u.is_blacklisted ? 'bg-green-600' : 'bg-orange-600'}`}
                      >
                        {u.is_blacklisted ? 'Unblacklist' : 'Blacklist'}
                      </button>
                    )}
                    {canDeleteUser(u.role) && u.id !== currentUser?.id && (
                      <button
                        onClick={() => deleteUser(u.id, u.email, u.role)}
                        disabled={loading}
                        className="bg-red-600 text-white px-2 py-1 rounded text-xs"
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Project Access Management */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-3">🔐 Manage Project Access</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <select
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">Select User</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.email} ({u.role})
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
            <option value="admin">Project Admin</option>
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