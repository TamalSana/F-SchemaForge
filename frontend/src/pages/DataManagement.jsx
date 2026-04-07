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
      const entity = schema.entities.find(e => e.name === tableName);
      if (entity) {
        const initial = {};
        entity.attributes.forEach(attr => { initial[attr.name] = ''; });
        setInsertForm(initial);
      }
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

  const deleteRow = async (rowId) => {
    if (!window.confirm('Delete this row?')) return;
    try {
      await api.delete(`/data/row/${id}/${selectedTable}/${rowId}`);
      toast.success('Row deleted');
      loadTableData(selectedTable);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  if (!schema) return <div className="p-4">Loading schema...</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Data Management</h1>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:w-64 bg-white p-4 rounded shadow">
          <h2 className="font-bold mb-2">Tables</h2>
          <ul className="space-y-1">
            {schema.entities.map(e => (
              <li key={e.name}>
                <button onClick={() => loadTableData(e.name)} className="text-blue-600 hover:underline w-full text-left">{e.name}</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 bg-white p-4 rounded shadow overflow-x-auto">
          {selectedTable ? (
            <>
              <h2 className="text-xl mb-2">Table: {selectedTable}</h2>
              <form onSubmit={handleInsert} className="mb-6 border-b pb-4">
                <h3 className="font-medium mb-2">Insert New Row</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.keys(insertForm).map(field => (
                    <input key={field} type="text" placeholder={field} value={insertForm[field]} onChange={e => setInsertForm({...insertForm, [field]: e.target.value})} className="border p-2 rounded" />
                  ))}
                  <button type="submit" className="bg-green-600 text-white px-3 py-2 rounded">Insert</button>
                </div>
              </form>
              <div>
                <h3 className="font-medium mb-2">Data</h3>
                {loading ? <p>Loading...</p> : tableData.length === 0 ? (
                  <p className="text-gray-500">No data. Insert a row above.</p>
                ) : (
                  <table className="w-full border text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        {Object.keys(tableData[0]).map(k => <th key={k} className="border p-2">{k}</th>)}
                        <th className="border p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((val, i) => <td key={i} className="border p-2">{val}</td>)}
                          <td className="border p-2 text-center">
                            <button onClick={() => deleteRow(row.id)} className="text-red-600 hover:text-red-800">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">Select a table from the left</p>
          )}
        </div>
      </div>
    </div>
  );
}