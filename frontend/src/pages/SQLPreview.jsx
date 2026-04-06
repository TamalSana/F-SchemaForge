import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function SQLPreview() {
  const { id } = useParams();
  const [schema, setSchema] = useState(null);
  const [sql, setSql] = useState([]);
  const [executing, setExecuting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSchema = async () => {
      const res = await api.get(`/schema/${id}`);
      setSchema(res.data.definition);
    };
    fetchSchema();
  }, [id]);

  const generateSQL = async () => {
    if (!schema || !schema.entities || schema.entities.length === 0) {
      toast.error('No schema defined');
      return;
    }
    try {
      const res = await api.post('/schema/generate-sql', { project_id: parseInt(id), entities: schema.entities });
      setSql(res.data.sql);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Generation failed');
    }
  };

  const executeSQL = async () => {
    if (!sql.length) return toast.error('Generate SQL first');
    if (!window.confirm('Execute SQL on database? This may modify schema.')) return;
    setExecuting(true);
    try {
      const res = await api.post('/schema/execute', { project_id: parseInt(id), entities: schema.entities });
      toast.success('Execution completed');
      console.log(res.data.results);
    } catch (err) {
      toast.error(err.response?.data?.detail);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">SQL Generation & Execution</h1>
      <button onClick={generateSQL} className="bg-blue-600 text-white px-4 py-2 rounded mb-4">Generate SQL</button>
      {sql.length > 0 && (
        <>
          <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto mb-4">
            {sql.join('\n\n')}
          </pre>
          <button onClick={executeSQL} disabled={executing} className="bg-red-600 text-white px-4 py-2 rounded">
            {executing ? 'Executing...' : 'Confirm & Execute'}
          </button>
        </>
      )}
    </div>
  );
}