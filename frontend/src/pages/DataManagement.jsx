import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function DataManagement() {
  const { id } = useParams();
  const [schema, setSchema] = useState(null);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState([]);
  const [insertForm, setInsertForm] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSchema = async () => {
      const res = await api.get(`/schema/${id}`);
      setSchema(res.data.definition);
    };
    fetchSchema();
  }, [id]);

  const loadTableData = async (tableName) => {
    setLoading(true);
    try {
      const res = await api.get(`/data/${id}/${tableName}`);
      setTableData(res.data.data);
      setSelectedTable(tableName);
      // Prepare insert form
      const entity = schema.entities.find(e => e.name === tableName);
      const initial = {};
      entity.attributes.forEach(attr => { initial[attr.name] = ''; });
      setInsertForm(initial);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = async (e) => {
    e.preventDefault();
    try {
      await api.post('/data/insert', { project_id: parseInt(id), table_name: selectedTable, data: insertForm });
      toast.success('Data inserted');
      loadTableData(selectedTable);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Insert failed');
    }
  };

  if (!schema) return <div>Loading schema...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Data Management</h1>
      <div className="flex gap-4">
        <div className="w-1/4 bg-white p-4 rounded shadow">
          <h2 className="font-bold mb-2">Tables</h2>
          <ul>
            {schema.entities.map(e => (
              <li key={e.name} className="mb-1">
                <button onClick={() => loadTableData(e.name)} className="text-blue-600 hover:underline">{e.name}</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 bg-white p-4 rounded shadow">
          {selectedTable ? (
            <>
              <h2 className="text-xl mb-2">Table: {selectedTable}</h2>
              <form onSubmit={handleInsert} className="mb-6 border-b pb-4">
                <h3>Insert Row</h3>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {Object.keys(insertForm).map(field => (
                    <input key={field} type="text" placeholder={field} value={insertForm[field]} onChange={e => setInsertForm({...insertForm, [field]: e.target.value})} className="border p-1 rounded" />
                  ))}
                  <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded">Insert</button>
                </div>
              </form>
              <div>
                <h3>Data</h3>
                {loading ? <p>Loading...</p> : (
                  <table className="w-full border text-sm">
                    <thead>
                      <tr>
                        {tableData.length > 0 && Object.keys(tableData[0]).map(k => <th key={k} className="border p-1">{k}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((val, i) => <td key={i} className="border p-1">{val}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : <p>Select a table from the left</p>}
        </div>
      </div>
    </div>
  );
}