import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import AdminUserManagement from './AdminUserManagement';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('users');
  const [logs, setLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [config, setConfig] = useState({ db_host: '', db_user: '', db_password: '', db_name: '' });

  const fetchLogs = async () => {
    try {
      const res = await api.get('/admin/logs');
      setLogs(res.data);
    } catch (err) { toast.error('Failed to load logs'); }
  };

  const fetchSessions = async () => {
    try {
      const res = await api.get('/admin/sessions');
      setSessions(res.data);
    } catch (err) { toast.error('Failed to load sessions'); }
  };

  const handleConfigUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/config/db', config);
      toast.success('Config updated (restart required for changes)');
    } catch (err) { toast.error(err.response?.data?.detail); }
  };

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'sessions') fetchSessions();
  }, [activeTab]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      <div className="border-b mb-4 flex flex-wrap gap-2">
        {['users', 'config', 'logs', 'sessions'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 capitalize ${activeTab === tab ? 'border-b-2 border-blue-600 font-bold' : ''}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="bg-white p-4 rounded shadow">
        {activeTab === 'users' && <AdminUserManagement />}
        {activeTab === 'config' && (
          <form onSubmit={handleConfigUpdate}>
            <h2 className="text-xl mb-2">System Configuration</h2>
            <input type="text" placeholder="DB Host" value={config.db_host} onChange={e => setConfig({...config, db_host: e.target.value})} className="border p-2 w-full mb-2 rounded" />
            <input type="text" placeholder="DB User" value={config.db_user} onChange={e => setConfig({...config, db_user: e.target.value})} className="border p-2 w-full mb-2 rounded" />
            <input type="password" placeholder="DB Password" value={config.db_password} onChange={e => setConfig({...config, db_password: e.target.value})} className="border p-2 w-full mb-2 rounded" />
            <input type="text" placeholder="DB Name" value={config.db_name} onChange={e => setConfig({...config, db_name: e.target.value})} className="border p-2 w-full mb-2 rounded" />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Update Config</button>
          </form>
        )}
        {activeTab === 'logs' && (
          <div>
            <h2 className="text-xl mb-2">Audit Logs</h2>
            <pre className="bg-gray-900 text-green-400 p-2 rounded overflow-auto max-h-96 text-xs">
              {JSON.stringify(logs, null, 2)}
            </pre>
          </div>
        )}
        {activeTab === 'sessions' && (
          <div>
            <h2 className="text-xl mb-2">Active Sessions</h2>
            <table className="w-full border">
              <thead>
                <tr><th>User</th><th>Token (truncated)</th><th>Expires At</th></tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td className="border p-2">{s.email}</td>
                    <td className="border p-2 truncate max-w-xs">{s.token.substring(0, 50)}...</td>
                    <td className="border p-2">{s.expires_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}