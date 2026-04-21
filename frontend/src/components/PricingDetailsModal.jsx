import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const STATUS_OPTIONS = ["Active", "Inactive"];

function normalizeTreePayload(data) {
  if (Array.isArray(data?.tree)) return data.tree;
  if (Array.isArray(data?.children)) return data.children;
  if (Array.isArray(data)) return data;
  return [];
}

function flattenNodes(nodes = [], path = []) {
  return nodes.flatMap((node) => {
    const nodePath = [...path, node.name].filter(Boolean);
    return [
      { ...node, pathLabel: nodePath.join(" > ") },
      ...flattenNodes(node.children || [], nodePath),
    ];
  });
}

function defaultEditForm(node = {}) {
  return {
    name: node.name || "",
    price: node.price ?? "",
    terms: node.terms || "",
    imageUrl: node.imageUrl || "",
    pricingStatus: node.pricingStatus || "Inactive",
  };
}

export default function PricingDetailsModal({
  vendor,
  rootCategoryId,
  apiBaseUrl,
  onClose,
  onVendorUpdated,
}) {
  const vendorId = vendor?._id;
  const [source, setSource] = useState(vendor?.pricingSource === "self_managed" ? "self_managed" : "standard");
  const [standardTree, setStandardTree] = useState([]);
  const [myMenuTree, setMyMenuTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingNode, setEditingNode] = useState(null);
  const [editForm, setEditForm] = useState(defaultEditForm());
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addParent, setAddParent] = useState(null);
  const [addForm, setAddForm] = useState({
    nodeType: "subcategory",
    name: "",
    price: "",
    imageUrl: "",
  });

  const standardRows = useMemo(
    () => flattenNodes(standardTree).filter((node) => node.isLeaf),
    [standardTree]
  );
  const myMenuRows = useMemo(() => flattenNodes(myMenuTree), [myMenuTree]);
  const activeRows = source === "self_managed" ? myMenuRows : standardRows;

  async function loadStandardTree() {
    if (!vendorId || !rootCategoryId) return;

    try {
      await axios.post(`${apiBaseUrl}/api/vendor-price-nodes/add-missing-leaves`, {
        vendorId,
        rootCategoryId,
      });
    } catch {
      // The tree read below is still useful even if backfill has nothing to add.
    }

    const res = await axios.get(`${apiBaseUrl}/api/vendor-price-nodes/tree`, {
      params: { vendorId, rootCategoryId },
    });
    setStandardTree(normalizeTreePayload(res.data));
  }

  async function loadMyMenuTree() {
    if (!vendorId) return;
    const res = await axios.get(`${apiBaseUrl}/api/vendor-menu/${vendorId}/tree`);
    setMyMenuTree(normalizeTreePayload(res.data));
  }

  async function loadPricingDetails() {
    if (!vendorId) return;

    try {
      setLoading(true);
      setError("");
      await Promise.all([loadStandardTree(), loadMyMenuTree()]);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to load pricing details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPricingDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, rootCategoryId]);

  async function switchSource(nextSource) {
    if (nextSource === source || !vendorId) return;

    const label = nextSource === "self_managed" ? "My Menu" : "Standard Menu";
    if (!window.confirm(`Switch this vendor to ${label}?`)) return;

    try {
      setSaving(true);
      const res = await axios.patch(`${apiBaseUrl}/api/vendor-menu/${vendorId}/source`, {
        pricingSource: nextSource,
        menuSourceType: nextSource === "self_managed" ? vendor?.menuSourceType || "manual_upload" : "admin_tree",
      });
      setSource(res.data?.pricingSource || nextSource);
      setEditingNode(null);
      setShowAddPanel(false);
      setAddParent(null);
      onVendorUpdated?.({
        ...(vendor || {}),
        pricingSource: res.data?.pricingSource || nextSource,
        menuSourceType: res.data?.menuSourceType,
        pricingSourceUpdatedAt: res.data?.pricingSourceUpdatedAt,
      });
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Failed to switch pricing source");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(node) {
    setEditingNode(node);
    setEditForm(defaultEditForm(node));
  }

  async function saveEdit() {
    if (!editingNode) return;

    try {
      setSaving(true);
      if (source === "self_managed") {
        await axios.patch(`${apiBaseUrl}/api/vendor-menu/${vendorId}/nodes/${editingNode._id}`, {
          name: editForm.name,
          price: editingNode.isLeaf ? editForm.price : undefined,
          terms: editForm.terms,
          imageUrl: editForm.imageUrl,
          pricingStatus: editForm.pricingStatus,
        });
        await loadMyMenuTree();
      } else {
        await axios.put(`${apiBaseUrl}/api/vendor-price-nodes/update`, {
          vendorPriceNodeId: editingNode._id,
          price: editForm.price === "" ? null : Number(editForm.price),
          terms: editForm.terms,
          pricingStatus: editForm.pricingStatus,
        });
        await loadStandardTree();
      }
      setEditingNode(null);
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Failed to save pricing node");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(node) {
    const nextStatus = node.pricingStatus === "Active" ? "Inactive" : "Active";

    try {
      setSaving(true);
      if (source === "self_managed") {
        await axios.patch(`${apiBaseUrl}/api/vendor-menu/${vendorId}/nodes/${node._id}`, {
          pricingStatus: nextStatus,
        });
        await loadMyMenuTree();
      } else {
        await axios.put(`${apiBaseUrl}/api/vendor-price-nodes/update`, {
          vendorPriceNodeId: node._id,
          pricingStatus: nextStatus,
        });
        await loadStandardTree();
      }
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  function openAdd(parentNode = null) {
    setShowAddPanel(true);
    setAddParent(parentNode);
    setAddForm({
      nodeType: "subcategory",
      name: "",
      price: "",
      imageUrl: "",
    });
  }

  async function saveAdd() {
    if (!addForm.name.trim()) {
      alert("Enter a name");
      return;
    }
    if (addForm.nodeType === "service" && addForm.price === "") {
      alert("Enter a price for service");
      return;
    }

    try {
      setSaving(true);
      await axios.post(`${apiBaseUrl}/api/vendor-menu/${vendorId}/nodes`, {
        parentNodeId: addParent?._id || null,
        nodeType: addForm.nodeType,
        name: addForm.name,
        price: addForm.nodeType === "service" ? addForm.price : undefined,
        imageUrl: addForm.imageUrl,
      });
      await loadMyMenuTree();
      setShowAddPanel(false);
      setAddParent(null);
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Failed to add menu item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Pricing Details</h2>
            <p style={styles.subtitle}>{vendor?.businessName || vendor?.contactName || "Vendor"}</p>
          </div>
          <button style={styles.closeButton} onClick={onClose}>Close</button>
        </div>

        <div style={styles.sourceBar}>
          <button
            style={{ ...styles.sourceButton, ...(source === "standard" ? styles.sourceButtonActive : {}) }}
            disabled={saving}
            onClick={() => switchSource("standard")}
          >
            Standard Menu
          </button>
          <button
            style={{ ...styles.sourceButton, ...(source === "self_managed" ? styles.sourceButtonActive : {}) }}
            disabled={saving}
            onClick={() => switchSource("self_managed")}
          >
            My Menu
          </button>
          {source === "self_managed" ? (
            <button style={styles.primaryButton} disabled={saving} onClick={() => openAdd(null)}>
              Add Top-Level
            </button>
          ) : null}
        </div>

        <div style={styles.note}>
          {source === "standard"
            ? "Standard Menu is admin-managed. Admin can edit price/status on existing service leaves."
            : "My Menu is vendor-owned. Admin can add subcategories/services, edit names/prices/images, and inactivate items."}
        </div>

        {error ? <div style={styles.error}>{error}</div> : null}
        {loading ? <div style={styles.empty}>Loading pricing details...</div> : null}

        {!loading && !activeRows.length ? (
          <div style={styles.empty}>No pricing records found.</div>
        ) : null}

        {!loading && activeRows.length ? (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Path / Name</th>
                  <th style={styles.th}>Price</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeRows.map((node) => (
                  <tr key={node._id}>
                    <td style={styles.td}>{node.isLeaf ? "Service" : "Category"}</td>
                    <td style={styles.td}>{node.pathLabel || node.name}</td>
                    <td style={styles.td}>{node.isLeaf ? `₹${node.price ?? 0}` : "-"}</td>
                    <td style={styles.td}>
                      <span style={node.pricingStatus === "Active" ? styles.activePill : styles.inactivePill}>
                        {node.pricingStatus || "Inactive"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button style={styles.smallButton} onClick={() => openEdit(node)}>Edit</button>
                      <button style={styles.smallButton} onClick={() => toggleStatus(node)}>
                        {node.pricingStatus === "Active" ? "Inactivate" : "Activate"}
                      </button>
                      {source === "self_managed" && !node.isLeaf ? (
                        <button style={styles.smallButton} onClick={() => openAdd(node)}>Add Child</button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {editingNode ? (
          <div style={styles.formPanel}>
            <h3 style={styles.formTitle}>Edit {editingNode.isLeaf ? "Service" : "Category"}</h3>
            {source === "self_managed" ? (
              <label style={styles.label}>
                Name
                <input style={styles.input} value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
              </label>
            ) : null}
            {editingNode.isLeaf ? (
              <label style={styles.label}>
                Price
                <input style={styles.input} type="number" value={editForm.price} onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))} />
              </label>
            ) : null}
            <label style={styles.label}>
              Status
              <select style={styles.input} value={editForm.pricingStatus} onChange={(e) => setEditForm((p) => ({ ...p, pricingStatus: e.target.value }))}>
                {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label style={styles.label}>
              Terms
              <textarea style={styles.textarea} value={editForm.terms} onChange={(e) => setEditForm((p) => ({ ...p, terms: e.target.value }))} />
            </label>
            {source === "self_managed" ? (
              <label style={styles.label}>
                Image URL
                <input style={styles.input} value={editForm.imageUrl} onChange={(e) => setEditForm((p) => ({ ...p, imageUrl: e.target.value }))} />
              </label>
            ) : null}
            <div style={styles.formActions}>
              <button style={styles.secondaryButton} onClick={() => setEditingNode(null)}>Cancel</button>
              <button style={styles.primaryButton} disabled={saving} onClick={saveEdit}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        ) : null}

        {showAddPanel ? (
          <div style={styles.formPanel}>
            <h3 style={styles.formTitle}>Add {addParent ? `under ${addParent.name}` : "top-level item"}</h3>
            <label style={styles.label}>
              Type
              <select style={styles.input} value={addForm.nodeType} onChange={(e) => setAddForm((p) => ({ ...p, nodeType: e.target.value }))}>
                <option value="subcategory">Subcategory</option>
                <option value="service">Service</option>
              </select>
            </label>
            <label style={styles.label}>
              Name
              <input style={styles.input} value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} />
            </label>
            {addForm.nodeType === "service" ? (
              <label style={styles.label}>
                Price
                <input style={styles.input} type="number" value={addForm.price} onChange={(e) => setAddForm((p) => ({ ...p, price: e.target.value }))} />
              </label>
            ) : null}
            <label style={styles.label}>
              Image URL
              <input style={styles.input} value={addForm.imageUrl} onChange={(e) => setAddForm((p) => ({ ...p, imageUrl: e.target.value }))} />
            </label>
            <div style={styles.formActions}>
              <button style={styles.secondaryButton} onClick={() => {
                setShowAddPanel(false);
                setAddParent(null);
              }}>Cancel</button>
              <button style={styles.primaryButton} disabled={saving} onClick={saveAdd}>{saving ? "Saving..." : "Add"}</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modal: {
    width: "min(1180px, 96vw)",
    maxHeight: "92vh",
    overflow: "auto",
    background: "#fff",
    borderRadius: 14,
    padding: 20,
    boxShadow: "0 24px 70px rgba(15, 23, 42, 0.28)",
  },
  header: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" },
  title: { margin: 0, fontSize: 24 },
  subtitle: { margin: "4px 0 0", color: "#64748b" },
  closeButton: { padding: "8px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff" },
  sourceBar: { display: "flex", gap: 10, flexWrap: "wrap", margin: "18px 0 12px" },
  sourceButton: { padding: "9px 14px", borderRadius: 999, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 700 },
  sourceButtonActive: { background: "#111827", color: "#fff", borderColor: "#111827" },
  primaryButton: { padding: "9px 14px", borderRadius: 8, border: 0, background: "#0ea5e9", color: "#fff", fontWeight: 700 },
  secondaryButton: { padding: "9px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 700 },
  smallButton: { marginRight: 6, marginBottom: 4, padding: "5px 9px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff" },
  note: { padding: 10, borderRadius: 10, background: "#f8fafc", color: "#475569", marginBottom: 12 },
  error: { padding: 10, borderRadius: 10, background: "#fee2e2", color: "#991b1b", marginBottom: 12 },
  empty: { padding: 18, color: "#64748b" },
  tableWrap: { overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: 10, background: "#f8fafc", borderBottom: "1px solid #e2e8f0" },
  td: { padding: 10, borderBottom: "1px solid #e2e8f0", verticalAlign: "top" },
  activePill: { display: "inline-block", padding: "3px 8px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontWeight: 700 },
  inactivePill: { display: "inline-block", padding: "3px 8px", borderRadius: 999, background: "#fee2e2", color: "#991b1b", fontWeight: 700 },
  formPanel: { marginTop: 16, padding: 14, border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" },
  formTitle: { margin: "0 0 12px", fontSize: 18 },
  label: { display: "block", marginBottom: 10, fontWeight: 700, color: "#334155" },
  input: { width: "100%", marginTop: 5, padding: 9, border: "1px solid #cbd5e1", borderRadius: 8 },
  textarea: { width: "100%", minHeight: 72, marginTop: 5, padding: 9, border: "1px solid #cbd5e1", borderRadius: 8 },
  formActions: { display: "flex", justifyContent: "flex-end", gap: 10 },
};
