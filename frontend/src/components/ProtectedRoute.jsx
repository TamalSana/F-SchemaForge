import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-center p-8">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (requireAdmin && !user.is_super_admin) return <Navigate to="/dashboard" />;
  return children;
}