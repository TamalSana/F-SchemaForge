import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function SQLPreview() {
  const { id } = useParams();
  const [schema, setSchema] = useState(null);
  const [sql, setSql] = useState([]);
  const [databaseName, setDatabaseName] = useState('');
  const [showDbModal, setShowDbModal] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [generatedDb, setGeneratedDb] = useState(null);
  const [executionResults, setExecutionResults] = useState(null);
  const [activeTab, setActiveTab] = useState('sql');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const res = await api.get(`/schema/${id}`);
        setSchema(res.data.definition);
      } catch (err) {
        toast.error('Failed to load schema');
        console.error(err);
      }
    };
    fetchSchema();
  }, [id]);

  const handleGenerateClick = () => {
    if (!schema || !schema.entities || schema.entities.length === 0) {
      toast.error('No schema defined. Please create entities in Schema Designer first.');
      return;
    }
    setShowDbModal(true);
  };

  const generateSQL = async () => {
    if (!databaseName.trim()) {
      toast.error('Please enter a database name');
      return;
    }
    
    // Validate database name (only letters, numbers, underscores)
    const validNameRegex = /^[a-zA-Z0-9_]+$/;
    if (!validNameRegex.test(databaseName)) {
      toast.error('Database name can only contain letters, numbers, and underscores');
      return;
    }
    
    setShowDbModal(false);
    setExecuting(true);
    
    try {
      const res = await api.post('/schema/generate-sql', {
        project_id: parseInt(id),
        entities: schema.entities,
        database_name: databaseName
      });
      
      setSql(res.data.sql);
      setGeneratedDb(res.data.database);
      toast.success(`SQL generated for database: ${res.data.database}`);
      setActiveTab('sql');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Generation failed');
    } finally {
      setExecuting(false);
    }
  };

  const executeSQL = async () => {
    if (!sql.length) {
      toast.error('Generate SQL first');
      return;
    }
    
    if (!window.confirm(`⚠️ WARNING: This will create tables in database "${generatedDb || databaseName}".\n\nContinue?`)) {
      return;
    }
    
    setExecuting(true);
    setExecutionResults(null);
    
    try {
      const res = await api.post('/schema/execute', {
        project_id: parseInt(id),
        entities: schema.entities,
        database_name: databaseName
      });
      
      const results = res.data.results;
      const successCount = results.filter(r => r.status === 'success' && r.table).length;
      const failCount = results.filter(r => r.status === 'failed').length;
      
      setExecutionResults(results);
      
      if (failCount === 0 && successCount > 0) {
        toast.success(`✅ Success! Created ${successCount} table(s) in "${res.data.database}"`);
      } else if (successCount > 0) {
        toast.warning(`⚠️ Partial success: ${successCount} created, ${failCount} failed`);
      } else {
        toast.error(`❌ Failed to create tables. Check console for details.`);
      }
      
      // Check for verification results
      const verification = results.find(r => r.verification);
      if (verification && verification.tables_found) {
        console.log('Tables in database:', verification.tables_found);
      }
      
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  const copyToClipboard = () => {
    const sqlText = sql.join('\n\n');
    navigator.clipboard.writeText(sqlText);
    toast.success('SQL copied to clipboard');
  };

  const downloadSQL = () => {
    const sqlText = sql.join('\n\n');
    const blob = new Blob([sqlText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schema_${generatedDb || databaseName || 'project'}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('SQL file downloaded');
  };

  const resetGenerator = () => {
    setSql([]);
    setGeneratedDb(null);
    setDatabaseName('');
    setExecutionResults(null);
    setActiveTab('sql');
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">SQL Generation & Execution</h1>
      
      {/* Info Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
        <p className="text-sm text-blue-700">
          💡 <strong>How it works:</strong> Enter a database name, and a new MySQL database will be created (or an existing one will be used). 
          All your tables will be created inside that database. You can then manage data in the Data Management section.
        </p>
      </div>

      {/* Schema Summary */}
      {schema && schema.entities && schema.entities.length > 0 && (
        <div className="bg-gray-50 p-4 rounded mb-6">
          <h3 className="font-semibold mb-2">📋 Schema Summary</h3>
          <div className="flex flex-wrap gap-2">
            {schema.entities.map(entity => (
              <div key={entity.name} className="bg-white border rounded px-3 py-1 text-sm">
                <span className="font-medium">{entity.name}</span>
                <span className="text-gray-500 ml-1">({entity.attributes?.length || 0} attributes)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!sql.length ? (
        <button
          onClick={handleGenerateClick}
          disabled={executing}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2"
        >
          {executing ? '⏳ Processing...' : '🚀 Generate SQL'}
        </button>
      ) : (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="border-b flex gap-4">
            <button
              onClick={() => setActiveTab('sql')}
              className={`px-4 py-2 font-medium ${activeTab === 'sql' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            >
              📝 Generated SQL
            </button>
            {executionResults && (
              <button
                onClick={() => setActiveTab('results')}
                className={`px-4 py-2 font-medium ${activeTab === 'results' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              >
                📊 Execution Results
              </button>
            )}
          </div>

          {/* SQL Content */}
          {activeTab === 'sql' && (
            <>
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded flex justify-between items-center">
                <span>✅ SQL generated for database: <strong>{generatedDb || databaseName}</strong></span>
                <div className="flex gap-2">
                  <button onClick={copyToClipboard} className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                    📋 Copy
                  </button>
                  <button onClick={downloadSQL} className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700">
                    💾 Download
                  </button>
                </div>
              </div>
              
              <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto mb-4 max-h-96 font-mono text-sm">
                {sql.join('\n\n')}
              </pre>
              
              <div className="flex gap-3">
                <button
                  onClick={executeSQL}
                  disabled={executing}
                  className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {executing ? '⏳ Executing...' : '✅ Confirm & Execute'}
                </button>
                <button
                  onClick={resetGenerator}
                  className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                >
                  Clear & Start Over
                </button>
              </div>
            </>
          )}

          {/* Execution Results */}
          {activeTab === 'results' && executionResults && (
            <div className="space-y-4">
              <div className="bg-gray-100 p-4 rounded">
                <h3 className="font-bold mb-2">Execution Summary</h3>
                {executionResults.map((result, idx) => {
                  if (result.verification) {
                    return (
                      <div key={idx} className="bg-purple-50 p-3 rounded mb-2">
                        <p className="font-medium">🔍 Verification:</p>
                        <p className="text-sm">Tables found: {result.tables_found?.join(', ') || 'None'}</p>
                      </div>
                    );
                  }
                  return (
                    <div key={idx} className={`p-3 rounded mb-2 ${result.status === 'success' ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{result.status === 'success' ? '✅' : '❌'}</span>
                        <span className="font-medium">Table: {result.table || 'N/A'}</span>
                      </div>
                      <pre className="text-xs mt-1 overflow-x-auto">{result.sql}</pre>
                      {result.error && <p className="text-red-600 text-sm mt-1">Error: {result.error}</p>}
                    </div>
                  );
                })}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/project/${id}/data`)}
                  className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700"
                >
                  📊 Go to Data Management
                </button>
                <button
                  onClick={resetGenerator}
                  className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                >
                  Generate New SQL
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Database Name Modal */}
      {showDbModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Create Database</h2>
            <p className="text-gray-600 mb-4 text-sm">
              Enter a name for your database. All tables will be created inside this database.
              If the database already exists, it will be reused.
            </p>
            
            <label className="block text-sm font-medium text-gray-700 mb-1">Database Name</label>
            <input
              type="text"
              value={databaseName}
              onChange={(e) => setDatabaseName(e.target.value)}
              placeholder="e.g., my_project_db, school_system, ecommerce"
              className="w-full border p-3 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && generateSQL()}
            />
            <p className="text-xs text-gray-500 mb-4">
              Allowed: letters, numbers, underscores. No spaces or special characters.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={generateSQL}
                disabled={!databaseName.trim()}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Generate SQL
              </button>
              <button
                onClick={() => {
                  setShowDbModal(false);
                  setDatabaseName('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {executing && !showDbModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}