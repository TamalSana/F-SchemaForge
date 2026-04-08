import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('login');
  const [blacklistMessage, setBlacklistMessage] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await api.get('/setup/status');
        if (!res.data.setup_completed) {
          navigate('/setup');
        }
      } catch (err) {
        // If backend not reachable, assume setup needed
        navigate('/setup');
      }
    };
    checkSetup();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setBlacklistMessage(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.message === 'OTP sent. Please verify.') {
        setStep('otp');
        toast.success('OTP sent (check console/backend logs)');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail;
      if (errorMsg && errorMsg.toLowerCase().includes('blacklisted')) {
        setBlacklistMessage(errorMsg);
      } else {
        toast.error(errorMsg || 'Login failed');
      }
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/verify-otp', { email, otp, purpose: 'login' });
      login(res.data.access_token, res.data.user);
      toast.success('Login successful');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid OTP');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white shadow rounded">
      <h2 className="text-2xl font-bold mb-4">Login</h2>
      {blacklistMessage && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <div className="font-bold mb-1">⚠️ Account Blocked</div>
          <div className="text-sm whitespace-pre-line">{blacklistMessage}</div>
        </div>
      )}
      {step === 'login' ? (
        <form onSubmit={handleLogin}>
          <input type="email" placeholder="Email" className="w-full border p-2 mb-3 rounded" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" className="w-full border p-2 mb-3 rounded" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">Login</button>
          <p className="text-center mt-4">
          <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">Forgot password?</Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleVerify}>
          <input type="text" placeholder="OTP" className="w-full border p-2 mb-3 rounded" value={otp} onChange={e => setOtp(e.target.value)} required />
          <button type="submit" className="w-full bg-green-600 text-white py-2 rounded">Verify OTP</button>
        </form>
      )}
      <p className="mt-4 text-center">Don't have an account? <Link to="/register" className="text-blue-600">Register</Link></p>
    </div>
  );
}