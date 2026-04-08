import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('register');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', { email, password });
      toast.success('Registered. OTP sent (check console/backend logs).');
      setStep('otp');
    } catch (err) {
      toast.error(err.response?.data?.detail);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/verify-otp', { email, otp, purpose: 'register' });
      toast.success('Account activated! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error('Invalid OTP');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white shadow rounded">
      <h2 className="text-2xl font-bold mb-4">Register</h2>
      {step === 'register' ? (
        <form onSubmit={handleRegister}>
          <input 
            type="email" 
            placeholder="Email" 
            className="w-full border p-2 mb-3 rounded" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="w-full border p-2 mb-3 rounded" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">
            Register
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify}>
          <input 
            type="text" 
            placeholder="OTP" 
            className="w-full border p-2 mb-3 rounded" 
            value={otp} 
            onChange={e => setOtp(e.target.value)} 
            required 
          />
          <button type="submit" className="w-full bg-green-600 text-white py-2 rounded">
            Verify OTP
          </button>
        </form>
      )}
      <p className="mt-4 text-center">
        Already have an account? <Link to="/login" className="text-blue-600">Login</Link>
      </p>
    </div>
  );
}