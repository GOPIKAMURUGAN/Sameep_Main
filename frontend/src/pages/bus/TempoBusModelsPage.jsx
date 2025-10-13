import { useState, useEffect } from "react";
import axios from "axios";

export default function TempoBusModelsPage() {
  const [models, setModels] = useState([]);
  const [brands, setBrands] = useState([]);
  const [bodyTypes, setBodyTypes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  // Fetch data
  const fetchData = async () => {
    try {
      const [modelsRes, brandsRes, bodyTypesRes] = await Promise.all([
        axios.get("http://localhost:5000/api/models?category=tempoBus"),
        axios.get("http://localhost:5000/api/masters", { params: { type: "tempoBusBrand" } }),
        axios.get("http://localhost:5000/api/masters", { params: { type: "tempoBusBodyType" } }),
      ]);
      setModels(modelsRes.data);
      setBrands(brandsRes.data);
      setBodyTypes(bodyTypesRes.data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch models, brands, or body types");
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Save / Update
  const handleSave = async (data) => {
    if (!data.brand || !data.model) {
      alert("Brand and Model are required");
      return;
    }
    const payload = {
      category: "tempoBus",
      brand: data.brand,
      bodyType: data.bodyType || "",
      model: data.model,
      variant: data.variant || "",
      seats: data.seats || 0,
    };
    try {
      if (data._id) await axios.put(`http://localhost:5000/api/models/${data._id}`, payload);
      else await axios.post("http://localhost:5000/api/models", payload);

      fetchData();
      setShowModal(false);
      setEditing(null);
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert("Failed to save model");
    }
  };

  // Delete
  const handleDelete = async (model) => {
    if (!window.confirm("Delete this model?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/models/${model._id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete model");
    }
  };

  // Modal Component inside same file
  const ModelModal = ({ show, onClose, onSave, brands, bodyTypes, initialData }) => {
    const [form, setForm] = useState({
      brand: "",
      bodyType: "",
      model: "",
      variant: "",
      seats: "",
      _id: null,
      ...initialData,
    });

    useEffect(() => { setForm({ brand: "", bodyType: "", model: "", variant: "", seats: "", _id: null, ...initialData }); }, [initialData]);

    if (!show) return null;

    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center"
      }}>
        <div style={{ background: "#fff", padding: 20, borderRadius: 8, width: 400 }}>
          <h3>{form._id ? "Edit Model" : "Add Model"}</h3>

          <label>Brand</label>
          <select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} style={{ width: "100%", padding: 8, marginBottom: 10 }}>
            <option value="">Select Brand</option>
            {brands.map((b) => <option key={b._id} value={b.name}>{b.name}</option>)}
          </select>

          <label>Body Type</label>
          <select value={form.bodyType} onChange={(e) => setForm({ ...form, bodyType: e.target.value })} style={{ width: "100%", padding: 8, marginBottom: 10 }}>
            <option value="">Select Body Type</option>
            {bodyTypes.map((b) => <option key={b._id} value={b.name}>{b.name}</option>)}
          </select>

          <label>Model</label>
          <input type="text" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} style={{ width: "100%", padding: 8, marginBottom: 10 }} />

          <label>Variant</label>
          <input type="text" value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })} style={{ width: "100%", padding: 8, marginBottom: 10 }} />

          <label>Seats</label>
          <input type="number" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} style={{ width: "100%", padding: 8, marginBottom: 10 }} />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={onClose} style={{ padding: "6px 12px" }}>Cancel</button>
            <button onClick={() => onSave(form)} style={{ padding: "6px 12px", background: "#00AEEF", color: "#fff", border: "none", borderRadius: 4 }}>
              Save
            </button>
          </div>
        </div>
      </div>
    );
  };

  // UI
  return (
    <div style={{ padding: 30 }}>
      <h2 style={{ color: "#00AEEF" }}>Tempo Mini Bus Models</h2>
      <button onClick={() => { setEditing(null); setShowModal(true); }} style={{ marginBottom: 20, background: "#00AEEF", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer" }}>+ Add Model</button>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ background: "#00AEEF", color: "#fff", textAlign: "left" }}>
            <th style={{ padding: 10 }}>Brand</th>
            <th style={{ padding: 10 }}>Body Type</th>
            <th style={{ padding: 10 }}>Seats</th>
            <th style={{ padding: 10 }}>Model</th>
            <th style={{ padding: 10 }}>Variant</th>
            <th style={{ padding: 10, textAlign: "center" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m, i) => (
            <tr key={m._id} style={{ borderBottom: "1px solid #ccc", background: i % 2 === 0 ? "#f9f9f9" : "#fff" }}>
              <td style={{ padding: 10 }}>{m.brand}</td>
              <td style={{ padding: 10 }}>{m.bodyType}</td>
              <td style={{ padding: 10 }}>{m.seats}</td>
              <td style={{ padding: 10 }}>{m.model}</td>
              <td style={{ padding: 10 }}>{m.variant}</td>
              <td style={{ padding: 10, textAlign: "center" }}>
                <button onClick={() => { setEditing(m); setShowModal(true); }} style={{ border: "none", borderRadius: 5, padding: "4px 8px", cursor: "pointer", marginRight: 6 }}>✏️</button>
                <button onClick={() => handleDelete(m)} style={{ color: "#fff", border: "none", borderRadius: 5, padding: "4px 8px", cursor: "pointer", background: "#dc3545" }}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ModelModal show={showModal} onClose={() => setShowModal(false)} onSave={handleSave} brands={brands} bodyTypes={bodyTypes} initialData={editing} />
    </div>
  );
}
