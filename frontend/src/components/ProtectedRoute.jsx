import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import api from '../services/api';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading, logout } = useAuth();
  const [blacklistError, setBlacklistError] = useState(null);

  useEffect(() => {
    // Check if user is blacklisted by making a test API call
    const checkBlacklist = async () => {
      if (!user) return;
      try {
        await api.get('/projects/my');
      } catch (err) {
        if (err.response?.status === 403 && err.response?.data?.detail?.toLowerCase().includes('blacklisted')) {
          setBlacklistError(err.response.data.detail);
          logout(); // Log out blacklisted user
        }
      }
    };
    checkBlacklist();
  }, [user, logout]);

  if (loading) return <div className="text-center p-8">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  // Check if admin access is required - using role field
  if (requireAdmin && user.role !== 'super_admin' && user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }
  
  // Show blacklist message if user is blacklisted
  if (blacklistError) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-white shadow rounded">
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded">
          <div className="font-bold text-lg mb-2">⚠️ Account Blocked</div>
          <div className="whitespace-pre-line text-sm">{blacklistError}</div>
          <button 
            onClick={() => window.location.href = '/login'} 
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }
  
  return children;
}