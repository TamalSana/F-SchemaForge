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
  const [databaseInfo, setDatabaseInfo] = useState(null);

  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const res = await api.get(`/schema/${id}`);
        setSchema(res.data.definition);
      } catch (err) {
        toast.error('Failed to load schema');
      }
    };
    fetchSchema();
    checkDatabase();
  }, [id]);

  const checkDatabase = async () => {
    try {
      const res = await api.get('/projects/my');
      const project = res.data.find(p => p.id === parseInt(id));
      if (project && project.database_name) {
        setDatabaseInfo(project.database_name);
      }
    } catch (err) {
      // ignore
    }
  };

  const loadTableData = async (tableName) => {
    setLoading(true);
    try {
      const trimmedTableName = tableName.trim().toLowerCase();
      const res = await api.get(`/data/${id}/${trimmedTableName}`);
      setTableData(res.data.data || []);
      setSelectedTable(tableName);
      
      const entity = schema.entities.find(e => e.name === tableName);
      if (entity) {
        const initial = {};
        entity.attributes.forEach(attr => { 
          initial[attr.name] = ''; 
        });
        setInsertForm(initial);
      }
    } catch (err) {
      toast.error('Failed to load data');
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = async (e) => {
    e.preventDefault();
    const trimmedTableName = selectedTable.trim().toLowerCase();
    
    // Validate that all required fields are filled
    const entity = schema.entities.find(e => e.name === selectedTable);
    if (entity) {
      for (const attr of entity.attributes) {
        if (attr.is_not_null && !insertForm[attr.name]) {
          toast.error(`Field "${attr.name}" cannot be empty`);
          return;
        }
      }
    }
    
    try {
      await api.post('/data/insert', { 
        project_id: parseInt(id), 
        table_name: trimmedTableName, 
        data: insertForm 
      });
      toast.success('Data inserted');
      loadTableData(selectedTable);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Insert failed');
    }
  };

  const handleFormChange = (field, value) => {
    setInsertForm({ ...insertForm, [field]: value });
  };

  const deleteRow = async (rowId) => {
    if (!window.confirm('Delete this row? This action cannot be undone.')) return;
    try {
      const trimmedTableName = selectedTable.trim().toLowerCase();
      await api.delete(`/data/row/${id}/${trimmedTableName}/${rowId}`);
      toast.success('Row deleted');
      loadTableData(selectedTable);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  if (!schema) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-gray-500">Loading schema...</div>
    </div>
  );

  if (!schema.entities || schema.entities.length === 0) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Data Management</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-yellow-700">
            ⚠️ No tables found. Please go to <strong>Schema Designer</strong> to create entities, 
            then go to <strong>SQL Generator</strong> to create the database and tables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📊 Data Management</h1>
      
      {databaseInfo && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded mb-4 text-sm flex justify-between items-center">
          <span>🗄️ Connected to database: <strong>{databaseInfo}</strong></span>
          <button 
            onClick={checkDatabase}
            className="text-blue-600 hover:text-blue-800 text-xs"
          >
            Refresh
          </button>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-4">
        {/* Left Panel - Tables List */}
        <div className="md:w-64 bg-white p-4 rounded shadow">
          <h2 className="font-bold mb-3 text-lg">📋 Tables</h2>
          <ul className="space-y-1">
            {schema.entities.map(e => (
              <li key={e.name}>
                <button 
                  onClick={() => loadTableData(e.name)} 
                  className={`w-full text-left py-2 px-3 rounded transition ${
                    selectedTable === e.name 
                      ? 'bg-blue-100 text-blue-700 font-medium' 
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  📌 {e.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Right Panel - Data Management */}
        <div className="flex-1 bg-white p-4 rounded shadow">
          {selectedTable ? (
            <>
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-xl font-bold">Table: {selectedTable}</h2>
                <button 
                  onClick={() => loadTableData(selectedTable)}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  🔄 Refresh
                </button>
              </div>
              
              {/* Insert Form */}
              <form onSubmit={handleInsert} className="mb-6 border-b pb-4">
                <h3 className="font-medium mb-2 text-gray-700">➕ Insert New Row</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.keys(insertForm).map(field => {
                    const entity = schema.entities.find(e => e.name === selectedTable);
                    const attr = entity?.attributes.find(a => a.name === field);
                    const isRequired = attr?.is_not_null;
                    return (
                      <input 
                        key={field} 
                        type="text" 
                        placeholder={isRequired ? `${field} *` : field} 
                        value={insertForm[field]} 
                        onChange={e => handleFormChange(field, e.target.value)} 
                        className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    );
                  })}
                  <button 
                    type="submit" 
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                  >
                    💾 Insert Row
                  </button>
                </div>
              </form>
              
              {/* Data Table */}
              <div>
                <h3 className="font-medium mb-2 text-gray-700">📋 Table Data</h3>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : tableData.length === 0 ? (
                  <div className="bg-gray-50 p-8 text-center text-gray-500 rounded">
                    No data found. Insert a row above to get started.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          {Object.keys(tableData[0]).map(k => (
                            <th key={k} className="border p-2 text-left">{k}</th>
                          ))}
                          <th className="border p-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            {Object.values(row).map((val, i) => (
                              <td key={i} className="border p-2">
                                {val === null ? <span className="text-gray-400 italic">NULL</span> : String(val)}
                              </td>
                            ))}
                            <td className="border p-2 text-center">
                              <button 
                                onClick={() => deleteRow(row.id)} 
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                🗑️ Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">📌</div>
              <p>Select a table from the left to view and manage data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}