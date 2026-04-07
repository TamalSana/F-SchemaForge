import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ProjectPermissions() {
  const { id } = useParams();
  const [users, setUsers] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [dbPermission, setDbPermission] = useState('read');
  const [tablePermission, setTablePermission] = useState('read');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPermissions();
  }, [id]);

  const fetchPermissions = async () => {
    try {
      const res = await api.get(`/permissions/${id}/users`);
      setUsers(res.data.users);
      setTables(res.data.tables);
    } catch (err) {
      toast.error('Failed to load permissions');
    }
  };

  const grantDatabaseAccess = async () => {
    if (!selectedUser) {
      toast.error('Select a user');
      return;
    }
    setLoading(true);
    try {
      await api.post('/permissions/database/grant', {
        project_id: parseInt(id),
        user_id: parseInt(selectedUser),
        permission_type: dbPermission
      });
      toast.success('Database access granted');
      fetchPermissions();
      setSelectedUser('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const revokeDatabaseAccess = async (userId) => {
    if (!window.confirm('Revoke database access for this user?')) return;
    try {
      await api.delete(`/permissions/database/revoke/${id}/${userId}`);
      toast.success('Database access revoked');
      fetchPermissions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    }
  };

  const grantTableAccess = async () => {
    if (!selectedUser || !selectedTable) {
      toast.error('Select both a user and a table');
      return;
    }
    setLoading(true);
    try {
      await api.post('/permissions/table/grant', {
        project_id: parseInt(id),
        table_name: selectedTable,
        user_id: parseInt(selectedUser),
        permission_type: tablePermission
      });
      toast.success('Table access granted');
      fetchPermissions();
      setSelectedUser('');
      setSelectedTable('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const revokeTableAccess = async (userId, tableName) => {
    if (!window.confirm(`Revoke access to table "${tableName}" for this user?`)) return;
    try {
      await api.delete(`/permissions/table/revoke/${id}/${tableName}/${userId}`);
      toast.success('Table access revoked');
      fetchPermissions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🔐 Granular Permissions</h1>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
        <p className="text-sm text-blue-700">
          Grant fine-grained access to databases and individual tables. 
          Users can have different permission levels for different resources.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database Level Permissions */}
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-xl font-bold mb-3">🗄️ Database Level Access</h2>
          <div className="space-y-3">
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="">Select User</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.email} {u.project_role === 'admin' ? '(Project Admin)' : ''}
                </option>
              ))}
            </select>
            
            <select
              value={dbPermission}
              onChange={e => setDbPermission(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="read">📖 Read Only</option>
              <option value="write">✏️ Read & Write</option>
              <option value="admin">👑 Admin (manage users)</option>
              <option value="full">⭐ Full Control</option>
            </select>
            
            <button
              onClick={grantDatabaseAccess}
              disabled={loading || !selectedUser}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Grant Database Access
            </button>
          </div>

          {/* Current Database Permissions */}
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Current Database Permissions</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {users.filter(u => u.database_permission).map(u => (
                <div key={u.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <div>
                    <span className="font-medium">{u.email}</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                      u.database_permission === 'full' ? 'bg-purple-200 text-purple-800' :
                      u.database_permission === 'admin' ? 'bg-blue-200 text-blue-800' :
                      u.database_permission === 'write' ? 'bg-green-200 text-green-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {u.database_permission}
                    </span>
                  </div>
                  <button
                    onClick={() => revokeDatabaseAccess(u.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Revoke
                  </button>
                </div>
              ))}
              {users.filter(u => u.database_permission).length === 0 && (
                <p className="text-gray-500 text-sm">No custom database permissions</p>
              )}
            </div>
          </div>
        </div>

        {/* Table Level Permissions */}
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-xl font-bold mb-3">📋 Table Level Access</h2>
          <div className="space-y-3">
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="">Select User</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.email}</option>
              ))}
            </select>
            
            <select
              value={selectedTable}
              onChange={e => setSelectedTable(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="">Select Table</option>
              {tables.map(t => (
                <option key={t} value={t}>📊 {t}</option>
              ))}
            </select>
            
            <select
              value={tablePermission}
              onChange={e => setTablePermission(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="read">📖 Read Only</option>
              <option value="write">✏️ Read & Write</option>
              <option value="delete">🗑️ Read, Write & Delete</option>
              <option value="full">⭐ Full Control</option>
            </select>
            
            <button
              onClick={grantTableAccess}
              disabled={loading || !selectedUser || !selectedTable}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              Grant Table Access
            </button>
          </div>

          {/* Current Table Permissions */}
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Current Table Permissions</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {users.filter(u => u.table_permissions).map(u => {
                const perms = u.table_permissions ? u.table_permissions.split(',') : [];
                return perms.map(perm => {
                  const [tableName, permType] = perm.split(':');
                  return (
                    <div key={`${u.id}-${tableName}`} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <div>
                        <span className="font-medium">{u.email}</span>
                        <span className="ml-2 text-xs text-gray-500">→</span>
                        <span className="ml-2 font-mono text-sm">{tableName}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                          permType === 'full' ? 'bg-purple-200 text-purple-800' :
                          permType === 'delete' ? 'bg-red-200 text-red-800' :
                          permType === 'write' ? 'bg-green-200 text-green-800' :
                          'bg-gray-200 text-gray-800'
                        }`}>
                          {permType}
                        </span>
                      </div>
                      <button
                        onClick={() => revokeTableAccess(u.id, tableName)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Revoke
                      </button>
                    </div>
                  );
                });
              })}
              {users.filter(u => u.table_permissions).length === 0 && (
                <p className="text-gray-500 text-sm">No custom table permissions</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Users Summary */}
      <div className="mt-6 bg-white rounded shadow p-4">
        <h2 className="text-xl font-bold mb-3">👥 All Users & Their Access</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">User</th>
                <th className="border p-2">Project Role</th>
                <th className="border p-2">Database Access</th>
                <th className="border p-2">Table Permissions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="border p-2">{u.email}</td>
                  <td className="border p-2">
                    {u.project_role === 'admin' ? (
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Admin</span>
                    ) : u.project_role === 'member' ? (
                      <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">Member</span>
                    ) : (
                      <span className="text-gray-400">No access</span>
                    )}
                  </td>
                  <td className="border p-2">
                    {u.database_permission ? (
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        u.database_permission === 'full' ? 'bg-purple-100 text-purple-800' :
                        u.database_permission === 'admin' ? 'bg-blue-100 text-blue-800' :
                        u.database_permission === 'write' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {u.database_permission}
                      </span>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="border p-2">
                    {u.table_permissions ? (
                      <div className="flex flex-wrap gap-1">
                        {u.table_permissions.split(',').map(perm => {
                          const [table, type] = perm.split(':');
                          return (
                            <span key={perm} className="text-xs bg-gray-100 px-1 rounded">
                              {table}:{type}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}