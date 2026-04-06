import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('login');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.message === 'OTP sent. Please verify.') {
        setStep('otp');
        toast.success('OTP sent (check console/backend logs)');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
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
      {step === 'login' ? (
        <form onSubmit={handleLogin}>
          <input type="email" placeholder="Email" className="w-full border p-2 mb-3 rounded" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" className="w-full border p-2 mb-3 rounded" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">Login</button>
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