import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import AdminUserManagement from './AdminUserManagement';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('users');
  const [logs, setLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [config, setConfig] = useState({ db_host: '', db_user: '', db_password: '', db_name: '' });
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/logs');
      setLogs(res.data);
    } catch (err) { 
      toast.error('Failed to load logs'); 
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/sessions');
      setSessions(res.data);
    } catch (err) { 
      toast.error('Failed to load sessions'); 
    } finally {
      setLoading(false);
    }
  };

  const handleConfigUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/admin/config/db', config);
      toast.success('Config updated (restart required for changes)');
    } catch (err) { 
      toast.error(err.response?.data?.detail); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'sessions') fetchSessions();
  }, [activeTab]);

  const tabs = [
    { id: 'users', label: '👥 Users', icon: '👥' },
    { id: 'config', label: '⚙️ Config', icon: '⚙️' },
    { id: 'logs', label: '📋 Logs', icon: '📋' },
    { id: 'sessions', label: '🔌 Sessions', icon: '🔌' }
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex flex-wrap gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'users' && <AdminUserManagement />}
        
        {activeTab === 'config' && (
          <form onSubmit={handleConfigUpdate} className="p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4">System Configuration</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Database Host</label>
              <input 
                type="text" 
                placeholder="localhost" 
                value={config.db_host} 
                onChange={e => setConfig({...config, db_host: e.target.value})} 
                className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Database User</label>
              <input 
                type="text" 
                placeholder="root" 
                value={config.db_user} 
                onChange={e => setConfig({...config, db_user: e.target.value})} 
                className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Database Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={config.db_password} 
                onChange={e => setConfig({...config, db_password: e.target.value})} 
                className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Database Name</label>
              <input 
                type="text" 
                placeholder="schemaforge_metadata" 
                value={config.db_name} 
                onChange={e => setConfig({...config, db_name: e.target.value})} 
                className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Configuration'}
            </button>
          </form>
        )}
        
        {activeTab === 'logs' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Audit Logs</h2>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : logs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No logs found</p>
            ) : (
              <div className="overflow-x-auto">
                <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto max-h-96 text-xs font-mono">
                  {JSON.stringify(logs, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'sessions' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Active Sessions</h2>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No active sessions</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-2 text-left">User</th>
                      <th className="border p-2 text-left">Role</th>
                      <th className="border p-2 text-left">Token (truncated)</th>
                      <th className="border p-2 text-left">Expires At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="border p-2">{s.email}</td>
                        <td className="border p-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            s.role === 'super_admin' ? 'bg-red-100 text-red-800' :
                            s.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {s.role || 'user'}
                          </span>
                        </td>
                        <td className="border p-2 font-mono text-xs">{s.token?.substring(0, 50)}...</td>
                        <td className="border p-2">{new Date(s.expires_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}