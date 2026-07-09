import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { getToken } from "../utils/adminAuth";

const STATUS_OPTIONS = ["Active", "Inactive"];

function adminRequestConfig(config = {}) {
  const token = getToken();
  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
}

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

function detectSystemLabel(apiBaseUrl = "") {
  const normalized = String(apiBaseUrl || "").toLowerCase();
  if (!normalized) return "localhost";
  if (normalized.includes("localhost") || normalized.includes("127.0.0.1")) return "localhost";
  if (normalized.includes("staging")) return "staging";
  if (normalized.includes("dev")) return "development";
  if (normalized.includes("ynot.co.in") || normalized.includes("amplifyapp.com") || normalized.includes("go-kar.net")) {
    return "production";
  }
  return "custom";
}

function collectTreeNodeIds(nodes = []) {
  const ids = [];
  nodes.forEach((node) => {
    if (node?.id) ids.push(String(node.id));
    ids.push(...collectTreeNodeIds(node?.children || []));
  });
  return ids;
}

function buildFullySelectedMap(nodes = []) {
  return collectTreeNodeIds(nodes).reduce((acc, id) => {
    acc[id] = true;
    return acc;
  }, {});
}

function collectNodeAndDescendantIds(node) {
  if (!node) return [];
  return [String(node.id), ...collectTreeNodeIds(node.children || [])];
}

function countSelectedTreeNodes(nodes = [], selectionMap = {}) {
  return collectTreeNodeIds(nodes).filter((id) => selectionMap[id]).length;
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
  const [showCopyPanel, setShowCopyPanel] = useState(false);
  const [copySourceType, setCopySourceType] = useState("vendor");
  const [copySourceSystem, setCopySourceSystem] = useState("localhost");
  const [copySourceQuery, setCopySourceQuery] = useState("");
  const [copyMode, setCopyMode] = useState("replace_archive");
  const [copySearchLoading, setCopySearchLoading] = useState(false);
  const [copySearchError, setCopySearchError] = useState("");
  const [copySearchResults, setCopySearchResults] = useState([]);
  const [copySelectedSourceItem, setCopySelectedSourceItem] = useState(null);
  const [copyPreviewLoading, setCopyPreviewLoading] = useState(false);
  const [copyPreviewError, setCopyPreviewError] = useState("");
  const [copyPreviewData, setCopyPreviewData] = useState(null);
  const [copySelectionMap, setCopySelectionMap] = useState({});
  const [copyDestinationNodeId, setCopyDestinationNodeId] = useState("");
  const [copyExecuting, setCopyExecuting] = useState(false);

  const standardRows = useMemo(
    () => flattenNodes(standardTree).filter((node) => node.isLeaf),
    [standardTree]
  );
  const myMenuRows = useMemo(() => flattenNodes(myMenuTree), [myMenuTree]);
  const activeRows = source === "self_managed" ? myMenuRows : standardRows;
  const targetSystemLabel = useMemo(() => detectSystemLabel(apiBaseUrl), [apiBaseUrl]);
  const targetVendorLabel = vendor?.businessName || vendor?.contactName || "Selected vendor";
  const targetMenuSummary = useMemo(() => {
    const topLevelCount = myMenuTree.length;
    const totalNodes = myMenuRows.length;
    const totalServices = myMenuRows.filter((node) => node.isLeaf).length;
    return { topLevelCount, totalNodes, totalServices };
  }, [myMenuRows, myMenuTree]);
  const destinationNodeOptions = useMemo(
    () => flattenNodes(myMenuTree).filter((node) => !node.isLeaf),
    [myMenuTree]
  );
  const selectedDestinationNode = useMemo(
    () => destinationNodeOptions.find((node) => getNodeId(node) === copyDestinationNodeId) || null,
    [copyDestinationNodeId, destinationNodeOptions]
  );
  const previewTree = copyPreviewData?.tree || [];
  const previewTotalSelectable = useMemo(() => collectTreeNodeIds(previewTree).length, [previewTree]);
  const previewSelectedCount = useMemo(
    () => countSelectedTreeNodes(previewTree, copySelectionMap),
    [previewTree, copySelectionMap]
  );

  async function loadStandardTree() {
    if (!vendorId || !rootCategoryId) return;

    try {
      await axios.post(
        `${apiBaseUrl}/api/vendor-price-nodes/add-missing-leaves`,
        {
          vendorId,
          rootCategoryId,
        },
        adminRequestConfig()
      );
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
      const res = await axios.patch(
        `${apiBaseUrl}/api/vendor-menu/${vendorId}/source`,
        {
          pricingSource: nextSource,
          menuSourceType: nextSource === "self_managed" ? vendor?.menuSourceType || "manual_upload" : "admin_tree",
        },
        adminRequestConfig()
      );
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
        await axios.patch(
          `${apiBaseUrl}/api/vendor-menu/${vendorId}/nodes/${nodeId}`,
          {
            name: editForm.name,
            price: editingNode.isLeaf ? editForm.price : undefined,
            terms: editForm.terms,
            imageUrl: editForm.imageUrl,
            pricingStatus: editForm.pricingStatus,
          },
          adminRequestConfig()
        );
        await loadMyMenuTree();
      } else {
        await axios.put(
          `${apiBaseUrl}/api/vendor-price-nodes/update`,
          {
            vendorPriceNodeId: nodeId,
            price: editForm.price === "" ? null : Number(editForm.price),
            terms: editForm.terms,
            imageUrl: editForm.imageUrl,
            pricingStatus: editForm.pricingStatus,
          },
          adminRequestConfig()
        );
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
        await axios.patch(
          `${apiBaseUrl}/api/vendor-menu/${vendorId}/nodes/${nodeId}`,
          {
            pricingStatus: nextStatus,
          },
          adminRequestConfig()
        );
        await loadMyMenuTree();
      } else {
        await axios.put(
          `${apiBaseUrl}/api/vendor-price-nodes/update`,
          {
            vendorPriceNodeId: nodeId,
            pricingStatus: nextStatus,
          },
          adminRequestConfig()
        );
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
    setShowCopyPanel(false);
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
      await axios.post(
        `${apiBaseUrl}/api/vendor-menu/${vendorId}/nodes`,
        {
          parentNodeId: getNodeId(addParent) || null,
          nodeType: addForm.nodeType,
          name: addForm.name,
          price: addForm.nodeType === "service" ? addForm.price : undefined,
          imageUrl: addForm.imageUrl,
        },
        adminRequestConfig()
      );
      await loadMyMenuTree();
      setShowAddPanel(false);
      setAddParent(null);
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Failed to add menu item");
    } finally {
      setSaving(false);
    }
  }

  async function searchCopySources() {
    try {
      setCopySearchLoading(true);
      setCopySearchError("");
      setCopyPreviewData(null);
      setCopyPreviewError("");
      setCopySelectionMap({});
      setCopyDestinationNodeId("");

      const response = await axios.get(
        `${apiBaseUrl}/api/admin/vendor-menu-copy/${
          copySourceType === "category" ? "categories" : "vendors"
        }`,
        adminRequestConfig({
          params: {
            sourceType: copySourceType,
            system: copySourceSystem,
            query: copySourceQuery,
            limit: 12,
          },
        })
      );

      setCopySearchResults(Array.isArray(response.data?.items) ? response.data.items : []);
    } catch (err) {
      setCopySearchResults([]);
      setCopySearchError(
        err?.response?.data?.message ||
          err.message ||
          `Failed to search source ${copySourceType === "category" ? "categories" : "vendors"}`
      );
    } finally {
      setCopySearchLoading(false);
    }
  }

  async function previewSourceMenu(sourceToPreview = copySelectedSourceItem) {
    if (!sourceToPreview?.id) {
      setCopyPreviewError(
        `Select a source ${copySourceType === "category" ? "category" : "vendor"} first`
      );
      return;
    }

    try {
      setCopyPreviewLoading(true);
      setCopyPreviewError("");
      const response = await axios.get(
        `${apiBaseUrl}/api/admin/vendor-menu-copy/preview`,
        adminRequestConfig({
          params: {
            sourceType: copySourceType,
            system: copySourceSystem,
            vendorId: copySourceType === "vendor" ? sourceToPreview.id : undefined,
            categoryId: copySourceType === "category" ? sourceToPreview.id : undefined,
          },
        })
      );
      setCopyPreviewData(response.data || null);
      setCopySelectionMap(buildFullySelectedMap(response.data?.tree || []));
    } catch (err) {
      setCopyPreviewData(null);
      setCopyPreviewError(
        err?.response?.data?.message || err.message || "Failed to preview source menu"
      );
      setCopySelectionMap({});
    } finally {
      setCopyPreviewLoading(false);
    }
  }

  function setTreeSelection(node, checked) {
    const ids = collectNodeAndDescendantIds(node);
    setCopySelectionMap((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = checked;
      });
      return next;
    });
  }

  function isNodeFullySelected(node) {
    const ids = collectNodeAndDescendantIds(node);
    return ids.length > 0 && ids.every((id) => copySelectionMap[id]);
  }

  function isNodePartiallySelected(node) {
    const ids = collectNodeAndDescendantIds(node);
    const selectedCount = ids.filter((id) => copySelectionMap[id]).length;
    return selectedCount > 0 && selectedCount < ids.length;
  }

  function renderPreviewNode(node, depth = 0) {
    const checked = isNodeFullySelected(node);
    const indeterminate = isNodePartiallySelected(node);
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;

    return (
      <div key={node.id} style={{ ...styles.copyTreeNode, marginLeft: depth * 18 }}>
        <label style={styles.copyTreeRow}>
          <input
            type="checkbox"
            checked={checked}
            ref={(element) => {
              if (element) {
                element.indeterminate = indeterminate;
              }
            }}
            onChange={(event) => setTreeSelection(node, event.target.checked)}
          />
          <span style={styles.copyTreeName}>
            {node.name}
            {node.isLeaf && node.price != null ? (
              <span style={styles.copyTreeMeta}> ₹{node.price}</span>
            ) : null}
          </span>
          <span style={styles.copyTreeType}>{node.isLeaf ? "Service" : "Group"}</span>
        </label>
        {hasChildren ? (
          <div style={styles.copyTreeChildren}>
            {node.children.map((child) => renderPreviewNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  }

  async function executeCopyMyMenu() {
    if (!copySelectedSourceItem?.id) {
      alert(`Select a source ${copySourceType === "category" ? "category" : "vendor"} first`);
      return;
    }

    const selectedNodeIds = Object.entries(copySelectionMap)
      .filter(([, checked]) => Boolean(checked))
      .map(([id]) => id);

    if (!selectedNodeIds.length) {
      alert("Select at least one source menu item to copy");
      return;
    }

    const confirmed = window.confirm(
      `Copy ${selectedNodeIds.length} selected menu nodes from ${
        copySourceType === "category"
          ? copySelectedSourceItem.name || "source category"
          : copySelectedSourceItem.businessName ||
            copySelectedSourceItem.contactName ||
            "source vendor"
      } into ${targetVendorLabel}${
        copyMode === "append_keep" && selectedDestinationNode
          ? ` under ${selectedDestinationNode.pathLabel || selectedDestinationNode.name}`
          : ""
      }? ${
        copyMode === "replace_archive"
          ? "Existing target My Menu will be archived first."
          : "Selected menu branches will be added to the existing target My Menu."
      }`
    );

    if (!confirmed) return;

    try {
      setCopyExecuting(true);
      const response = await axios.post(
        `${apiBaseUrl}/api/admin/vendor-menu-copy/execute`,
        {
          sourceType: copySourceType,
          sourceSystem: copySourceSystem,
          sourceVendorId: copySourceType === "vendor" ? copySelectedSourceItem.id : undefined,
          sourceCategoryId: copySourceType === "category" ? copySelectedSourceItem.id : undefined,
          targetSystem: "localhost",
          targetVendorId: vendorId,
          mode: copyMode,
          destinationNodeId: copyMode === "append_keep" ? copyDestinationNodeId || undefined : undefined,
          selectedNodeIds,
        },
        adminRequestConfig()
      );

      await loadMyMenuTree();
      setSource("self_managed");
      setShowCopyPanel(false);
      alert(
        `My Menu copied successfully. Top-level groups: ${
          (response.data?.copiedTopLevelNames || []).join(", ") || "updated"
        }`
      );
      onVendorUpdated?.({
        ...(vendor || {}),
        pricingSource: "self_managed",
        menuSourceType: "manual_upload",
        pricingSourceUpdatedAt: new Date().toISOString(),
      });
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Failed to copy My Menu");
    } finally {
      setCopyExecuting(false);
    }
  }

  useEffect(() => {
    if (!showCopyPanel) return;
    const timer = setTimeout(() => {
      searchCopySources();
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copySourceQuery, copySourceSystem, copySourceType, showCopyPanel]);

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
          <button
            style={styles.secondaryButton}
            type="button"
            disabled={saving}
            onClick={() => {
              setEditingNode(null);
              setShowAddPanel(false);
              setAddParent(null);
              setShowCopyPanel((prev) => !prev);
            }}
          >
            {showCopyPanel ? "Hide Copy My Menu" : "Copy My Menu"}
          </button>
        </div>

        <div style={styles.note}>
          {source === "standard"
            ? "Standard Menu is admin-managed. Admin can edit price/status on existing service leaves."
            : "My Menu is vendor-owned. Admin can add subcategories/services, edit names/prices/images, and inactivate items."}
        </div>

        {showCopyPanel ? (
          <div style={styles.copyPanel}>
            <div style={styles.copyPanelHeader}>
              <div>
                <h3 style={styles.copyTitle}>Copy My Menu</h3>
                <p style={styles.copyHint}>
                  Prepare a source vendor menu import into this selected target vendor. UI is ready now; backend APIs will power preview and execute next.
                </p>
              </div>
              <span style={styles.copyStatusPill}>UI Ready</span>
            </div>

            <div style={styles.copyGrid}>
              <div style={styles.copyCard}>
                <div style={styles.copyCardTitle}>Target Vendor</div>
                <div style={styles.copySummaryList}>
                  <div><strong>System:</strong> {targetSystemLabel}</div>
                  <div><strong>Vendor:</strong> {targetVendorLabel}</div>
                  <div><strong>Current mode:</strong> {vendor?.pricingSource === "self_managed" ? "My Menu" : "Standard Menu"}</div>
                  <div><strong>Top-level groups:</strong> {targetMenuSummary.topLevelCount}</div>
                  <div><strong>Total nodes:</strong> {targetMenuSummary.totalNodes}</div>
                  <div><strong>Total services:</strong> {targetMenuSummary.totalServices}</div>
                </div>
              </div>

              <div style={styles.copyCard}>
                <div style={styles.copyCardTitle}>Source</div>
                <label style={styles.label}>
                  Source Type
                  <select
                    style={styles.input}
                    value={copySourceType}
                    onChange={(event) => {
                      setCopySourceType(event.target.value);
                      setCopySearchResults([]);
                      setCopySelectedSourceItem(null);
                      setCopyPreviewData(null);
                      setCopyPreviewError("");
                      setCopySelectionMap({});
                    }}
                  >
                    <option value="vendor">Vendor</option>
                    <option value="category">Category</option>
                  </select>
                </label>
                <label style={styles.label}>
                  Source System
                  <select
                    style={styles.input}
                    value={copySourceSystem}
                    onChange={(event) => setCopySourceSystem(event.target.value)}
                  >
                    <option value="localhost">localhost</option>
                    <option value="staging">staging</option>
                    <option value="production">production</option>
                  </select>
                </label>

                <label style={styles.label}>
                  {copySourceType === "category" ? "Search Source Category" : "Search Source Vendor"}
                  <input
                    style={styles.input}
                    value={copySourceQuery}
                    onChange={(event) => setCopySourceQuery(event.target.value)}
                    placeholder={
                      copySourceType === "category"
                        ? "Search by category name"
                        : "Search by business name, phone, or subdomain"
                    }
                  />
                </label>

                {copySearchError ? <div style={styles.copyErrorBox}>{copySearchError}</div> : null}

                <div style={styles.copySearchActions}>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    disabled={copySearchLoading}
                    onClick={searchCopySources}
                  >
                    {copySearchLoading
                      ? "Searching..."
                      : `Search ${copySourceType === "category" ? "Categories" : "Vendors"}`}
                  </button>
                </div>

                {!copySearchLoading && !copySearchResults.length ? (
                  <div style={styles.copyPlaceholderBox}>
                    {copySourceType === "category"
                      ? "No source categories to show yet. Try a category name."
                      : "No source vendors to show yet. Try a business name, phone, or subdomain."}
                  </div>
                ) : null}

                {copySearchResults.length ? (
                  <div style={styles.copyVendorList}>
                    {copySearchResults.map((item) => {
                      const isSelected = copySelectedSourceItem?.id === item.id;
                      return (
                        <button
                          type="button"
                          key={item.id}
                          style={{
                            ...styles.copyVendorCard,
                            ...(isSelected ? styles.copyVendorCardSelected : {}),
                          }}
                          onClick={() => {
                            setCopySelectedSourceItem(item);
                            setCopyPreviewData(null);
                            setCopyPreviewError("");
                            setCopySelectionMap({});
                          }}
                        >
                          <span style={styles.copyVendorTitle}>
                            {copySourceType === "category"
                              ? item.name || "Unnamed Category"
                              : item.businessName || item.contactName || "Unnamed Vendor"}
                          </span>
                          <span style={styles.copyVendorMeta}>
                            {copySourceType === "category"
                              ? `${item.categoryType || "Services"}${item.pricingStatus ? ` • ${item.pricingStatus}` : ""}`
                              : `${item.phone || "No phone"}${item.subdomain ? ` • ${item.subdomain}` : ""}`}
                          </span>
                          <span style={styles.copyVendorMeta}>
                            {copySourceType === "category"
                              ? "Dummy Category • Preview"
                              : `${item.pricingSource === "self_managed" ? "My Menu" : "Standard Menu"} • ${item.status || "No status"}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={styles.copyGrid}>
              <div style={styles.copyCard}>
                <div style={styles.copyCardTitle}>Copy Mode</div>
                <label style={styles.radioRow}>
                  <input
                    type="radio"
                    name="copyMode"
                    value="replace_archive"
                    checked={copyMode === "replace_archive"}
                    onChange={(event) => setCopyMode(event.target.value)}
                  />
                  <span>Archive current target My Menu and replace</span>
                </label>
                <label style={styles.radioRow}>
                  <input
                    type="radio"
                    name="copyMode"
                    value="append_keep"
                    checked={copyMode === "append_keep"}
                    onChange={(event) => setCopyMode(event.target.value)}
                  />
                  <span>Add selected menu to existing target menu</span>
                </label>
                {copyMode === "append_keep" ? (
                  <div style={styles.copyDestinationPanel}>
                    <div style={styles.copyDestinationTitle}>Destination Node</div>
                    <div style={styles.copyDestinationHint}>
                      Choose where the copied menu should be created inside the target My Menu.
                    </div>
                    <label style={styles.radioRow}>
                      <input
                        type="radio"
                        name="copyDestinationNode"
                        value=""
                        checked={!copyDestinationNodeId}
                        onChange={() => setCopyDestinationNodeId("")}
                      />
                      <span>Add at root level</span>
                    </label>
                    {destinationNodeOptions.length ? (
                      <div style={styles.copyDestinationList}>
                        {destinationNodeOptions.map((node) => {
                          const nodeId = getNodeId(node);
                          return (
                            <label key={nodeId} style={styles.copyDestinationRow}>
                              <input
                                type="radio"
                                name="copyDestinationNode"
                                value={nodeId}
                                checked={copyDestinationNodeId === nodeId}
                                onChange={() => setCopyDestinationNodeId(nodeId)}
                              />
                              <span style={styles.copyDestinationText}>
                                {node.pathLabel || node.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={styles.copyPlaceholderBox}>
                        No destination groups found yet. Add a subcategory in My Menu first or keep root level.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div style={styles.copyCard}>
                <div style={styles.copyCardTitle}>Next Backend APIs</div>
                <div style={styles.copyApiList}>
                  <code>GET /api/admin/vendor-menu-copy/vendors</code>
                  <code>GET /api/admin/vendor-menu-copy/categories</code>
                  <code>GET /api/admin/vendor-menu-copy/preview</code>
                  <code>POST /api/admin/vendor-menu-copy/execute</code>
                </div>
                {copySelectedSourceItem ? (
                  <div style={styles.copyPreviewPanel}>
                    <div style={styles.copyPreviewHeader}>
                      <strong>Selected Source:</strong>{" "}
                      {copySourceType === "category"
                        ? copySelectedSourceItem.name
                        : copySelectedSourceItem.businessName || copySelectedSourceItem.contactName}
                    </div>
                    {copyPreviewError ? <div style={styles.copyErrorBox}>{copyPreviewError}</div> : null}
                    {!copyPreviewError && !copyPreviewData ? (
                      <div style={styles.copyPlaceholderBox}>
                        Click preview to inspect this {copySourceType === "category" ? "category" : "vendor"} source hierarchy.
                      </div>
                    ) : null}
                    {copyPreviewData?.summary ? (
                      <>
                        <div style={styles.copySummaryList}>
                          <div><strong>Top-level groups:</strong> {copyPreviewData.summary.topLevelCount}</div>
                          <div><strong>Total nodes:</strong> {copyPreviewData.summary.totalNodes}</div>
                          <div><strong>Total services:</strong> {copyPreviewData.summary.leafCount}</div>
                          <div><strong>Can copy:</strong> {copyPreviewData.summary.canCopy ? "Yes" : "No"}</div>
                          <div><strong>Groups:</strong> {(copyPreviewData.summary.topLevelNames || []).join(", ") || "None"}</div>
                          <div><strong>Selected nodes:</strong> {previewSelectedCount} / {previewTotalSelectable}</div>
                        </div>
                        {previewTree.length ? (
                          <div style={styles.copyTreePanel}>
                            <div style={styles.copyTreeActions}>
                              <button
                                type="button"
                                style={styles.secondaryButton}
                                onClick={() => setCopySelectionMap(buildFullySelectedMap(previewTree))}
                              >
                                Select All
                              </button>
                              <button
                                type="button"
                                style={styles.secondaryButton}
                                onClick={() => setCopySelectionMap({})}
                              >
                                Deselect All
                              </button>
                            </div>
                            <div style={styles.copyTreeList}>
                              {previewTree.map((node) => renderPreviewNode(node))}
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={styles.copyActionBar}>
              <button
                type="button"
                style={styles.secondaryButton}
                disabled={!copySelectedSourceItem || copyPreviewLoading}
                onClick={() => previewSourceMenu()}
              >
                {copyPreviewLoading ? "Loading Preview..." : "Preview Source Menu"}
              </button>
              <button
                type="button"
                style={{
                  ...styles.primaryButton,
                  ...((!copyPreviewData?.summary?.canCopy || previewSelectedCount === 0 || copyExecuting)
                    ? styles.disabledPrimaryButton
                    : {}),
                }}
                disabled={!copyPreviewData?.summary?.canCopy || previewSelectedCount === 0 || copyExecuting}
                onClick={executeCopyMyMenu}
              >
                {copyExecuting ? "Copying..." : "Copy My Menu"}
              </button>
            </div>
          </div>
        ) : null}

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
  disabledPrimaryButton: { opacity: 0.55, cursor: "not-allowed" },
  smallButton: { marginRight: 6, marginBottom: 4, padding: "5px 9px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" },
  note: { padding: 10, borderRadius: 10, background: "#f8fafc", color: "#475569", marginBottom: 12 },
  error: { padding: 10, borderRadius: 10, background: "#fee2e2", color: "#991b1b", marginBottom: 12 },
  empty: { padding: 18, color: "#64748b" },
  copyPanel: { marginBottom: 16, padding: 16, border: "1px solid #dbe4f0", borderRadius: 14, background: "#f8fbff" },
  copyPanelHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14 },
  copyTitle: { margin: 0, fontSize: 18, color: "#0f172a" },
  copyHint: { margin: "6px 0 0", color: "#64748b", lineHeight: 1.5, maxWidth: 760 },
  copyStatusPill: { display: "inline-flex", alignItems: "center", padding: "5px 10px", borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", fontWeight: 800, fontSize: 12, whiteSpace: "nowrap" },
  copyGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 14 },
  copyCard: { padding: 14, borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff" },
  copyCardTitle: { fontWeight: 800, color: "#0f172a", marginBottom: 12 },
  copySummaryList: { display: "grid", gap: 8, color: "#334155", lineHeight: 1.45 },
  copyPlaceholderBox: { padding: 14, borderRadius: 10, background: "#f8fafc", color: "#64748b", border: "1px dashed #cbd5e1", lineHeight: 1.5 },
  radioRow: { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12, color: "#334155", fontWeight: 500 },
  copyDestinationPanel: { marginTop: 10, paddingTop: 10, borderTop: "1px solid #e2e8f0" },
  copyDestinationTitle: { fontWeight: 800, color: "#0f172a", marginBottom: 6 },
  copyDestinationHint: { color: "#64748b", fontSize: 13, lineHeight: 1.5, marginBottom: 10 },
  copyDestinationList: { display: "grid", gap: 8, maxHeight: 220, overflowY: "auto", paddingRight: 4 },
  copyDestinationRow: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    gap: 10,
    alignItems: "center",
    padding: "8px 10px",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    background: "#f8fafc",
  },
  copyDestinationText: { color: "#334155", fontSize: 14, overflowWrap: "anywhere" },
  copyApiList: { display: "grid", gap: 8, color: "#0f172a" },
  copySearchActions: { display: "flex", justifyContent: "flex-start", marginBottom: 10 },
  copyVendorList: { display: "grid", gap: 8, maxHeight: 260, overflowY: "auto" },
  copyVendorCard: { display: "flex", flexDirection: "column", gap: 4, padding: 12, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", textAlign: "left", cursor: "pointer" },
  copyVendorCardSelected: { borderColor: "#0ea5e9", boxShadow: "0 0 0 2px rgba(14, 165, 233, 0.15)" },
  copyVendorTitle: { fontWeight: 800, color: "#0f172a" },
  copyVendorMeta: { color: "#64748b", fontSize: 13, lineHeight: 1.4 },
  copyPreviewPanel: { marginTop: 12, paddingTop: 12, borderTop: "1px solid #e2e8f0" },
  copyPreviewHeader: { marginBottom: 10, color: "#0f172a" },
  copyErrorBox: { marginTop: 10, padding: 10, borderRadius: 8, background: "#fee2e2", color: "#991b1b" },
  copyTreePanel: { marginTop: 12, border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc" },
  copyTreeActions: { display: "flex", gap: 8, flexWrap: "wrap", padding: 10, borderBottom: "1px solid #e2e8f0" },
  copyTreeList: { maxHeight: 280, overflowY: "auto", padding: 10 },
  copyTreeNode: { display: "grid", gap: 6 },
  copyTreeRow: { display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", gap: 10, alignItems: "center", color: "#334155", fontSize: 14 },
  copyTreeChildren: { display: "grid", gap: 6 },
  copyTreeName: { fontWeight: 700, minWidth: 0, overflowWrap: "anywhere" },
  copyTreeMeta: { color: "#64748b", fontWeight: 600 },
  copyTreeType: { color: "#64748b", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" },
  copyActionBar: { display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" },
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
