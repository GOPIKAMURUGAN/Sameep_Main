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
    const normalizedId = node._id || node.id || node.categoryId || "";
    return [
      {
        ...node,
        _id: normalizedId,
        id: node.id || normalizedId,
        pathLabel: nodePath.join(" > "),
      },
      ...flattenNodes(node.children || [], nodePath),
    ];
  });
}

function getNodeId(node = {}) {
  return node._id || node.id || node.categoryId || "";
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
  const [showEditImageLibrary, setShowEditImageLibrary] = useState(false);
  const [editImageLibrarySearch, setEditImageLibrarySearch] = useState("");
  const [editImageLibraryItems, setEditImageLibraryItems] = useState([]);
  const [loadingEditImageLibrary, setLoadingEditImageLibrary] = useState(false);
  const [editImageLibraryError, setEditImageLibraryError] = useState("");
  const [uploadingEditImage, setUploadingEditImage] = useState(false);

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
    setShowAddPanel(false);
    setAddParent(null);
    setEditingNode(node);
    setEditForm(defaultEditForm(node));
    setShowEditImageLibrary(false);
    setEditImageLibrarySearch(node?.name || "");
    setEditImageLibraryItems([]);
    setEditImageLibraryError("");
  }

  async function uploadImageAndGetUrl(file) {
    if (!file || !vendorId) throw new Error("File or vendor missing");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folderType", "newvendor");
    formData.append("hierarchy", JSON.stringify([
      "admin-pricing",
      String(vendorId),
      `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ]));

    const response = await fetch(`${apiBaseUrl}/api/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || data?.error || "Upload failed");
    }

    return data?.url || "";
  }

  async function handleUploadEditImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setUploadingEditImage(true);
      const url = await uploadImageAndGetUrl(file);
      const cacheBustedUrl = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
      setEditForm((prev) => ({ ...prev, imageUrl: cacheBustedUrl }));
    } catch (err) {
      alert(err.message || "Failed to upload image");
    } finally {
      setUploadingEditImage(false);
    }
  }

  async function loadEditImageLibrary(searchText = editImageLibrarySearch) {
    if (!rootCategoryId) {
      setEditImageLibraryError("Root category is missing");
      return;
    }

    try {
      setLoadingEditImageLibrary(true);
      setEditImageLibraryError("");
      const params = new URLSearchParams({ rootCategoryId: String(rootCategoryId) });
      const query = String(searchText || "").trim();
      if (query) params.set("q", query);

      const response = await axios.get(`${apiBaseUrl}/api/menu-image-library?${params.toString()}`);
      setEditImageLibraryItems(Array.isArray(response.data?.items) ? response.data.items : []);
    } catch (err) {
      setEditImageLibraryItems([]);
      setEditImageLibraryError(err?.response?.data?.message || err.message || "Failed to load image library");
    } finally {
      setLoadingEditImageLibrary(false);
    }
  }

  function toggleEditImageLibrary() {
    const nextVisible = !showEditImageLibrary;
    setShowEditImageLibrary(nextVisible);
    if (nextVisible && editImageLibraryItems.length === 0) {
      loadEditImageLibrary(editImageLibrarySearch || editForm.name);
    }
  }

  useEffect(() => {
    if (!editingNode || !showEditImageLibrary) return;

    const timer = setTimeout(() => {
      loadEditImageLibrary(editImageLibrarySearch);
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editImageLibrarySearch, showEditImageLibrary, editingNode]);

  async function saveEdit() {
    if (!editingNode) return;
    const nodeId = getNodeId(editingNode);

    try {
      setSaving(true);
      if (source === "self_managed") {
        await axios.patch(`${apiBaseUrl}/api/vendor-menu/${vendorId}/nodes/${nodeId}`, {
          name: editForm.name,
          price: editingNode.isLeaf ? editForm.price : undefined,
          terms: editForm.terms,
          imageUrl: editForm.imageUrl,
          pricingStatus: editForm.pricingStatus,
        });
        await loadMyMenuTree();
      } else {
        await axios.put(`${apiBaseUrl}/api/vendor-price-nodes/update`, {
          vendorPriceNodeId: nodeId,
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
    const nodeId = getNodeId(node);

    try {
      setSaving(true);
      if (source === "self_managed") {
        await axios.patch(`${apiBaseUrl}/api/vendor-menu/${vendorId}/nodes/${nodeId}`, {
          pricingStatus: nextStatus,
        });
        await loadMyMenuTree();
      } else {
        await axios.put(`${apiBaseUrl}/api/vendor-price-nodes/update`, {
          vendorPriceNodeId: nodeId,
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
    setEditingNode(null);
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
        parentNodeId: getNodeId(addParent) || null,
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

        {editingNode ? (
          <div style={styles.nestedOverlay} onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditingNode(null);
          }}>
            <div style={styles.editModal}>
              <div style={styles.editModalHeader}>
                <div>
                  <h3 style={styles.formTitle}>Edit {editingNode.isLeaf ? "Service" : "Category"}</h3>
                  <p style={styles.formHint}>{editingNode.pathLabel || editingNode.name}</p>
                </div>
                <button type="button" style={styles.closeButton} onClick={() => setEditingNode(null)}>Close</button>
              </div>
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
              <div style={styles.imageTools}>
                <label style={styles.label}>
                  Image URL
                  <input style={styles.input} value={editForm.imageUrl} onChange={(e) => setEditForm((p) => ({ ...p, imageUrl: e.target.value }))} />
                </label>
                <div style={styles.imageActions}>
                  <button type="button" style={styles.secondaryButton} onClick={toggleEditImageLibrary}>
                    {showEditImageLibrary ? "Hide Library" : "Choose from Library"}
                  </button>
                  <label style={{
                    ...styles.secondaryButton,
                    ...(showEditImageLibrary ? styles.disabledButton : {}),
                    cursor: showEditImageLibrary ? "not-allowed" : "pointer",
                  }}>
                    {showEditImageLibrary ? "Upload Disabled" : uploadingEditImage ? "Uploading..." : "Upload Image"}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      disabled={showEditImageLibrary || uploadingEditImage}
                      onChange={handleUploadEditImage}
                    />
                  </label>
                </div>
                {editForm.imageUrl ? (
                  <div style={styles.imagePreviewRow}>
                    <img style={styles.imagePreview} src={editForm.imageUrl} alt={editForm.name || "Selected preview"} />
                    <span style={styles.imagePreviewText}>Selected image preview</span>
                  </div>
                ) : null}
                {showEditImageLibrary ? (
                  <div style={styles.libraryPanel}>
                    <div style={styles.librarySearchRow}>
                      <input
                        style={styles.input}
                        value={editImageLibrarySearch}
                        onChange={(e) => setEditImageLibrarySearch(e.target.value)}
                        placeholder="Search hair cut, shampoo, facial, bridal..."
                      />
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        disabled={loadingEditImageLibrary}
                        onClick={() => loadEditImageLibrary(editImageLibrarySearch)}
                      >
                        {loadingEditImageLibrary ? "Searching..." : "Refresh"}
                      </button>
                    </div>
                    {editImageLibraryError ? (
                      <div style={styles.libraryError}>{editImageLibraryError}</div>
                    ) : null}
                    {!editImageLibraryError && !loadingEditImageLibrary && editImageLibraryItems.length === 0 ? (
                      <div style={styles.libraryEmpty}>No matching images found. Try broader words like hair, makeup, facial, or bridal.</div>
                    ) : null}
                    <div style={styles.libraryGrid}>
                      {editImageLibraryItems.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          style={{
                            ...styles.libraryCard,
                            ...(editForm.imageUrl === item.imageUrl ? styles.libraryCardSelected : {}),
                          }}
                          onClick={() => setEditForm((prev) => ({ ...prev, imageUrl: item.imageUrl }))}
                        >
                          <img style={styles.libraryImage} src={item.imageUrl} alt={item.name} />
                          <span style={styles.libraryName}>{item.name}</span>
                          <span style={styles.libraryPath}>{item.pathLabel}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div style={styles.formActions}>
              <button type="button" style={styles.secondaryButton} onClick={() => setEditingNode(null)}>Cancel</button>
              <button type="button" style={styles.primaryButton} disabled={saving} onClick={saveEdit}>{saving ? "Saving..." : "Save"}</button>
            </div>
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
              <button type="button" style={styles.secondaryButton} onClick={() => {
                setShowAddPanel(false);
                setAddParent(null);
              }}>Cancel</button>
              <button type="button" style={styles.primaryButton} disabled={saving} onClick={saveAdd}>{saving ? "Saving..." : "Add"}</button>
            </div>
          </div>
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
                  <tr key={getNodeId(node) || node.pathLabel}>
                    <td style={styles.td}>{node.isLeaf ? "Service" : "Category"}</td>
                    <td style={styles.td}>{node.pathLabel || node.name}</td>
                    <td style={styles.td}>{node.isLeaf ? `₹${node.price ?? 0}` : "-"}</td>
                    <td style={styles.td}>
                      <span style={node.pricingStatus === "Active" ? styles.activePill : styles.inactivePill}>
                        {node.pricingStatus || "Inactive"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button type="button" style={styles.smallButton} disabled={saving} onClick={() => openEdit(node)}>Edit</button>
                      <button type="button" style={styles.smallButton} disabled={saving} onClick={() => toggleStatus(node)}>
                        {node.pricingStatus === "Active" ? "Inactivate" : "Activate"}
                      </button>
                      {source === "self_managed" && !node.isLeaf ? (
                        <button type="button" style={styles.smallButton} disabled={saving} onClick={() => openAdd(node)}>Add Child</button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  smallButton: { marginRight: 6, marginBottom: 4, padding: "5px 9px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" },
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
  nestedOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1100,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  editModal: {
    width: "min(760px, 94vw)",
    maxHeight: "88vh",
    overflowY: "auto",
    padding: 18,
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    background: "#fff",
    boxShadow: "0 24px 70px rgba(15, 23, 42, 0.3)",
  },
  editModalHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 8 },
  formTitle: { margin: "0 0 12px", fontSize: 18 },
  formHint: { margin: "-6px 0 12px", color: "#64748b", fontSize: 13 },
  label: { display: "block", marginBottom: 10, fontWeight: 700, color: "#334155" },
  input: { width: "100%", marginTop: 5, padding: 9, border: "1px solid #cbd5e1", borderRadius: 8 },
  textarea: { width: "100%", minHeight: 72, marginTop: 5, padding: 9, border: "1px solid #cbd5e1", borderRadius: 8 },
  formActions: { display: "flex", justifyContent: "flex-end", gap: 10 },
  imageTools: { marginBottom: 10 },
  imageActions: { display: "flex", gap: 10, flexWrap: "wrap", margin: "8px 0 10px" },
  disabledButton: { opacity: 0.55 },
  imagePreviewRow: { display: "flex", alignItems: "center", gap: 10, margin: "8px 0 10px" },
  imagePreview: { width: 78, height: 78, objectFit: "cover", borderRadius: 10, border: "1px solid #cbd5e1" },
  imagePreviewText: { color: "#64748b", fontSize: 13 },
  libraryPanel: { marginTop: 10, padding: 12, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" },
  librarySearchRow: { display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" },
  libraryError: { marginTop: 10, padding: 10, borderRadius: 8, background: "#fee2e2", color: "#991b1b" },
  libraryEmpty: { marginTop: 10, padding: 10, borderRadius: 8, background: "#f8fafc", color: "#64748b" },
  libraryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, maxHeight: 260, overflowY: "auto", marginTop: 12 },
  libraryCard: { display: "flex", flexDirection: "column", gap: 6, padding: 8, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", textAlign: "left", cursor: "pointer" },
  libraryCardSelected: { borderColor: "#0ea5e9", boxShadow: "0 0 0 2px rgba(14, 165, 233, 0.15)" },
  libraryImage: { width: "100%", height: 86, objectFit: "cover", borderRadius: 8 },
  libraryName: { fontWeight: 800, color: "#0f172a", fontSize: 13 },
  libraryPath: { color: "#64748b", fontSize: 11, lineHeight: 1.3 },
};
