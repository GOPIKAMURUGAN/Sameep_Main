import React, { useState, useEffect } from "react";
import axios from "axios";

function BrandCard({ brand, onEdit, onDelete }) {
  const imageSrc = brand.imageUrl
    ? brand.imageUrl.startsWith("http")
      ? brand.imageUrl
      : `http://localhost:5000${brand.imageUrl}`
    : null;

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: "#fff",
        position: "relative",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        minHeight: 100,
      }}
    >
      <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
        <span style={{ cursor: "pointer", color: "#00AEEF" }} onClick={() => onEdit(brand)}>✏️</span>
        <span style={{ cursor: "pointer", color: "red" }} onClick={() => onDelete(brand)}>🗑️</span>
      </div>
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={brand.name}
          style={{ width: 100, height: 100, objectFit: "contain", borderRadius: 12 }}
        />
      ) : (
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 12,
            background: "#ccc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            color: "#fff",
          }}
        >
          ?
        </div>
      )}
      <h4 style={{ margin: 0 }}>{brand.name}</h4>
    </div>
  );
}

export default function TempoBusBrandPage() {
  const [brands, setBrands] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editBrand, setEditBrand] = useState(null);
  const [form, setForm] = useState({ name: "", file: null, preview: null });

  const fetchBrands = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/masters?type=tempoBusBrand");
      setBrands(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchBrands(); }, []);

  const handleSave = async () => {
    if (!form.name) return alert("Enter brand name");
    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("type", "tempoBusBrand");
    if (form.file) formData.append("image", form.file);

    try {
      if (editBrand) {
        await axios.put(`http://localhost:5000/api/masters/${editBrand._id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await axios.post("http://localhost:5000/api/masters", formData, { headers: { "Content-Type": "multipart/form-data" } });
      }
      setShowModal(false);
      setEditBrand(null);
      setForm({ name: "", file: null, preview: null });
      fetchBrands();
    } catch (err) { console.error(err); }
  };

  const handleEdit = (brand) => {
    setEditBrand(brand);
    setForm({
      name: brand.name,
      file: null,
      preview: brand.imageUrl ? (brand.imageUrl.startsWith("http") ? brand.imageUrl : `http://localhost:5000${brand.imageUrl}`) : null,
    });
    setShowModal(true);
  };

  const handleDelete = async (brand) => {
    if (!window.confirm("Delete this brand?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/masters/${brand._id}`);
      fetchBrands();
    } catch (err) { console.error(err); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setForm({ ...form, file, preview: URL.createObjectURL(file) });
  };

  return (
    <div style={{ padding: 30 }}>
      <h2 style={{ color: "#00AEEF" }}>Tempo Mini Bus Brands</h2>
      <button
        onClick={() => { setShowModal(true); setEditBrand(null); setForm({ name: "", file: null, preview: null }); }}
        style={{ marginBottom: 20, background: "#00AEEF", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer" }}
      >
        + Add Brand
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
        {brands.map((b) => <BrandCard key={b._id} brand={b} onEdit={handleEdit} onDelete={handleDelete} />)}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", padding: 30, borderRadius: 12, width: 400 }}>
            <h3>{editBrand ? "Edit Brand" : "Add Brand"}</h3>
            <input type="text" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: "100%", padding: 8, marginBottom: 10, borderRadius: 6, border: "1px solid #ccc" }} />
            <input type="file" onChange={handleFileChange} style={{ marginBottom: 10 }} />
            {form.preview && <img src={form.preview} alt="preview" style={{ width: 100, height: 100, objectFit: "contain", marginBottom: 10, borderRadius: 12 }} />}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => { setShowModal(false); setEditBrand(null); setForm({ name: "", file: null, preview: null }); }} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #ccc", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#00AEEF", color: "#fff", cursor: "pointer" }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
