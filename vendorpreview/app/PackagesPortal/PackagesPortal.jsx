"use client";

import { useEffect, useState } from "react";
import "./PackagesPortal.css";
import { useVendor } from "../context/VendorContext";
function fetchWithAuth(url, options = {}) {
  const sessionVendorId = localStorage.getItem("vendorSessionVendorId");
  const vendorToken = sessionVendorId ? localStorage.getItem(`vendorToken:${sessionVendorId}`) : "";
  const token = vendorToken || localStorage.getItem("authToken");

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
function parseTerms(terms) {
  if (!terms) return [];
  return terms
    .split(/[.,]/)   // split by comma or dot
    .map(t => t.trim())
    .filter(Boolean);
}
function collectMasterIds(nodes, set = new Set()) {
  nodes.forEach(n => {
    if (n._id) set.add(n._id);
    if (n.children) collectMasterIds(n.children, set);
  });
  return set;
}
function collectVendorIds(nodes, set = new Set()) {
  nodes.forEach(n => {
    if (n.categoryId) set.add(n.categoryId);
    if (n.children) collectVendorIds(n.children, set);
  });
  return set;
}
function collectLeafIds(nodes, set = new Set()) {
  nodes.forEach(n => {
    if (n.isLeaf) {
      set.add(n._id);
    }
    if (n.children) {
      collectLeafIds(n.children, set);
    }
  });
  return set;
}
function buildFullPayloads(nodes, parentVendorPriceNodeId = null, level = 0, arr = []) {
  nodes.forEach((node, index) => {
    const payload = {
      vendorId: node.vendorId,
      rootCategoryId: node.rootCategoryId,
      categoryId: node.categoryId,
      parentCategoryId: node.parentCategoryId || null,
      name: node.name,
      parentVendorPriceNodeId,
      level,
      isLeaf: node.isLeaf,
      price: node.price || 0,
      pricingStatus: "Inactive",
      terms: node.terms || "",
      offerText: node.offerText || "",
      visibleToUser: true,
      visibleToVendor: true,
      sequence: index,
    };

    arr.push(payload);

    if (node.children?.length) {
      buildFullPayloads(
        node.children,
        node._id?.startsWith("new-") ? null : node._id,
        level + 1,
        arr
      );
    }
  });
  return arr;
}
function mergeVendorWithCategory(vendorTree, categoryTree) {
  const categoryMap = new Map();

  function flatten(nodes, inheritedImage = null) {
    nodes.forEach(node => {
      const currentImage = node.imageUrl || inheritedImage || null;

      categoryMap.set(node._id, {
        imageUrl: currentImage,
        packagesIncludes: node.packagesIncludes || "",
        enableFreeText: node.enableFreeText === true,
      });

      if (node.children?.length) {
        flatten(node.children, currentImage);
      }
    });
  }

  flatten(categoryTree || []);

  function walk(nodes) {
    return (nodes || []).map(vendorNode => {
      const meta = categoryMap.get(vendorNode.categoryId);

      return {
        ...vendorNode,
        imageUrl: vendorNode.imageUrl || meta?.imageUrl || null,
        packagesIncludes:
          meta?.packagesIncludes ??
          vendorNode.packagesIncludes ??
          "",
        enableFreeText:
          meta?.enableFreeText ??
          vendorNode.enableFreeText ??
          false,
        children: walk(vendorNode.children || []),
      };
    });
  }

  return walk(vendorTree || []);
}

function findTermsInCategoryTree(nodes, categoryId) {
  for (const node of nodes) {
    if (node._id === categoryId) {
      if (!node.terms) return [];
      return Array.isArray(node.terms)
        ? node.terms
        : parseTerms(node.terms);
    }
    if (node.children?.length) {
      const found = findTermsInCategoryTree(
        node.children,
        categoryId
      );
      if (found.length) return found;
    }
  }
  return [];
}
function isFreeTextEnabled(nodes, categoryId) {
  for (const node of nodes) {
    if (node._id === categoryId) {
      return node.enableFreeText === true;
    }

    if (node.children?.length) {
      const found = isFreeTextEnabled(node.children, categoryId);
      if (found) return true;
    }
  }
  return false;
}
function buildImageMapFromTree(nodes) {
  const map = {};

  function walk(node, inheritedImage = null) {
    const currentImage = node.imageUrl || inheritedImage;

    if (node._id && currentImage) {
      map[node._id] = currentImage;
    }

    node.children?.forEach(child =>
      walk(child, currentImage)
    );
  }

  nodes.forEach(n => walk(n));
  return map;
}

function normalizeTree(node) {
  return {
    ...node,
    _id: node.id,
    children: (node.children || []).map(normalizeTree),
  };
}

function normalizeSelfManagedTree(node) {
  const normalizedId = node?.categoryId || node?.id || node?._id;
  return {
    ...node,
    _id: node?._id || normalizedId,
    id: node?.id || normalizedId,
    categoryId: normalizedId,
    children: (node.children || []).map(normalizeSelfManagedTree),
  };
}
function getCustomPackageContext(path) {
  if (!Array.isArray(path) || path.length === 0) return null;

  const currentNode = path[path.length - 1];
  const packageNode = currentNode?._isCustomRoot
    ? path[path.length - 2]
    : currentNode;

  if (packageNode?.name !== "Packages") return null;

  const packageNodeIndex = currentNode?._isCustomRoot
    ? path.length - 2
    : path.length - 1;

  if (packageNodeIndex <= 0) {
    return {
      parentNodeId: null,
      parentNodeType: "root",
      sectionLabel: "This category",
    };
  }

  const immediateParent = path[packageNodeIndex - 1];

  return {
    parentNodeId: immediateParent?.categoryId || immediateParent?._id || null,
    parentNodeType: "standard_subcategory",
    sectionLabel: immediateParent?.name || "This section",
  };
}

function getCurrentCustomPackages(nodes, context) {
  if (!context) return [];

  return (nodes || []).filter(node => {
    if (context.parentNodeType === "root") {
      return node.parentNodeType === "root" && !node.parentNodeId;
    }

    return (
      node.parentNodeType === context.parentNodeType &&
      String(node.parentNodeId || "") === String(context.parentNodeId || "")
    );
  });
}

function defaultVariantForm() {
  return {
    id: null,
    name: "",
    price: "",
    imageUrl: "",
    packagesIncludes: "",
    terms: "",
    pricingStatus: "Active",
    isDeleted: false,
  };
}

export default function PackagesPortal({ onClose, onLoaded, onPricingUpdated }) {
  const { vendorInfo, setVendorInfo } = useVendor();
  const vendorId = vendorInfo?.vendorId || vendorInfo?._id || null;
  const isSelfManagedVendor = vendorInfo?.pricingSource === "self_managed";
  const rootCategoryId =
    vendorInfo?.categoryId ||
    vendorInfo?.category?._id ||
    vendorInfo?.rootCategoryId ||
    null;

  const [rootNodes, setRootNodes] = useState([]);
  const [path, setPath] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [modalPrice, setModalPrice] = useState("");
  const [modalTerms, setModalTerms] = useState("");
  const [modalImageUrl, setModalImageUrl] = useState("");
  const [uploadingEditServiceImage, setUploadingEditServiceImage] = useState(false);
  const [selectedTerms, setSelectedTerms] = useState([]);
  const [showSectionEditModal, setShowSectionEditModal] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [sectionImageUrl, setSectionImageUrl] = useState("");
  const [uploadingSectionImage, setUploadingSectionImage] = useState(false);
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [imageLibrarySearch, setImageLibrarySearch] = useState("");
  const [imageLibraryItems, setImageLibraryItems] = useState([]);
  const [loadingImageLibrary, setLoadingImageLibrary] = useState(false);
  const [imageLibraryError, setImageLibraryError] = useState("");
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [addingNode, setAddingNode] = useState(false);
  const [addNodeType, setAddNodeType] = useState("subcategory");
  const [addNodeName, setAddNodeName] = useState("");
  const [addNodePrice, setAddNodePrice] = useState("");
  const [addNodeTerms, setAddNodeTerms] = useState("");
  const [addNodeImageUrl, setAddNodeImageUrl] = useState("");
  const [uploadingAddNodeImage, setUploadingAddNodeImage] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editingCategoryNode, setEditingCategoryNode] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState("");

  const [pendingServiceId, setPendingServiceId] = useState(null);
  const [modalOfferText, setModalOfferText] = useState("");
  const [activationOfferText, setActivationOfferText] = useState("");

  const [showActivateModal, setShowActivateModal] = useState(false);
  const [pendingService, setPendingService] = useState(null);
  const [activationPrice, setActivationPrice] = useState("");

  const [allTerms, setAllTerms] = useState([]);

  const [categoryTree, setCategoryTree] = useState([]);
  const [customTree, setCustomTree] = useState([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customModalMode, setCustomModalMode] = useState("create");
  const [savingCustomPackage, setSavingCustomPackage] = useState(false);
  const [uploadingMainImage, setUploadingMainImage] = useState(false);
  const [uploadingVariantIndex, setUploadingVariantIndex] = useState(null);
  const [switchingSource, setSwitchingSource] = useState(false);
  const [menuImportAdminUnlocked, setMenuImportAdminUnlocked] = useState(false);
  const [showMenuImportAdminModal, setShowMenuImportAdminModal] = useState(false);
  const [menuImportAdminPasscode, setMenuImportAdminPasscode] = useState("");
  const [verifyingMenuImportAdmin, setVerifyingMenuImportAdmin] = useState(false);
  const [importingMenuFile, setImportingMenuFile] = useState(false);
  const [menuImportMessage, setMenuImportMessage] = useState("");
  const [customForm, setCustomForm] = useState({
    id: null,
    packageType: "single",
    name: "",
    packagesIncludes: "",
    terms: "",
    price: "",
    variants: [
      defaultVariantForm(),
    ],
  });

  function toggleTerm(term) {
    setSelectedTerms(prev => {
      return prev.includes(term)
        ? prev.filter(t => t !== term) // ❌ remove → untick
        : [...prev, term];             // ✅ add → tick
    });
  }
  function attachImagesToPricingTree(pricingNodes, imageMap) {
    function walk(nodes, inheritedImage = null) {
      return nodes.map(n => {
        const image =
          imageMap[n.categoryId] || inheritedImage || null;

        return {
          ...n,
          imageUrl: image,
          children: walk(n.children || [], image),
        };
      });
    }

    return walk(pricingNodes);
  }
function defaultCustomForm() {
  return {
    id: null,
    packageType: "single",
    name: "",
    imageUrl: "",
    packagesIncludes: "",
    terms: "",
    price: "",
    variants: [
      defaultVariantForm(),
    ],
  };
  }
  async function loadCustomPackages() {
    if (!vendorId || !rootCategoryId) {
      setCustomTree([]);
      return;
    }

    const customRes = await fetchWithAuth(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-custom-packages?vendorId=${vendorId}&rootCategoryId=${rootCategoryId}&includeDeleted=true`
    );
    const customData = await customRes.json();
    setCustomTree(customData?.data || []);
  }

  function rebuildPathFromTree(nodes, previousPath) {
    if (!Array.isArray(previousPath) || previousPath.length === 0) return [];

    const targetIds = previousPath.map(node =>
      String(node?._id || node?.id || node?.categoryId || "")
    );

    const rebuilt = [];
    let currentNodes = nodes;

    for (const targetId of targetIds) {
      const match = (currentNodes || []).find(
        node => String(node?._id || node?.id || node?.categoryId || "") === targetId
      );

      if (!match) break;
      rebuilt.push(match);
      currentNodes = match.children || [];
    }

    return rebuilt;
  }

  async function reloadSelfManagedTree(pathOverride = null) {
    if (!vendorId) return;

    const selfManagedRes = await fetchWithAuth(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-menu/${vendorId}/tree`
    );
    const selfManagedData = await selfManagedRes.json();
    const selfManagedTree = (selfManagedData?.children || []).map(normalizeSelfManagedTree);
    setCategoryTree([]);
    setRootNodes(selfManagedTree);
    setPath(prev => rebuildPathFromTree(selfManagedTree, pathOverride || prev));
    await loadCustomPackages();
  }

  useEffect(() => {
    if (!vendorId || !rootCategoryId) return;

    async function load() {
      setLoading(true);
      if (isSelfManagedVendor) {
        await reloadSelfManagedTree();
        setLoading(false);
        onLoaded?.();
        return;
      }

      const pricingRes = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-price-nodes/tree?vendorId=${vendorId}&rootCategoryId=${rootCategoryId}`
      );
      const pricingData = await pricingRes.json();

      // 2️⃣ Category image tree
      const catRes = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/tree?rootCategoryId=${rootCategoryId}`
      );

      const rawTree = await catRes.json();
      if (!rawTree || !rawTree.id) {
        setCategoryTree([]);
        setRootNodes([]);
        setLoading(false);
        return;
      }
      const normalizedRoot = normalizeTree(rawTree);
      const catTree = normalizedRoot.children || [];
      setCategoryTree(catTree);
  const masterLeafIds = collectLeafIds(catTree);
const vendorIds = collectVendorIds(pricingData.tree || []);

const missingLeafIds = [...masterLeafIds].filter(
  id => !vendorIds.has(id)
);
console.log("MISSING LEAF IDS:", missingLeafIds);
if (missingLeafIds.length) {
  await fetchWithAuth(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-price-nodes/add-missing-leaves`,
    {
      method: "POST",
      body: JSON.stringify({
        vendorId,
        rootCategoryId,
        leafCategoryIds: missingLeafIds
      })
    }
  );
}
      const refreshedRes = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-price-nodes/tree?vendorId=${vendorId}&rootCategoryId=${rootCategoryId}`
      );
      const refreshedPricing = await refreshedRes.json();
      const imageMap = buildImageMapFromTree(catTree);
      const syncedTree = mergeVendorWithCategory(refreshedPricing.tree || [], catTree);
      function collectActiveLeafIds(nodes, arr = []) {
        nodes.forEach(n => {
          if (n.isLeaf && n.pricingStatus === "Active") {
            arr.push(n.categoryId);
          }
          if (n.children?.length) {
            collectActiveLeafIds(n.children, arr);
          }
        });
        return arr;
      }
      const activeLeafCategoryIds = collectActiveLeafIds(syncedTree);
      const payload = {
        vendorId,
        rootCategoryId,
        activeLeafCategoryIds
      };
      console.log("SYNC PAYLOAD:", payload);
      const fullPayload = buildFullPayloads(syncedTree);
      console.log("FULL PAYLOAD:", fullPayload);
      const treeWithImages =
        attachImagesToPricingTree(syncedTree, imageMap);

      setRootNodes(treeWithImages);
      await loadCustomPackages();

      setLoading(false);
      onLoaded?.();
    }


    load();
  }, [vendorId, rootCategoryId, isSelfManagedVendor]);

  async function handleSwitchPricingSource(nextSource) {
    if (!vendorId || switchingSource) return;
    const currentSource = isSelfManagedVendor ? "self_managed" : "standard";
    if (nextSource === currentSource) return;

    const nextLabel = nextSource === "self_managed" ? "My Menu" : "Standard Menu";
    const confirmed = window.confirm(
      `Switch pricing source to ${nextLabel}?\n\nYou will stay on this Prices screen and can continue editing after the switch.`
    );

    if (!confirmed) return;

    try {
      setSwitchingSource(true);
      const menuSourceType =
        nextSource === "standard"
          ? "admin_tree"
          : vendorInfo?.menuSourceType || "excel_upload";

      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-menu/${vendorId}/source`,
        {
          method: "PATCH",
          body: JSON.stringify({
            pricingSource: nextSource,
            menuSourceType,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to update pricing source");
      }

      setPath([]);
      setMenuImportMessage("");
      setVendorInfo?.(prev => ({
        ...(prev || vendorInfo || {}),
        pricingSource: data?.pricingSource || nextSource,
        menuSourceType: data?.menuSourceType || menuSourceType,
        pricingSourceUpdatedAt: data?.pricingSourceUpdatedAt || new Date().toISOString(),
      }));
      await onPricingUpdated?.();
    } catch (error) {
      window.alert(error.message || "Failed to switch pricing source");
    } finally {
      setSwitchingSource(false);
    }
  }

  async function handleVerifyMenuImportAdmin() {
    if (!menuImportAdminPasscode.trim()) {
      window.alert("Enter admin passcode");
      return;
    }

    try {
      setVerifyingMenuImportAdmin(true);
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/app-config/admin-passcode`,
        { method: "GET" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to verify admin passcode");
      }

      const expectedPasscode = String(data?.adminPasscode || "").trim();
      if (!expectedPasscode || menuImportAdminPasscode.trim() !== expectedPasscode) {
        window.alert("Invalid passcode");
        return;
      }

      setMenuImportAdminUnlocked(true);
      setShowMenuImportAdminModal(false);
      setMenuImportAdminPasscode("");
    } catch (error) {
      window.alert(error.message || "Invalid passcode");
    } finally {
      setVerifyingMenuImportAdmin(false);
    }
  }

  async function handleImportSelfManagedMenuFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !vendorId) return;

    try {
      setImportingMenuFile(true);
      setMenuImportMessage("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("archiveExisting", "true");

      const sessionVendorId = typeof window !== "undefined" ? localStorage.getItem("vendorSessionVendorId") : "";
      const vendorToken =
        typeof window !== "undefined" && sessionVendorId
          ? localStorage.getItem(`vendorToken:${sessionVendorId}`)
          : "";
      const token = vendorToken || (typeof window !== "undefined" ? localStorage.getItem("authToken") : "");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-menu/${vendorId}/import-excel`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to import menu file");
      }

      await reloadSelfManagedTree([]);
      await onPricingUpdated?.();
      setMenuImportMessage(`Imported ${data?.itemCount || 0} menu records from ${file.name}.`);
    } catch (error) {
      setMenuImportMessage(error.message || "Failed to import menu file");
    } finally {
      setImportingMenuFile(false);
    }
  }

  useEffect(() => {
    if (!showSectionEditModal || !showImageLibrary) return;

    const timer = setTimeout(() => {
      loadImageLibrary(imageLibrarySearch);
    }, 350);

    return () => clearTimeout(timer);
  }, [imageLibrarySearch, showImageLibrary, showSectionEditModal]);

  if (loading) return null;
  /* ================= CURRENT LEVEL ================= */
  const showingRoot = path.length === 0;
  const currentNode = path[path.length - 1];
  const children = showingRoot ? rootNodes : currentNode.children || [];
  const categoryChildren = children.filter(c => !c.isLeaf);
  const serviceChildren = children.filter(c => c.isLeaf);
  /* ================= TOGGLE ================= */
  function updatePathStatus(path, id, status) {
    return path.map(node => ({
      ...node,
      children: updateNodeStatus(node.children || [], id, status)
    }));
  }
  function updateNodeStatus(nodes, id, status) {
    return nodes.map(node => {
      if (node._id === id) {
        return {
          ...node,
          pricingStatus: status
        };
      }

      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: updateNodeStatus(
            node.children,
            id,
            status
          )
        };
      }

      return node;
    });
  }

  function updateNodeFields(nodes, id, fields) {
    return nodes.map(node => {
      if (node._id === id) {
        return {
          ...node,
          ...fields,
        };
      }

      if (node.children?.length) {
        return {
          ...node,
          children: updateNodeFields(node.children, id, fields),
        };
      }

      return node;
    });
  }

  function updatePathFields(pathNodes, id, fields) {
    return pathNodes.map(node => {
      const updatedNode = node._id === id
        ? { ...node, ...fields }
        : node;

      return {
        ...updatedNode,
        children: updateNodeFields(updatedNode.children || [], id, fields),
      };
    });
  }

  async function updateSelfManagedNode(nodeId, payload) {
    const response = await fetchWithAuth(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-menu/${vendorId}/nodes/${nodeId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || "Failed to update menu item");
    }

    return data?.node || null;
  }

  async function createSelfManagedNode(payload) {
    const response = await fetchWithAuth(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-menu/${vendorId}/nodes`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || "Failed to create menu item");
    }

    return data?.node || null;
  }
  const toggleStatus = async (service) => {
    const isActive = service.pricingStatus === "Active";

    if (isActive) {
      if (!window.confirm("Deactivate this service?")) return;

      // update full tree
      setRootNodes(nodes =>
        updateNodeFields(
          updateNodeStatus(nodes, service._id, "Inactive"),
          service._id,
          { price: "", offerText: "" }
        )
      );

      // ⭐ update currently opened path level
      setPath(p =>
        updatePathFields(
          updatePathStatus(p, service._id, "Inactive"),
          service._id,
          { price: "", offerText: "" }
        )
      );

      await updateService(service, "Inactive");

      return;
    }
    // 👉 INACTIVE → ACTIVATE
    setPendingService(service);
    setPendingServiceId(service._id);
    setActivationPrice(service.price || "");
    setActivationOfferText(service.offerText || "");
    const masterTerms = findTermsInCategoryTree(
      categoryTree,
      service.categoryId
    );

    const selected = parseTerms(service.terms);

    setAllTerms(masterTerms);
    setSelectedTerms(selected);
    setShowActivateModal(true);
  };
  const confirmActivateService = async () => {
    if (!pendingServiceId) return;   // safety

    if (isSelfManagedVendor) {
      await updateSelfManagedNode(pendingServiceId, {
        price: Number(activationPrice),
        pricingStatus: "Active",
      });
    } else {
      await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-price-nodes/update`, {
        method: "PUT",
        body: JSON.stringify({
          vendorPriceNodeId: pendingServiceId,
          price: Number(activationPrice),
          terms: selectedTerms.join(", "),
          offerText: activationOfferText,
          pricingStatus: "Active"
        })
      });
    }

    if (pendingService) {
      pendingService.price = Number(activationPrice);
      pendingService.pricingStatus = "Active";
      pendingService.terms = selectedTerms.join(", ");
      pendingService.offerText = activationOfferText;
    }

    setRootNodes([...rootNodes]);
    await onPricingUpdated?.();
    setShowActivateModal(false);
    setPendingService(null);
    setPendingServiceId(null);
  };
  const sortedChildren = [...serviceChildren].sort((a, b) => {
    const aActive = a.pricingStatus === "Active";
    const bActive = b.pricingStatus === "Active";
    if (aActive === bActive) return 0;
    return aActive ? -1 : 1;
  });
async function updateService(service, status) {
  if (isSelfManagedVendor) {
    await updateSelfManagedNode(service._id, {
      price: status === "Inactive" ? null : Number(service.price),
      offerText: status === "Inactive" ? "" : service.offerText || "",
      pricingStatus: status,
    });
    await onPricingUpdated?.();
    return;
  }
  await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-price-nodes/update`, {
      method: "PUT",
      body: JSON.stringify({
        vendorPriceNodeId: service._id,
        price: status === "Inactive" ? null : Number(service.price),
        offerText: status === "Inactive" ? "" : service.offerText || "",
        pricingStatus: status   // ⭐ use param
      })
  });
  await onPricingUpdated?.();
}

  const shouldUseVirtualParents =
    categoryChildren.length > 0 && serviceChildren.length > 0;

  const isCustomPackagesScreen = currentNode?._isCustomRoot === true;
  const showCustomEntry =
    !isCustomPackagesScreen &&
    currentNode?.name === "Packages";

  const displayCategories = [
    ...(showCustomEntry
      ? [{
          _id: "custom-packages-entry",
          name: "Custom Packages",
          _isCustomEntry: true,
        }]
      : []),
    ...categoryChildren,
    ...(
      shouldUseVirtualParents && !currentNode?._isVirtualParent
        ? serviceChildren.map(s => ({
          ...s,
          _isVirtualParent: true
        }))
        : []
    )
  ];
  const customPackageContext = getCustomPackageContext(path);
  const customPackageRoots = getCurrentCustomPackages(customTree, customPackageContext);
  const activeCustomPackageRoots = customPackageRoots.filter(
    node => !node.isDeleted && node.pricingStatus === "Active"
  );
  const inactiveCustomPackageRoots = customPackageRoots.filter(
    node => node.isDeleted || node.pricingStatus !== "Active"
  );

  const canEditCurrentSectionImage =
    isSelfManagedVendor &&
    !showingRoot &&
    !currentNode?._isCustomRoot &&
    !currentNode?.isLeaf;
  const canAddSelfManagedNode =
    isSelfManagedVendor &&
    !isCustomPackagesScreen &&
    (showingRoot || !currentNode?.isLeaf);

  function openCreateCustomModal() {
    setCustomModalMode("create");
    setCustomForm(defaultCustomForm());
    setShowCustomModal(true);
  }

  function openEditCustomModal(node) {
    const childVariants = (node.children || []).map(child => ({
      id: child._id,
      name: child.name || "",
      price: String(child.price ?? ""),
      imageUrl: child.imageUrl || "",
      packagesIncludes: child.packagesIncludes || "",
      terms: child.terms || "",
      pricingStatus: child.pricingStatus || "Inactive",
      isDeleted: Boolean(child.isDeleted),
    }));
    const hasChildren = childVariants.length > 0;
    setCustomModalMode("edit");
    setCustomForm({
      id: node._id,
      packageType: hasChildren ? "nested" : "single",
      name: node.name || "",
      imageUrl: node.imageUrl || "",
      packagesIncludes: node.packagesIncludes || "",
      terms: node.terms || "",
      price: hasChildren ? "" : String(node.price ?? ""),
      variants: hasChildren
        ? childVariants
        : defaultCustomForm().variants,
    });
    setShowCustomModal(true);
  }

  function updateCustomForm(field, value) {
    setCustomForm(prev => ({ ...prev, [field]: value }));
  }

  function updateVariant(index, field, value) {
    setCustomForm(prev => ({
      ...prev,
      variants: prev.variants.map((variant, variantIndex) =>
        variantIndex === index
          ? { ...variant, [field]: value }
          : variant
      ),
    }));
  }

  function addVariant() {
    setCustomForm(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        defaultVariantForm(),
      ],
    }));
  }

  function removeVariant(index) {
    setCustomForm(prev => ({
      ...prev,
      variants: prev.variants.flatMap((variant, variantIndex) => {
        if (variantIndex !== index) return [variant];
        if (!variant.id) return [];
        return [{
          ...variant,
          pricingStatus: "Inactive",
          isDeleted: false,
        }];
      }),
    }));
  }

  function reactivateVariant(index) {
    setCustomForm(prev => ({
      ...prev,
      variants: prev.variants.map((variant, variantIndex) =>
        variantIndex === index
          ? {
              ...variant,
              pricingStatus: "Active",
              isDeleted: false,
            }
          : variant
      ),
    }));
  }

  async function uploadImageAndGetUrl(file) {
    if (!file || !vendorId) throw new Error("File or vendor missing");
    const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folderType", "newvendor");
    formData.append("hierarchy", JSON.stringify([
      "custom-packages",
      String(vendorId),
      `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ]));
    const res = await fetch(endpoint, { method: "POST", body: formData });
    const json = await res.json();
    if (!res.ok || json?.success === false) {
      throw new Error(json?.message || json?.error || "Upload failed");
    }
    return json?.url || "";
  }

  async function handleUploadMainImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setUploadingMainImage(true);
      const url = await uploadImageAndGetUrl(file);
      const cacheBustedUrl = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
      updateCustomForm("imageUrl", cacheBustedUrl);
    } catch (err) {
      window.alert(err.message || "Failed to upload image");
    } finally {
      setUploadingMainImage(false);
    }
  }

  async function handleUploadVariantImage(event, index) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setUploadingVariantIndex(index);
      const url = await uploadImageAndGetUrl(file);
      const cacheBustedUrl = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
      updateVariant(index, "imageUrl", cacheBustedUrl);
    } catch (err) {
      window.alert(err.message || "Failed to upload image");
    } finally {
      setUploadingVariantIndex(null);
    }
  }

  async function handleUploadSectionImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setUploadingSectionImage(true);
      const url = await uploadImageAndGetUrl(file);
      const cacheBustedUrl = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
      setSectionImageUrl(cacheBustedUrl);
    } catch (err) {
      window.alert(err.message || "Failed to upload image");
    } finally {
      setUploadingSectionImage(false);
    }
  }

  async function handleUploadAddNodeImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setUploadingAddNodeImage(true);
      const url = await uploadImageAndGetUrl(file);
      const cacheBustedUrl = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
      setAddNodeImageUrl(cacheBustedUrl);
    } catch (err) {
      window.alert(err.message || "Failed to upload image");
    } finally {
      setUploadingAddNodeImage(false);
    }
  }

  async function handleUploadEditServiceImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setUploadingEditServiceImage(true);
      const url = await uploadImageAndGetUrl(file);
      const cacheBustedUrl = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
      setModalImageUrl(cacheBustedUrl);
    } catch (err) {
      window.alert(err.message || "Failed to upload image");
    } finally {
      setUploadingEditServiceImage(false);
    }
  }

  function openSectionEditModal() {
    setSectionName(currentNode?.name || "");
    setSectionImageUrl(currentNode?.imageUrl || "");
    setShowImageLibrary(false);
    setImageLibrarySearch(currentNode?.name || "");
    setImageLibraryItems([]);
    setImageLibraryError("");
    setShowSectionEditModal(true);
  }

  async function loadImageLibrary(searchText = imageLibrarySearch) {
    if (!rootCategoryId) {
      setImageLibraryError("Root category is missing");
      return;
    }

    try {
      setLoadingImageLibrary(true);
      setImageLibraryError("");
      const params = new URLSearchParams({
        rootCategoryId: String(rootCategoryId),
      });
      const query = String(searchText || "").trim();
      if (query) params.set("q", query);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/menu-image-library?${params.toString()}`,
        { cache: "no-store" }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Failed to load image library");
      }

      setImageLibraryItems(Array.isArray(data?.items) ? data.items : []);
    } catch (error) {
      setImageLibraryItems([]);
      setImageLibraryError(error.message || "Failed to load image library");
    } finally {
      setLoadingImageLibrary(false);
    }
  }

  function handleToggleImageLibrary() {
    const nextVisible = !showImageLibrary;
    setShowImageLibrary(nextVisible);
    if (nextVisible && imageLibraryItems.length === 0) {
      loadImageLibrary(imageLibrarySearch || sectionName);
    }
  }

  function openEditCategoryModal(node) {
    setEditingCategoryNode(node);
    setEditCategoryName(node?.name || "");
    setShowEditCategoryModal(true);
  }

  function openAddNodeModal() {
    setAddNodeType("subcategory");
    setAddNodeName("");
    setAddNodePrice("");
    setAddNodeTerms("");
    setAddNodeImageUrl("");
    setShowAddNodeModal(true);
  }

  async function handleSaveSectionImage() {
    if (!currentNode?._id) return;

    try {
      await updateSelfManagedNode(currentNode._id, {
        name: sectionName,
        imageUrl: sectionImageUrl,
      });

      setRootNodes(nodes =>
        updateNodeFields(nodes, currentNode._id, {
          name: sectionName,
          imageUrl: sectionImageUrl,
        })
      );
      setPath(prev =>
        updatePathFields(prev, currentNode._id, {
          name: sectionName,
          imageUrl: sectionImageUrl,
        })
      );
      setShowSectionEditModal(false);
      await onPricingUpdated?.();
    } catch (error) {
      window.alert(error.message || "Failed to save section image");
    }
  }

  async function handleSaveCategoryName() {
    if (!editingCategoryNode?._id) return;

    try {
      await updateSelfManagedNode(editingCategoryNode._id, {
        name: editCategoryName,
      });

      setRootNodes(nodes =>
        updateNodeFields(nodes, editingCategoryNode._id, { name: editCategoryName })
      );
      setPath(prev =>
        updatePathFields(prev, editingCategoryNode._id, { name: editCategoryName })
      );
      setShowEditCategoryModal(false);
      setEditingCategoryNode(null);
      await onPricingUpdated?.();
    } catch (error) {
      window.alert(error.message || "Failed to update category name");
    }
  }

  async function handleCreateSelfManagedNode() {
    const trimmedName = addNodeName.trim();
    if (!trimmedName) {
      window.alert("Name is required");
      return;
    }

    try {
      setAddingNode(true);
      await createSelfManagedNode({
        parentNodeId: showingRoot ? null : currentNode?._id || null,
        nodeType: addNodeType,
        name: trimmedName,
        price:
          addNodeType === "service"
            ? (String(addNodePrice || "").trim() === "" ? null : Number(addNodePrice))
            : null,
        terms: addNodeTerms.trim(),
        imageUrl: addNodeImageUrl,
      });

      await reloadSelfManagedTree(path);
      setShowAddNodeModal(false);
      await onPricingUpdated?.();
    } catch (error) {
      window.alert(error.message || "Failed to add menu item");
    } finally {
      setAddingNode(false);
    }
  }

  async function createCustomNode(payload) {
    const response = await fetchWithAuth(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-custom-packages`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || "Failed to create custom package");
    }
    return data.data;
  }

  async function updateCustomNode(nodeId, payload) {
    const response = await fetchWithAuth(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-custom-packages/${nodeId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || "Failed to update custom package");
    }
    return data.data;
  }

  async function updateCustomNodeStatus(nodeId, pricingStatus) {
    const response = await fetchWithAuth(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-custom-packages/${nodeId}/status`,
      {
        method: "PUT",
        body: JSON.stringify({
          vendorId,
          rootCategoryId,
          pricingStatus,
        }),
      }
    );
    const raw = await response.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error("Failed to update custom package status");
    }
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || "Failed to update custom package status");
    }
    return data;
  }

  async function restoreCustomNode(nodeId) {
    return updateCustomNode(nodeId, {
      vendorId,
      rootCategoryId,
      pricingStatus: "Active",
      restoreDeleted: true,
      isDeleted: false,
    });
  }

  async function deleteCustomNode(nodeId) {
    const response = await fetchWithAuth(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-custom-packages/${nodeId}?vendorId=${vendorId}&rootCategoryId=${rootCategoryId}`,
      {
        method: "DELETE",
      }
    );
    const data = await response.json();
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || "Failed to delete custom package");
    }
    return data;
  }

  async function handleToggleCustomPackage(node) {
    try {
      if (node.isDeleted) {
        await restoreCustomNode(node._id);
      } else {
        const nextStatus = node.pricingStatus === "Active" ? "Inactive" : "Active";
        await updateCustomNodeStatus(node._id, nextStatus);
      }
      await loadCustomPackages();
      await onPricingUpdated?.();
    } catch (error) {
      window.alert(error.message || "Failed to update custom package");
    }
  }

  async function handleSaveCustomPackage() {
    if (!customPackageContext) return;

    const trimmedName = customForm.name.trim();
    if (!trimmedName) {
      window.alert("Package name is required");
      return;
    }

    if (customForm.packageType === "nested") {
      const validVariants = customForm.variants.filter(
        variant =>
          variant.pricingStatus === "Active" &&
          variant.name.trim()
      );
      if (validVariants.length === 0) {
        window.alert("Add at least one active variant with a name");
        return;
      }
    }

    setSavingCustomPackage(true);
    try {
      if (customForm.packageType === "single") {
        if (customModalMode === "edit" && customForm.id) {
          await updateCustomNode(customForm.id, {
            vendorId,
            rootCategoryId,
            name: trimmedName,
            imageUrl: customForm.imageUrl,
            packagesIncludes: customForm.packagesIncludes,
            terms: customForm.terms,
            price: customForm.price === "" ? null : Number(customForm.price),
            pricingStatus: "Active",
            visibleToUser: true,
            visibleToVendor: true,
          });
        } else {
          await createCustomNode({
            vendorId,
            rootCategoryId,
            parentNodeType: customPackageContext.parentNodeType,
            parentNodeId: customPackageContext.parentNodeId,
            name: trimmedName,
            imageUrl: customForm.imageUrl,
            nodeType: "package_item",
            isLeaf: true,
            packagesIncludes: customForm.packagesIncludes,
            terms: customForm.terms,
            price: customForm.price === "" ? null : Number(customForm.price),
            pricingStatus: "Active",
            visibleToUser: true,
            visibleToVendor: true,
            sequence: customPackageRoots.length,
          });
        }
      } else {
        let parentNodeId = customForm.id;

        if (customModalMode === "edit" && customForm.id) {
          await updateCustomNode(customForm.id, {
            vendorId,
            rootCategoryId,
            name: trimmedName,
            imageUrl: customForm.imageUrl,
            packagesIncludes: customForm.packagesIncludes,
            terms: customForm.terms,
            pricingStatus: "Active",
            visibleToUser: true,
            visibleToVendor: true,
          });
        } else {
          const createdParent = await createCustomNode({
            vendorId,
            rootCategoryId,
            parentNodeType: customPackageContext.parentNodeType,
            parentNodeId: customPackageContext.parentNodeId,
            name: trimmedName,
            imageUrl: customForm.imageUrl,
            nodeType: "package_group",
            isLeaf: false,
            packagesIncludes: customForm.packagesIncludes,
            terms: customForm.terms,
            pricingStatus: "Active",
            visibleToUser: true,
            visibleToVendor: true,
            sequence: customPackageRoots.length,
          });
          parentNodeId = createdParent._id;
        }

        const existingVariants = (customPackageRoots.find(pkg => pkg._id === customForm.id)?.children || []);

        for (let index = 0; index < customForm.variants.length; index += 1) {
          const variant = customForm.variants[index];
          const shouldBeActive =
            variant.pricingStatus === "Active" &&
            variant.name.trim();

          if (variant.id) {
            const variantPayload = {
              vendorId,
              rootCategoryId,
              name: variant.name.trim(),
              imageUrl: variant.imageUrl,
              packagesIncludes: variant.packagesIncludes,
              terms: variant.terms,
              price:
                shouldBeActive && variant.price !== ""
                  ? Number(variant.price)
                  : null,
              pricingStatus: shouldBeActive ? "Active" : "Inactive",
              visibleToUser: true,
              visibleToVendor: true,
              sequence: index,
            };

            if (variant.isDeleted === true) {
              variantPayload.restoreDeleted = true;
              variantPayload.isDeleted = false;
            }

            await updateCustomNode(variant.id, variantPayload);
          } else if (shouldBeActive) {
            await createCustomNode({
              vendorId,
              rootCategoryId,
              parentNodeType: "custom_package",
              parentNodeId,
              name: variant.name.trim(),
              imageUrl: variant.imageUrl,
              nodeType: "package_item",
              isLeaf: true,
              packagesIncludes: variant.packagesIncludes,
              terms: variant.terms,
              price: variant.price === "" ? null : Number(variant.price),
              pricingStatus: "Active",
              visibleToUser: true,
              visibleToVendor: true,
              sequence: index,
            });
          }
        }
      }

      await loadCustomPackages();
      await onPricingUpdated?.();
      setShowCustomModal(false);
      setCustomForm(defaultCustomForm());
    } catch (error) {
      window.alert(error.message || "Failed to save custom package");
    } finally {
      setSavingCustomPackage(false);
    }
  }

  return (
    <div className="packages-overlay">
      <div className="packages-card">
        <div className="pricing-source-card">
          <div className="pricing-source-copy">
            <div className="pricing-source-label">Pricing Source</div>
            <div className="pricing-source-title">
              {isSelfManagedVendor ? "My Menu is active" : "Standard Menu is active"}
            </div>
            <p className="pricing-source-help">
              Choose which pricing setup should be used in preview and dashboard prices.
            </p>
          </div>

          <div className="pricing-source-options" role="radiogroup" aria-label="Pricing source">
            <label className={`pricing-source-option ${!isSelfManagedVendor ? "active" : ""}`}>
              <input
                type="radio"
                name="pricing-source"
                checked={!isSelfManagedVendor}
                disabled={switchingSource}
                onChange={() => handleSwitchPricingSource("standard")}
              />
              <span className="pricing-source-radio" aria-hidden="true" />
              <span className="pricing-source-option-copy">
                <span className="pricing-source-option-title">Standard Menu</span>
                <span className="pricing-source-option-desc">
                  Use the admin-managed pricing structure.
                </span>
              </span>
            </label>

            <label className={`pricing-source-option ${isSelfManagedVendor ? "active" : ""}`}>
              <input
                type="radio"
                name="pricing-source"
                checked={isSelfManagedVendor}
                disabled={switchingSource}
                onChange={() => handleSwitchPricingSource("self_managed")}
              />
              <span className="pricing-source-radio" aria-hidden="true" />
              <span className="pricing-source-option-copy">
                <span className="pricing-source-option-title">My Menu</span>
                <span className="pricing-source-option-desc">
                  Use the uploaded self-managed hierarchy and pricing.
                </span>
              </span>
            </label>
          </div>
        </div>

        {isSelfManagedVendor ? (
          <div className="self-menu-import-card">
            <div>
              <div className="pricing-source-label">Menu Import</div>
              <div className="self-menu-import-title">Upload My Menu file</div>
              <p>
                Admin-only option to replace the current self-managed menu with an Excel upload.
              </p>
              {menuImportMessage ? (
                <p className="self-menu-import-message">{menuImportMessage}</p>
              ) : null}
            </div>

            <div className="self-menu-import-actions">
              {menuImportAdminUnlocked ? (
                <label className={`self-menu-import-btn ${importingMenuFile ? "disabled" : ""}`}>
                  <input
                    type="file"
                    accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    disabled={importingMenuFile}
                    onChange={handleImportSelfManagedMenuFile}
                  />
                  {importingMenuFile ? "Importing..." : "Choose Excel File"}
                </label>
              ) : (
                <button
                  type="button"
                  className="self-menu-import-btn"
                  onClick={() => setShowMenuImportAdminModal(true)}
                >
                  Admin Unlock
                </button>
              )}
            </div>
          </div>
        ) : null}

        {/* HEADER */}
        <div className="services-header">
          <span
            className="back-arrow"
            onClick={() => path.length ? setPath(path.slice(0, -1)) : onClose()}
          >
            ←
          </span>
          <div className="header-text">
            <h2>{showingRoot ? "Packages" : currentNode.name}</h2>
            <p className="section-path">
              {showingRoot
                ? "You are viewing: Category"
                : `You are viewing: ${path.map(p => p.name).join(" > ")}`}
            </p>
          </div>
          {canEditCurrentSectionImage ? (
            <div className="section-image-tools">
              <div className={`section-image-status ${currentNode?.imageUrl ? "has-image" : "empty"}`}>
                {currentNode?.imageUrl ? (
                  <>
                    <img src={currentNode.imageUrl} alt={`${currentNode.name} section`} />
                    <div className="section-image-meta">
                      <span className="section-image-title">Section image added</span>
                      <span className="section-image-subtitle">This image will be used in preview for this section.</span>
                    </div>
                  </>
                ) : (
                  <div className="section-image-meta">
                    <span className="section-image-title">No section image</span>
                    <span className="section-image-subtitle">Add one image for {currentNode.name}.</span>
                  </div>
                )}
              </div>
              <button
                className="btn-secondary btn-secondary-compact"
                type="button"
                onClick={openSectionEditModal}
              >
                Edit Image
              </button>
            </div>
          ) : null}
          {canAddSelfManagedNode ? (
            <button
              className="btn-primary btn-primary-compact"
              type="button"
              onClick={openAddNodeModal}
            >
              Add Item
            </button>
          ) : null}
        </div>
        {!isCustomPackagesScreen && displayCategories.map(node => (
          <div
            key={node._id}
            className="subcategory-title"
            onClick={() => {
              if (node._isCustomEntry) {
                setPath([...path, { _id: "custom-packages-root", name: "Custom Packages", _isCustomRoot: true }]);
                return;
              }
              if (node._isVirtualParent) {
                setPath([...path, { ...node, children: [node] }]);
              } else {
                setPath([...path, node]);
              }
            }}
          >
            <span className="subcategory-title-text">{node.name}</span>
            {isSelfManagedVendor && !node._isCustomEntry ? (
              <button
                type="button"
                className="subcategory-edit-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  openEditCategoryModal(node);
                }}
              >
                Edit
              </button>
            ) : null}
          </div>
        ))}
        {!isCustomPackagesScreen && displayCategories.length === 0 && serviceChildren.length > 0 && (() => {
          const activeServices = sortedChildren.filter(
            s => s.pricingStatus === "Active"
          );

          const inactiveServices = sortedChildren.filter(
            s => s.pricingStatus === "Inactive"
          );

          return (

            <section className="services-section">

              {/* ACTIVE SERVICES */}
              {activeServices.length > 0 && (
                <>
                  <div className="section-title">Active Services</div>

                  <div className="services-list">
                    {activeServices.map(service => (
                      <ServiceCard
                        key={service._id}
                        service={service}
                        isActive
                        toggleStatus={toggleStatus}
                        isOffer={isSelfManagedVendor ? false : isFreeTextEnabled(categoryTree, service.categoryId)}
                        onEdit={() => {
                          setEditingService(service);
                          setEditCategoryName(service.name || "");
                          setModalPrice(service.price || "");
                          setModalTerms(service.terms || "");
                          setModalImageUrl(service.imageUrl || "");
                          setModalOfferText(service.offerText || "");

                          const masterTerms = findTermsInCategoryTree(
                            categoryTree,
                            service.categoryId
                          );

                          const selected = parseTerms(service.terms);

                          setAllTerms(masterTerms);
                          setSelectedTerms(selected);

                          setShowEditModal(true);
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* ⭐ INACTIVE BELOW ACTIVE — SAME LEVEL */}
              {inactiveServices.length > 0 && (
                <>
                  <div className="section-title inactive">
                    Inactive Services
                  </div>

                  <div className="services-list inactive-list">
                    {inactiveServices.map(service => (
                      <ServiceCard
                        key={service._id}
                        service={service}
                        isActive={false}
                        toggleStatus={toggleStatus}
                        onEdit={() => {
                          setEditingService(service);
                          setEditCategoryName(service.name || "");
                          setModalPrice(service.price || "");
                          setModalTerms(service.terms || "");
                          setModalImageUrl(service.imageUrl || "");
                          setModalOfferText(service.offerText || "");
                          setAllTerms([]);
                          setSelectedTerms([]);
                          setShowEditModal(true);
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>
          );
        })()}
        {isCustomPackagesScreen && (
          <section className="services-section custom-packages-section custom-packages-top-section">
            <div className="custom-packages-header">
              <div>
                <div className="section-title">Custom Packages</div>
                <div className="custom-packages-subtitle">
                  Add vendor-specific packages for {customPackageContext?.sectionLabel || "this section"}.
                </div>
              </div>
              <button
                className="custom-package-create"
                onClick={openCreateCustomModal}
              >
                + Create Custom Package
              </button>
            </div>

            {customPackageRoots.length === 0 ? (
              <div className="custom-packages-empty">
                No custom packages yet for this package section.
              </div>
            ) : (
              <>
                {activeCustomPackageRoots.length > 0 && (
                  <>
                    <div className="section-title">Active Custom Packages</div>
                    <div className="services-list custom-packages-list">
                      {activeCustomPackageRoots.map(customPackage => (
                        <CustomPackageCard
                          key={customPackage._id}
                          customPackage={customPackage}
                          isActive
                          onEdit={() => openEditCustomModal(customPackage)}
                          onToggle={() => handleToggleCustomPackage(customPackage)}
                        />
                      ))}
                    </div>
                  </>
                )}

                {inactiveCustomPackageRoots.length > 0 && (
                  <>
                    <div className="section-title inactive">Inactive Custom Packages</div>
                    <div className="services-list custom-packages-list inactive-list">
                      {inactiveCustomPackageRoots.map(customPackage => (
                        <CustomPackageCard
                          key={customPackage._id}
                          customPackage={customPackage}
                          isActive={false}
                          onEdit={
                            customPackage.isDeleted
                              ? null
                              : () => openEditCustomModal(customPackage)
                          }
                          onToggle={() => handleToggleCustomPackage(customPackage)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        )}
      </div >
      {
        showEditModal && editingService && (
          <Modal title="Edit Service" onClose={() => setShowEditModal(false)}>
            <label className="modal-label">Name</label>
            <input
              className="price-input"
              value={editCategoryName}
              onChange={e => setEditCategoryName(e.target.value)}
            />

            {isFreeTextEnabled(categoryTree, editingService.categoryId) ? (
              <>
                <label className="modal-label">Offer Text</label>
                <input
                  className="price-input"
                  value={modalOfferText}
                  onChange={e => setModalOfferText(e.target.value)}
                />
              </>
            ) : (
              <>
                <label className="modal-label">Price</label>
                <input
                  className="price-input"
                  value={modalPrice}
                  onChange={e => setModalPrice(e.target.value)}
                />
              </>
            )}
            <label className="modal-label">Terms (give multiple terms with a comma separator)</label>
            {allTerms.length > 0 ? (
              <div className="terms-checkbox-list">
                {allTerms.map(term => (
                  <label key={term} className="term-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedTerms.includes(term)}
                      onChange={() => {
                        const nextTerms = selectedTerms.includes(term)
                          ? selectedTerms.filter(t => t !== term)
                          : [...selectedTerms, term];
                        setSelectedTerms(nextTerms);
                        setModalTerms(nextTerms.join(", "));
                      }}
                    />
                    <span className="checkmark" />
                    <span className="term-text">{term}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                className="price-input"
                value={modalTerms}
                onChange={e => setModalTerms(e.target.value)}
                placeholder="Example: Age under 10 only, Weekends only, Base price only"
                rows={3}
              />
            )}
            <label className="modal-label">Image URL</label>
            <div className="image-row">
              <input
                className="price-input"
                value={modalImageUrl}
                onChange={e => setModalImageUrl(e.target.value)}
                placeholder="https://..."
              />
              <label className="upload-btn">
                {uploadingEditServiceImage ? "Uploading..." : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadEditServiceImage}
                  disabled={uploadingEditServiceImage}
                />
              </label>
            </div>
            {modalImageUrl ? (
              <div className="image-preview-row">
                <img src={modalImageUrl} alt={`${editCategoryName || "Service"} preview`} />
              </div>
            ) : null}
            <button
              className="btn-primary"
              onClick={async () => {
                if (!editingService) return; // safety
                const resolvedTerms =
                  allTerms.length > 0 ? selectedTerms.join(", ") : modalTerms.trim();
                editingService.price = Number(modalPrice);
                editingService.name = editCategoryName;
                editingService.pricingStatus = "Active";
                editingService.terms = resolvedTerms;
                editingService.imageUrl = modalImageUrl;
                editingService.offerText = modalOfferText;
                if (isSelfManagedVendor) {
                  await updateSelfManagedNode(editingService._id, {
                    name: editCategoryName,
                    price: Number(modalPrice),
                    pricingStatus: editingService.pricingStatus || "Active",
                    terms: resolvedTerms,
                    imageUrl: modalImageUrl || "",
                  });
                  setRootNodes(nodes =>
                    updateNodeFields(nodes, editingService._id, {
                      name: editCategoryName,
                      price: Number(modalPrice),
                      terms: resolvedTerms,
                      imageUrl: modalImageUrl,
                    })
                  );
                  setPath(prev =>
                    updatePathFields(prev, editingService._id, {
                      name: editCategoryName,
                      price: Number(modalPrice),
                      terms: resolvedTerms,
                      imageUrl: modalImageUrl,
                    })
                  );
                } else {
                  await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-price-nodes/update`, {
                    method: "PUT",
                    body: JSON.stringify({
                      vendorPriceNodeId: editingService._id,   // ✅ FIX
                      price: Number(modalPrice),               // ✅ FIX
                      terms: resolvedTerms,
                      offerText: modalOfferText,
                      pricingStatus: "Active"
                    })
                  });
                  setRootNodes([...rootNodes]);
                }
                await onPricingUpdated?.();
                setShowEditModal(false);
              }}
            >
              Save
            </button>
          </Modal>
        )
      }
      {
        showActivateModal && pendingService && (
          <Modal title="Activate Service" onClose={() => setShowActivateModal(false)}>

            {isFreeTextEnabled(categoryTree, pendingService.categoryId) ? (
              <>
                <label className="modal-label">Offer Text</label>
                <input
                  className="price-input"
                  value={activationOfferText}
                  onChange={e => setActivationOfferText(e.target.value)}
                />
              </>
            ) : (
              <>
                <label className="modal-label">Price</label>
                <input
                  className="price-input"
                  value={activationPrice}
                  onChange={e => setActivationPrice(e.target.value)}
                />
              </>
            )}

            {allTerms.length > 0 && (
              <>
                <label className="modal-label">Terms</label>

              <div className="terms-checkbox-list">
                {allTerms.map(term => (


                  <label key={term} className="term-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedTerms.includes(term)}
                      onChange={() => toggleTerm(term)}
                    />
                    <span className="checkmark" />
                    <span className="term-text">{term}</span>
                  </label>


                ))}
              </div>
              </>
            )}

            <button
              className="btn-primary"
              onClick={() => confirmActivateService(pendingService)}
            >
              Activate
            </button>
          </Modal>
        )
      }
      {
        showSectionEditModal && currentNode && (
          <Modal title="Edit Section Image" onClose={() => setShowSectionEditModal(false)}>
            <label className="modal-label">Section Name</label>
            <input
              className="price-input"
              value={sectionName}
              onChange={e => setSectionName(e.target.value)}
            />

            <label className="modal-label">Image URL</label>
            <div className="image-row">
              <input
                className="price-input"
                value={sectionImageUrl}
                onChange={e => setSectionImageUrl(e.target.value)}
                placeholder="https://..."
              />
              <label className={`upload-btn ${showImageLibrary ? "disabled" : ""}`}>
                {showImageLibrary
                  ? "Upload Disabled"
                  : uploadingSectionImage
                    ? "Uploading..."
                    : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadSectionImage}
                  disabled={uploadingSectionImage || showImageLibrary}
                />
              </label>
            </div>
            <div className="image-source-actions">
              <button
                type="button"
                className="library-toggle-btn"
                onClick={handleToggleImageLibrary}
              >
                {showImageLibrary ? "Hide Library" : "Choose from Library"}
              </button>
              <span className="image-source-hint">
                Matching images load as you type. We search by any word from this section name, like hair, spa, shampoo, facial, or bridal.
              </span>
            </div>
            {sectionImageUrl ? (
              <div className="image-preview-row">
                <img src={sectionImageUrl} alt={`${currentNode.name} preview`} />
              </div>
            ) : null}

            <div className="section-image-save-row">
              <button className="btn-primary" onClick={handleSaveSectionImage}>
                Save
              </button>
            </div>
            {showImageLibrary && (
              <div className="image-library-panel">
                <div className="image-library-search">
                  <input
                    className="price-input"
                    value={imageLibrarySearch}
                    onChange={event => setImageLibrarySearch(event.target.value)}
                    placeholder="Search library images..."
                  />
                  <button
                    type="button"
                    className="upload-btn"
                    onClick={() => loadImageLibrary(imageLibrarySearch)}
                    disabled={loadingImageLibrary}
                  >
                    {loadingImageLibrary ? "Searching..." : "Refresh"}
                  </button>
                </div>
                <div className="image-library-count">
                  {loadingImageLibrary
                    ? "Searching image library..."
                    : `${imageLibraryItems.length} matching image${imageLibraryItems.length === 1 ? "" : "s"} found`}
                </div>
                {imageLibraryError ? (
                  <div className="image-library-message error">{imageLibraryError}</div>
                ) : null}
                {!imageLibraryError && !loadingImageLibrary && imageLibraryItems.length === 0 ? (
                  <div className="image-library-message">
                    No matching images found. Try a broader word like hair, makeup, facial, or bridal.
                  </div>
                ) : null}
                <div className="image-library-grid">
                  {imageLibraryItems.map(item => (
                    <button
                      type="button"
                      key={item.id}
                      className={`image-library-card ${sectionImageUrl === item.imageUrl ? "selected" : ""}`}
                      onClick={() => setSectionImageUrl(item.imageUrl)}
                    >
                      <img src={item.imageUrl} alt={item.name} />
                      <span className="image-library-card-name">{item.name}</span>
                      <span className="image-library-card-path">{item.pathLabel}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Modal>
        )
      }
      {
        showEditCategoryModal && editingCategoryNode && (
          <Modal title="Edit Subcategory" onClose={() => setShowEditCategoryModal(false)}>
            <label className="modal-label">Subcategory Name</label>
            <input
              className="price-input"
              value={editCategoryName}
              onChange={e => setEditCategoryName(e.target.value)}
            />

            <button className="btn-primary" onClick={handleSaveCategoryName}>
              Save
            </button>
          </Modal>
        )
      }
      {
        showAddNodeModal && (
          <Modal
            title={
              showingRoot
                ? "Add Top-Level Item"
                : `Add Item Under ${currentNode?.name || "This Section"}`
            }
            onClose={() => setShowAddNodeModal(false)}
          >
            <label className="modal-label">Add Type</label>
            <div className="custom-package-type-toggle">
              <button
                className={`type-pill ${addNodeType === "subcategory" ? "active" : ""}`}
                onClick={() => setAddNodeType("subcategory")}
                type="button"
              >
                Subcategory
              </button>
              <button
                className={`type-pill ${addNodeType === "service" ? "active" : ""}`}
                onClick={() => setAddNodeType("service")}
                type="button"
              >
                Service
              </button>
            </div>

            <label className="modal-label">Name</label>
            <input
              className="price-input"
              value={addNodeName}
              onChange={e => setAddNodeName(e.target.value)}
              placeholder={addNodeType === "service" ? "Enter service name" : "Enter subcategory name"}
            />

            {addNodeType === "service" ? (
              <>
                <label className="modal-label">Price</label>
                <input
                  className="price-input"
                  value={addNodePrice}
                  onChange={e => setAddNodePrice(e.target.value)}
                  placeholder="Enter price"
                />
              </>
            ) : null}

            <label className="modal-label">Terms (give multiple terms with a comma separator)</label>
            <textarea
              className="price-input"
              value={addNodeTerms}
              onChange={e => setAddNodeTerms(e.target.value)}
              placeholder="Example: Age under 10 only, Weekends only, Base price only"
              rows={3}
            />

            <label className="modal-label">Image URL (Optional)</label>
            <div className="image-row">
              <input
                className="price-input"
                value={addNodeImageUrl}
                onChange={e => setAddNodeImageUrl(e.target.value)}
                placeholder="https://..."
              />
              <label className="upload-btn">
                {uploadingAddNodeImage ? "Uploading..." : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadAddNodeImage}
                  disabled={uploadingAddNodeImage}
                />
              </label>
            </div>

            {addNodeImageUrl ? (
              <div className="image-preview-row">
                <img src={addNodeImageUrl} alt="New node preview" />
              </div>
            ) : null}

            <button
              className="btn-primary"
              onClick={handleCreateSelfManagedNode}
              disabled={addingNode}
            >
              {addingNode ? "Saving..." : "Create"}
            </button>
          </Modal>
        )
      }
      {showMenuImportAdminModal && (
        <Modal title="Admin Verification" onClose={() => setShowMenuImportAdminModal(false)}>
          <label className="modal-label">Admin Passcode</label>
          <input
            className="price-input"
            type="password"
            value={menuImportAdminPasscode}
            onChange={e => setMenuImportAdminPasscode(e.target.value)}
            placeholder="Enter admin passcode"
            autoFocus
          />

          <button
            className="btn-primary"
            onClick={handleVerifyMenuImportAdmin}
            disabled={verifyingMenuImportAdmin}
          >
            {verifyingMenuImportAdmin ? "Verifying..." : "Unlock Import"}
          </button>
        </Modal>
      )}
      {showCustomModal && (
        <Modal
          title={customModalMode === "edit" ? "Edit Custom Package" : "Create Custom Package"}
          onClose={() => setShowCustomModal(false)}
        >
          <div className="modal-scroll">
            <label className="modal-label">Package Type</label>
            <div className="custom-package-type-toggle">
              <button
                className={`type-pill ${customForm.packageType === "single" ? "active" : ""}`}
                onClick={() => updateCustomForm("packageType", "single")}
                type="button"
              >
                Single Package
              </button>
              <button
                className={`type-pill ${customForm.packageType === "nested" ? "active" : ""}`}
                onClick={() => updateCustomForm("packageType", "nested")}
                type="button"
              >
                Package With Variants
              </button>
            </div>

            <label className="modal-label">Package Name</label>
            <input
              className="price-input"
              value={customForm.name}
              onChange={e => updateCustomForm("name", e.target.value)}
            />

            <label className="modal-label">Package Includes</label>
            <textarea
              className="price-input custom-textarea"
              value={customForm.packagesIncludes}
              onChange={e => updateCustomForm("packagesIncludes", e.target.value)}
              placeholder="Hair Spa, Hair Cut, Hair Wash"
            />

            <label className="modal-label">Terms</label>
            <textarea
              className="price-input custom-textarea"
              value={customForm.terms}
              onChange={e => updateCustomForm("terms", e.target.value)}
            />

            <label className="modal-label">Image URL</label>
            <div className="image-row">
              <input
                className="price-input"
                value={customForm.imageUrl}
                onChange={e => updateCustomForm("imageUrl", e.target.value)}
                placeholder="https://..."
              />
              <label className="upload-btn">
                {uploadingMainImage ? "Uploading..." : "Upload"}
                <input type="file" accept="image/*" onChange={handleUploadMainImage} disabled={uploadingMainImage} />
              </label>
            </div>
            {customForm.imageUrl && (
              <div className="image-preview-row">
                <img src={customForm.imageUrl} alt="Package preview" />
              </div>
            )}

            {customForm.packageType === "single" ? (
              <>
                <label className="modal-label">Price</label>
                <input
                  className="price-input"
                  value={customForm.price}
                  onChange={e => updateCustomForm("price", e.target.value)}
                />
              </>
            ) : (
              <div className="variants-editor">
                <div className="variants-header">
                  <span className="modal-label variants-title">Variants</span>
                  <button
                    type="button"
                    className="custom-package-create small"
                    onClick={addVariant}
                  >
                    + Add Variant
                  </button>
                </div>

                {customForm.variants
                  .filter(variant => variant.pricingStatus === "Active")
                  .map((variant) => {
                    const index = customForm.variants.indexOf(variant);
                    return (
                  <div className="variant-card" key={variant.id || `variant-${index}`}>
                    <div className="variant-card-header">
                      <span>Variant {index + 1}</span>
                      {customForm.variants.filter(item => item.pricingStatus === "Active").length > 1 && (
                        <button
                          type="button"
                          className="variant-remove"
                          onClick={() => removeVariant(index)}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <label className="modal-label">Name</label>
                    <input
                      className="price-input"
                      value={variant.name}
                      onChange={e => updateVariant(index, "name", e.target.value)}
                    />

                    <label className="modal-label">Image URL</label>
                    <div className="image-row">
                      <input
                        className="price-input"
                        value={variant.imageUrl}
                        onChange={e => updateVariant(index, "imageUrl", e.target.value)}
                        placeholder="https://..."
                      />
                      <label className="upload-btn">
                        {uploadingVariantIndex === index ? "Uploading..." : "Upload"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleUploadVariantImage(e, index)}
                          disabled={uploadingVariantIndex === index}
                        />
                      </label>
                    </div>
                    {variant.imageUrl && (
                      <div className="image-preview-row">
                        <img src={variant.imageUrl} alt={`Variant ${index + 1}`} />
                      </div>
                    )}

                    <label className="modal-label">Price</label>
                    <input
                      className="price-input"
                      value={variant.price}
                      onChange={e => updateVariant(index, "price", e.target.value)}
                    />

                    <label className="modal-label">Package Includes</label>
                    <textarea
                      className="price-input custom-textarea"
                      value={variant.packagesIncludes}
                      onChange={e => updateVariant(index, "packagesIncludes", e.target.value)}
                    />

                    <label className="modal-label">Terms</label>
                    <textarea
                      className="price-input custom-textarea"
                      value={variant.terms}
                      onChange={e => updateVariant(index, "terms", e.target.value)}
                    />
                  </div>
                    );
                  })}

                {customForm.variants.some(variant => variant.pricingStatus !== "Active") && (
                  <div className="inactive-variants-section">
                    <div className="section-title inactive">Inactive Variants</div>
                    {customForm.variants
                      .filter(variant => variant.pricingStatus !== "Active")
                      .map((variant) => {
                        const index = customForm.variants.indexOf(variant);
                        return (
                          <div className="variant-card inactive-variant-card" key={variant.id || `inactive-variant-${index}`}>
                            <div className="variant-card-header">
                              <span>{variant.name || `Variant ${index + 1}`}</span>
                              <button
                                type="button"
                                className="custom-package-create small"
                                onClick={() => reactivateVariant(index)}
                              >
                                Reactivate
                              </button>
                            </div>
                            <div className="inactive-variant-meta">
                              {variant.price ? `Rs ${variant.price}` : "No price"}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            className="btn-primary"
            onClick={handleSaveCustomPackage}
            disabled={savingCustomPackage}
          >
            {savingCustomPackage ? "Saving..." : "Save Custom Package"}
          </button>
        </Modal>
      )}
    </div>
  );
}
/* ================= SERVICE CARD ================= */
function ServiceCard({ service, isActive, toggleStatus, onEdit, isOffer }) {
  const terms = parseTerms(service.terms);
  const packagesIncludes = parseTerms(service.packagesIncludes);

  return (
    <div className={`service-card ${isActive ? "active-card" : "inactive-card"}`}>
      <div className="service-top">
        <img
          src={service.imageUrl || "/placeholder.png"}
          alt={service.name}
        />

        <div className="service-info">
          <h4>{service.name}</h4>

          {/* {terms.length > 0 && (
            <ul className="service-terms">
              {terms.map((term, index) => (
                <li key={index}>✓ {term}</li>
              ))}
            </ul>
          )} */}

          {packagesIncludes.length > 0 && (
            <div className="service-includes">
              <div className="includes-title">Includes</div>
              <ul className="service-packages">
                {packagesIncludes.map((pkg, index) => (
                  <li key={index}>✓ {pkg}</li>
                ))}
              </ul>
            </div>
          )}

          {service.offerText && (
            <p className="offer-text">{service.offerText}</p>
          )}
        </div>
      </div>

      <div className="service-right">
        <span className="price">Rs {service.price}</span>

        {isActive && onEdit && (
          <span className="edit" onClick={onEdit}>
            Edit
          </span>
        )}

        <label className="switch">
          <input
            type="checkbox"
            checked={isActive}
            onChange={() => toggleStatus?.(service)}
            disabled={!toggleStatus}
          />
          <span className="switch-track">
            <span className="switch-thumb" />
          </span>
        </label>
      </div>
    </div>
  );
}
/* ================= MODAL ================= */
function Modal({ title, children, onClose }) {
  return (
    <div className="activate-overlay">
      <div className="activate-modal">
        <h3>{title}</h3>

        <div className="modal-scroll">
          {/* 🔹 ALL form content comes from parent */}
          {children}
        </div>

        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function CustomPackageCard({ customPackage, isActive, onEdit, onToggle }) {
  const includes = parseTerms(customPackage.packagesIncludes);
  const visibleVariants = (customPackage.children || []).filter(variant => !variant.isDeleted);
  const hasVariants = visibleVariants.length > 0;

  return (
    <div className={`service-card custom-package-card ${isActive ? "active-card" : "inactive-card"}`}>
      <div className="service-top">
        <img
          src={customPackage.imageUrl || "/placeholder.png"}
          alt={customPackage.name}
        />

        <div className="service-info">
          <h4>{customPackage.name}</h4>

          {hasVariants ? (
            <div className="custom-package-variants">
              <div className="includes-title">Variants</div>
              <ul className="service-packages">
                {visibleVariants.map(variant => (
                  <li key={variant._id}>
                    ✓ {variant.name} - Rs {variant.price}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {includes.length > 0 && (
            <div className="service-includes">
              <div className="includes-title">Includes</div>
              <ul className="service-packages">
                {includes.map((item, index) => (
                  <li key={`${customPackage._id}-include-${index}`}>✓ {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="service-right custom-package-actions">
        {!hasVariants && <span className="price">Rs {customPackage.price}</span>}
        {typeof onEdit === "function" && (
          <span className="edit" onClick={onEdit}>Edit</span>
        )}
        <label className="switch">
          <input
            type="checkbox"
            checked={Boolean(isActive)}
            onChange={onToggle}
          />
          <span className="switch-track">
            <span className="switch-thumb" />
          </span>
        </label>
      </div>
    </div>
  );
}

