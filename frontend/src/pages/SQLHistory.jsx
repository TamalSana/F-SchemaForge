import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function SQLHistory() {
  const { id } = useParams();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, [id]);

  const fetchHistory = async () => {
    try {
      const res = await api.get(`/sql-history/${id}`);
      setHistory(res.data);
    } catch (err) {
      toast.error('Failed to load history');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">SQL Execution History</h1>
      <div className="space-y-2">
        {history.map(h => (
          <div key={h.id} className="bg-white p-3 rounded shadow border-l-4 border-blue-500">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Executed by: {h.email}</span>
              <span>{new Date(h.executed_at).toLocaleString()}</span>
              <span className={`font-bold ${h.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{h.status}</span>
            </div>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">{h.sql_text}</pre>
          </div>
        ))}
        {history.length === 0 && <p>No SQL executed yet.</p>}
      </div>
    </div>
  );
}