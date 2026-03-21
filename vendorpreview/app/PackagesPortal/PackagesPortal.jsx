"use client";

import { useEffect, useState } from "react";
import "./PackagesPortal.css";
import { useVendor } from "../context/VendorContext";
function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem("authToken");

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      Authorization: token ? `Bearer ${token}` : "",
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
export default function PackagesPortal({ onClose, onLoaded, onPricingUpdated }) {
  const { vendorInfo } = useVendor();
  const vendorId = vendorInfo?.vendorId || vendorInfo?._id || null;
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
  const [selectedTerms, setSelectedTerms] = useState([]);

  const [pendingServiceId, setPendingServiceId] = useState(null);
  const [modalOfferText, setModalOfferText] = useState("");
  const [activationOfferText, setActivationOfferText] = useState("");

  const [showActivateModal, setShowActivateModal] = useState(false);
  const [pendingService, setPendingService] = useState(null);
  const [activationPrice, setActivationPrice] = useState("");

  const [allTerms, setAllTerms] = useState([]);

  const [categoryTree, setCategoryTree] = useState([]);

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
  useEffect(() => {
    if (!vendorId || !rootCategoryId) return;

    async function load() {
      setLoading(true);
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

      setLoading(false);
      onLoaded?.();
    }


    load();
  }, [vendorId, rootCategoryId]);
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
  const toggleStatus = async (service) => {
    const isActive = service.pricingStatus === "Active";

    if (isActive) {
      if (!window.confirm("Deactivate this service?")) return;

      // update full tree
      setRootNodes(nodes =>
        updateNodeStatus(nodes, service._id, "Inactive")
      );

      // ⭐ update currently opened path level
      setPath(p => updatePathStatus(p, service._id, "Inactive"));

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
  await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-price-nodes/update`, {
      method: "PUT",
      body: JSON.stringify({
        vendorPriceNodeId: service._id,
        price: Number(service.price),
        pricingStatus: status   // ⭐ use param
      })
  });
  await onPricingUpdated?.();
}

  const shouldUseVirtualParents =
    categoryChildren.length > 0 && serviceChildren.length > 0;

  const displayCategories = [
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
  return (
    <div className="packages-overlay">
      <div className="packages-card">

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
        </div>
        {displayCategories.map(node => (
          <div
            key={node._id}
            className="subcategory-title"
            onClick={() => {
              if (node._isVirtualParent) {
                // ⭐ Wrap leaf as parent visually
                setPath([...path, { ...node, children: [node] }]);
              } else {
                setPath([...path, node]);
              }
            }}
          >
            {node.name}
          </div>
        ))}
        {/* ================= LEAF GRID ================= */}
        {displayCategories.length === 0 && serviceChildren.length > 0 && (() => {
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
                        isOffer={isFreeTextEnabled(categoryTree, service.categoryId)}
                        onEdit={() => {
                          setEditingService(service);
                          setModalPrice(service.price || "");
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
                      />
                    ))}
                  </div>
                </>
              )}
            </section>
          );
        })()}
      </div >
      {
        showEditModal && editingService && (
          <Modal title="Edit Service" onClose={() => setShowEditModal(false)}>

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
            <button
              className="btn-primary"
              onClick={async () => {
                if (!editingService) return; // safety
                editingService.price = Number(modalPrice);
                editingService.pricingStatus = "Active";
                editingService.terms = selectedTerms.join(", ");
                editingService.offerText = modalOfferText;
                await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-price-nodes/update`, {
                  method: "PUT",
                  body: JSON.stringify({
                    vendorPriceNodeId: editingService._id,   // ✅ FIX
                    price: Number(modalPrice),               // ✅ FIX
                    terms: selectedTerms.join(", "),
                    offerText: modalOfferText,
                    pricingStatus: "Active"
                  })
                });

                setRootNodes([...rootNodes]);
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
      </div>

      <div className="service-bottom">
        <label className="switch">
          <input
            type="checkbox"
            checked={isActive}
            onChange={() => toggleStatus(service)}
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

        {/* 🔹 ALL form content comes from parent */}
        {children}

        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

