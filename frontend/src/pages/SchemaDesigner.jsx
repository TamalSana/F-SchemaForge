import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function SchemaDesigner() {
  const { id } = useParams();
  const [entities, setEntities] = useState([]);
  const [currentEntity, setCurrentEntity] = useState(null);
  const [newEntityName, setNewEntityName] = useState('');
  const [newAttr, setNewAttr] = useState({ name: '', data_type: 'VARCHAR', is_primary_key: false, is_not_null: false, max_length: '' });

  const loadSchema = async () => {
    try {
      const res = await api.get(`/schema/${id}`);
      const def = res.data.definition;
      if (def && def.entities) setEntities(def.entities);
      else setEntities([]);
    } catch (err) {
      toast.error('Failed to load schema');
    }
  };

  useEffect(() => { loadSchema(); }, [id]);

  const saveSchema = async () => {
    try {
      await api.post('/schema/save', { project_id: parseInt(id), entities });
      toast.success('Schema saved');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    }
  };

  const addEntity = () => {
    if (!newEntityName.trim()) return toast.error('Entity name required');
    if (entities.find(e => e.name === newEntityName)) return toast.error('Duplicate entity name');
    setEntities([...entities, { name: newEntityName, attributes: [] }]);
    setNewEntityName('');
  };

  const addAttribute = () => {
    if (!newAttr.name) return toast.error('Attribute name required');
    if (!newAttr.data_type) return toast.error('Data type required');
    const updated = entities.map(e => {
      if (e.name === currentEntity.name) {
        return { ...e, attributes: [...e.attributes, { ...newAttr, max_length: newAttr.max_length ? parseInt(newAttr.max_length) : null }] };
      }
      return e;
    });
    setEntities(updated);
    setNewAttr({ name: '', data_type: 'VARCHAR', is_primary_key: false, is_not_null: false, max_length: '' });
  };

  const removeAttribute = (entityName, attrIndex) => {
    const updated = entities.map(e => {
      if (e.name === entityName) {
        const newAttrs = [...e.attributes];
        newAttrs.splice(attrIndex, 1);
        return { ...e, attributes: newAttrs };
      }
      return e;
    });
    setEntities(updated);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Schema Designer</h1>
      <div className="flex gap-4">
        <div className="w-1/3 bg-white p-4 rounded shadow">
          <h2 className="text-xl mb-2">Entities</h2>
          <div className="flex gap-2 mb-4">
            <input type="text" value={newEntityName} onChange={e => setNewEntityName(e.target.value)} placeholder="Entity name" className="border p-1 flex-1 rounded" />
            <button onClick={addEntity} className="bg-blue-500 text-white px-3 py-1 rounded">Add</button>
          </div>
          <ul>
            {entities.map(e => (
              <li key={e.name} className={`p-2 cursor-pointer ${currentEntity?.name === e.name ? 'bg-blue-100' : 'hover:bg-gray-100'}`} onClick={() => setCurrentEntity(e)}>
                {e.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 bg-white p-4 rounded shadow">
          {currentEntity ? (
            <>
              <h2 className="text-xl mb-2">Entity: {currentEntity.name}</h2>
              <div className="mb-4">
                <h3>Attributes</h3>
                <table className="w-full border mt-2">
                  <thead><tr><th>Name</th><th>Type</th><th>PK</th><th>NOT NULL</th><th>Length</th><th></th></tr></thead>
                  <tbody>
                    {currentEntity.attributes.map((attr, idx) => (
                      <tr key={idx}>
                        <td>{attr.name}</td><td>{attr.data_type}</td><td>{attr.is_primary_key ? 'Yes' : ''}</td><td>{attr.is_not_null ? 'Yes' : ''}</td><td>{attr.max_length || ''}</td>
                        <td><button onClick={() => removeAttribute(currentEntity.name, idx)} className="text-red-600">X</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t pt-4">
                <h3>Add Attribute</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Name" value={newAttr.name} onChange={e => setNewAttr({...newAttr, name: e.target.value})} className="border p-1 rounded" />
                  <select value={newAttr.data_type} onChange={e => setNewAttr({...newAttr, data_type: e.target.value})} className="border p-1 rounded">
                    <option>VARCHAR</option><option>INT</option><option>DATE</option><option>BOOLEAN</option><option>TEXT</option>
                  </select>
                  <label><input type="checkbox" checked={newAttr.is_primary_key} onChange={e => setNewAttr({...newAttr, is_primary_key: e.target.checked})} /> Primary Key</label>
                  <label><input type="checkbox" checked={newAttr.is_not_null} onChange={e => setNewAttr({...newAttr, is_not_null: e.target.checked})} /> NOT NULL</label>
                  <input type="number" placeholder="Max Length (for VARCHAR)" value={newAttr.max_length} onChange={e => setNewAttr({...newAttr, max_length: e.target.value})} className="border p-1 rounded" />
                  <button onClick={addAttribute} className="bg-green-500 text-white px-3 py-1 rounded">Add</button>
                </div>
              </div>
            </>
          ) : <p>Select an entity</p>}
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={saveSchema} className="bg-blue-600 text-white px-4 py-2 rounded">Save Schema</button>
      </div>
    </div>
  );
}