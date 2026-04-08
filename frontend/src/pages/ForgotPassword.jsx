import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [step, setStep] = useState('request'); // request, reset
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      toast.success(res.data.message);
      setStep('reset');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword) {
      toast.error('Please fill all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { email, otp, new_password: newPassword });
      toast.success(res.data.message);
      setTimeout(() => window.location.href = '/login', 2000);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white shadow rounded">
      <h2 className="text-2xl font-bold mb-4">Forgot Password</h2>
      {step === 'request' ? (
        <form onSubmit={handleRequestOtp}>
          <input type="email" placeholder="Your email" className="w-full border p-2 mb-3 rounded" value={email} onChange={e => setEmail(e.target.value)} required />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded">Send OTP</button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword}>
          <input type="email" placeholder="Email" className="w-full border p-2 mb-3 rounded" value={email} disabled />
          <input type="text" placeholder="OTP" className="w-full border p-2 mb-3 rounded" value={otp} onChange={e => setOtp(e.target.value)} required />
          <input type="password" placeholder="New Password" className="w-full border p-2 mb-3 rounded" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          <input type="password" placeholder="Confirm Password" className="w-full border p-2 mb-3 rounded" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-2 rounded">Reset Password</button>
        </form>
      )}
      <p className="mt-4 text-center">
        <Link to="/login" className="text-blue-600">Back to Login</Link>
      </p>
    </div>
  );
}