import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function OTPVerify() {
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { email, purpose } = location.state || {};

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email || !purpose) {
      toast.error('Missing verification context');
      navigate('/login');
      return;
    }
    try {
      const res = await api.post('/auth/verify-otp', { email, otp, purpose });
      if (purpose === 'register') {
        toast.success('Account activated! Please login.');
        navigate('/login');
      } else if (purpose === 'login') {
        // login OTP verified – token returned
        localStorage.setItem('token', res.data.access_token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
        toast.success('Login successful');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid OTP');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white shadow rounded">
      <h2 className="text-2xl font-bold mb-4">Verify OTP</h2>
      <p className="mb-4 text-gray-600">Enter the OTP sent to {email}</p>
      <form onSubmit={handleVerify}>
        <input
          type="text"
          placeholder="6-digit OTP"
          className="w-full border p-2 mb-3 rounded"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required
        />
        <button type="submit" className="w-full bg-green-600 text-white py-2 rounded">
          Verify
        </button>
      </form>
    </div>
  );
}