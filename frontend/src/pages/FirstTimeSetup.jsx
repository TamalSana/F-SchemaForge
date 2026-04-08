import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function FirstTimeSetup() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [formData, setFormData] = useState({
    db_host: 'localhost',
    db_user: 'root',
    db_password: '',
    db_name: 'schemaforge_metadata'
  });
  const navigate = useNavigate();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await api.get('/setup/status');
        if (res.data.setup_completed) {
          setNeedsSetup(false);
          navigate('/login');
        } else {
          setNeedsSetup(true);
        }
      } catch (err) {
        setNeedsSetup(true);
      } finally {
        setChecking(false);
      }
    };
    checkStatus();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.db_host || !formData.db_user || !formData.db_name) {
      toast.error('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/setup/configure-database', formData);
      toast.success(res.data.message);
      // Poll for setup completion (backend will restart)
      const poll = setInterval(async () => {
        try {
          const statusRes = await api.get('/setup/status');
          if (statusRes.data.setup_completed) {
            clearInterval(poll);
            toast.success('Setup complete! Redirecting to login...');
            setTimeout(() => navigate('/login'), 1500);
          }
        } catch (err) {
          // backend may be restarting, ignore errors
        }
      }, 3000);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Setup failed');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Checking setup status...</p>
        </div>
      </div>
    );
  }

  if (!needsSetup) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🚀</div>
          <h1 className="text-2xl font-bold">Welcome to SchemaForge</h1>
          <p className="text-gray-500 text-sm mt-2">First-time setup – Database Configuration</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Database Host *</label>
            <input type="text" name="db_host" value={formData.db_host} onChange={handleChange} required className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Database Username *</label>
            <input type="text" name="db_user" value={formData.db_user} onChange={handleChange} required className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Database Password</label>
            <input type="password" name="db_password" value={formData.db_password} onChange={handleChange} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Database Name *</label>
            <input type="text" name="db_name" value={formData.db_name} onChange={handleChange} required className="w-full border p-2 rounded" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Configuring...' : 'Complete Setup'}
          </button>
        </form>
        <div className="mt-6 text-center text-xs text-gray-400">
          After setup, the backend will restart automatically. You will be redirected to login.
        </div>
      </div>
    </div>
  );
}