import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function SchemaDesigner() {
  const { id } = useParams();
  const [entities, setEntities] = useState([]);
  const [currentEntity, setCurrentEntity] = useState(null);
  const [newEntityName, setNewEntityName] = useState('');
  const [newAttr, setNewAttr] = useState({
    name: '',
    data_type: 'VARCHAR',
    is_primary_key: false,
    is_not_null: false,
    max_length: ''
  });
  const [loading, setLoading] = useState(false);

  const loadSchema = async () => {
    try {
      const res = await api.get(`/schema/${id}`);
      const def = res.data.definition;
      if (def && def.entities && def.entities.length > 0) {
        setEntities(def.entities);
        setCurrentEntity(def.entities[0]);
      } else {
        setEntities([]);
        setCurrentEntity(null);
      }
    } catch (err) {
      toast.error('Failed to load schema');
    }
  };

  useEffect(() => {
    loadSchema();
  }, [id]);

  const saveSchema = async () => {
    if (entities.length === 0) {
      toast.error('Add at least one entity');
      return;
    }
    for (const entity of entities) {
      if (entity.attributes.length === 0) {
        toast.error(`Entity "${entity.name}" has no attributes`);
        return;
      }
      for (const attr of entity.attributes) {
        if (!attr.data_type) {
          toast.error(`Attribute "${attr.name}" missing data type`);
          return;
        }
        if ((attr.data_type === 'VARCHAR' || attr.data_type === 'CHAR') && !attr.max_length) {
          toast.error(`Attribute "${attr.name}" needs a max length (e.g., 255)`);
          return;
        }
      }
    }
    const cleanedEntities = entities.map(entity => ({
      ...entity,
      attributes: entity.attributes.map(attr => ({
        ...attr,
        max_length: attr.max_length ? parseInt(attr.max_length) : null
      }))
    }));
    setLoading(true);
    try {
      await api.post('/schema/save', {
        project_id: parseInt(id),
        entities: cleanedEntities
      });
      toast.success('Schema saved');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const addEntity = () => {
    if (!newEntityName.trim()) {
      toast.error('Entity name required');
      return;
    }
    if (entities.find(e => e.name === newEntityName)) {
      toast.error('Duplicate entity name');
      return;
    }
    const newEntity = { name: newEntityName, attributes: [] };
    setEntities([...entities, newEntity]);
    setCurrentEntity(newEntity);
    setNewEntityName('');
    toast.success(`Entity "${newEntityName}" added`);
  };

  // Updated deleteEntity with backend API call
  const deleteEntity = async (entityName) => {
    if (!window.confirm(`Delete entity "${entityName}" and its table? This cannot be undone.`)) return;
    try {
      await api.delete(`/schema/entity/${id}/${entityName}`);
      const updated = entities.filter(e => e.name !== entityName);
      setEntities(updated);
      if (currentEntity?.name === entityName) {
        setCurrentEntity(updated.length > 0 ? updated[0] : null);
      }
      toast.success(`Entity "${entityName}" deleted`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  const addAttribute = () => {
    if (!currentEntity) {
      toast.error('Select an entity first');
      return;
    }
    if (!newAttr.name.trim()) {
      toast.error('Attribute name required');
      return;
    }
    if (!newAttr.data_type) {
      toast.error('Data type required');
      return;
    }
    if (currentEntity.attributes.find(a => a.name === newAttr.name)) {
      toast.error('Duplicate attribute name');
      return;
    }
    let finalMaxLength = newAttr.max_length;
    if ((newAttr.data_type === 'VARCHAR' || newAttr.data_type === 'CHAR') && !finalMaxLength) {
      finalMaxLength = 255;
    }
    const newAttribute = {
      name: newAttr.name,
      data_type: newAttr.data_type,
      is_primary_key: newAttr.is_primary_key,
      is_not_null: newAttr.is_not_null,
      max_length: finalMaxLength ? parseInt(finalMaxLength) : null
    };
    const updatedEntities = entities.map(e => {
      if (e.name === currentEntity.name) {
        return { ...e, attributes: [...e.attributes, newAttribute] };
      }
      return e;
    });
    setEntities(updatedEntities);
    setCurrentEntity(updatedEntities.find(e => e.name === currentEntity.name));
    setNewAttr({ name: '', data_type: 'VARCHAR', is_primary_key: false, is_not_null: false, max_length: '' });
    toast.success('Attribute added');
  };

  const removeAttribute = (attrIndex) => {
    if (!currentEntity) return;
    const updatedAttributes = currentEntity.attributes.filter((_, i) => i !== attrIndex);
    const updatedEntities = entities.map(e =>
      e.name === currentEntity.name ? { ...e, attributes: updatedAttributes } : e
    );
    setEntities(updatedEntities);
    setCurrentEntity(updatedEntities.find(e => e.name === currentEntity.name));
    toast.success('Attribute removed');
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Schema Designer</h1>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Left Panel */}
        <div className="md:w-80 bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-3">Entities</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newEntityName}
              onChange={e => setNewEntityName(e.target.value)}
              placeholder="Entity name"
              className="border p-2 flex-1 rounded"
              onKeyPress={e => e.key === 'Enter' && addEntity()}
            />
            <button onClick={addEntity} className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700">
              Add
            </button>
          </div>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {entities.map(e => (
              <div key={e.name} className={`flex justify-between items-center p-2 rounded cursor-pointer ${currentEntity?.name === e.name ? 'bg-blue-100 border border-blue-400' : 'hover:bg-gray-100'}`}>
                <span onClick={() => setCurrentEntity(e)} className="flex-1">{e.name}</span>
                <button onClick={() => deleteEntity(e.name)} className="text-red-600 hover:text-red-800 text-sm ml-2">🗑️</button>
              </div>
            ))}
            {entities.length === 0 && <p className="text-gray-500 text-sm">No entities. Add one above.</p>}
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 bg-white p-4 rounded shadow">
          {currentEntity ? (
            <>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold">Entity: {currentEntity.name}</h2>
                <span className="text-sm text-gray-500">{currentEntity.attributes.length} attribute(s)</span>
              </div>
              <div className="mb-6 overflow-x-auto">
                <h3 className="font-medium mb-2">Attributes</h3>
                {currentEntity.attributes.length === 0 ? (
                  <p className="text-gray-500 text-sm">No attributes yet. Add one below.</p>
                ) : (
                  <table className="w-full border text-sm min-w-[500px]">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border p-2 text-left">Name</th>
                        <th className="border p-2 text-left">Data Type</th>
                        <th className="border p-2 text-center">PK</th>
                        <th className="border p-2 text-center">NOT NULL</th>
                        <th className="border p-2 text-left">Max Length</th>
                        <th className="border p-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentEntity.attributes.map((attr, idx) => (
                        <tr key={idx}>
                          <td className="border p-2">{attr.name}</td>
                          <td className="border p-2">{attr.data_type}</td>
                          <td className="border p-2 text-center">{attr.is_primary_key ? '✅' : ''}</td>
                          <td className="border p-2 text-center">{attr.is_not_null ? '✅' : ''}</td>
                          <td className="border p-2">{attr.max_length || '-'}</td>
                          <td className="border p-2 text-center">
                            <button onClick={() => removeAttribute(idx)} className="text-red-600 hover:text-red-800">Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Add New Attribute</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <input type="text" placeholder="Attribute name" value={newAttr.name} onChange={e => setNewAttr({...newAttr, name: e.target.value})} className="border p-2 rounded" />
                  <select value={newAttr.data_type} onChange={e => setNewAttr({...newAttr, data_type: e.target.value})} className="border p-2 rounded">
                    <option value="VARCHAR">VARCHAR</option><option value="INT">INT</option><option value="DATE">DATE</option>
                    <option value="BOOLEAN">BOOLEAN</option><option value="TEXT">TEXT</option><option value="DECIMAL">DECIMAL</option>
                  </select>
                  <input type="number" placeholder="Max length (for VARCHAR)" value={newAttr.max_length} onChange={e => setNewAttr({...newAttr, max_length: e.target.value})} className="border p-2 rounded" />
                </div>
                <div className="flex flex-wrap gap-4 mt-3 items-center">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={newAttr.is_primary_key} onChange={e => setNewAttr({...newAttr, is_primary_key: e.target.checked})} /> Primary Key</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={newAttr.is_not_null} onChange={e => setNewAttr({...newAttr, is_not_null: e.target.checked})} /> NOT NULL</label>
                  <button onClick={addAttribute} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">+ Add Attribute</button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">Select an entity from the left or create a new one.</p>
          )}
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button onClick={saveSchema} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Saving...' : '💾 Save Schema'}
        </button>
      </div>
    </div>
  );
}