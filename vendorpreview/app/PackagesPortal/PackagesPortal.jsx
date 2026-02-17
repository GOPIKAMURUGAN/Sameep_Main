"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import "../PackagesPortal/PackagesPortal.css";


/* ================= IMAGE TREE HELPERS ================= */
const categoryCache = new Map();

/* ================= DEFAULT OPTIONS ================= */

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


function collectCategoryIds(nodes, set = new Set()) {
  nodes.forEach(n => {
    if (n.categoryId) set.add(n.categoryId);
    if (n.children) collectCategoryIds(n.children, set);
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
      visibleToUser: true,
      visibleToVendor: true,
      sequence: index,
    };

    arr.push(payload);

    if (node.children?.length) {
      buildFullPayloads(
        node.children,
        node._id?.startsWith("new-") ? null : node._id,
        // parentVendorPriceNodeId
        level + 1,
        arr
      );
    }
  });

  return arr;
}



function syncVendorTree(masterTree, vendorTree) {

  // 🔥 flatten vendor tree once
  const vendorMap = new Map();

  function flatten(nodes) {
    nodes.forEach(n => {
      vendorMap.set(n.categoryId, n);
      if (n.children?.length) flatten(n.children);
    });
  }

  flatten(vendorTree);

  function walk(masterNodes) {
    return masterNodes.map(master => {

      const vendorMatch = vendorMap.get(master._id);

      const baseNode = vendorMatch
        ? vendorMatch
        : {
          _id: `new-${master._id}`,
          categoryId: master._id,
          name: master.name,
          isLeaf: master.isLeaf,
          price: 0,
          pricingStatus: "Inactive",
          terms: "",
          children: []
        };

      return {
        ...baseNode,
        children: walk(master.children || [])
      };
    });
  }

  return walk(masterTree);
}

function stringifyTerms(termsArray) {
  return termsArray.join(", ");
}


async function buildCategoryTree(parentId) {
  if (categoryCache.has(parentId)) {
    return categoryCache.get(parentId);
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dummy-categories?parentId=${parentId}`,
    { cache: "no-store" }
  );

  const children = await res.json();

  if (!Array.isArray(children) || children.length === 0) {
    categoryCache.set(parentId, []);
    return [];
  }

  const enriched = await Promise.all(
    children.map(async c => ({
      ...c,
      children: await buildCategoryTree(c._id),
    }))
  );

  categoryCache.set(parentId, enriched);
  return enriched;
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

async function fetchCategoryTerms(categoryId) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dummy-categories?parentId=${categoryId}`,
    { cache: "no-store" }
  );

  const children = await res.json();

  // find matching category node that has terms
  for (const c of children) {
    if (c.terms && c.terms.length) {
      return Array.isArray(c.terms)
        ? c.terms
        : parseTerms(c.terms);
    }
  }

  return [];
}


function buildImageMapFromTree(nodes) {
  const map = {};

  function walk(node, inheritedImage = null) {
    const currentImage = node.imageUrl || inheritedImage;

    // 🔑 store by _id (this matches pricing.categoryId)
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


/* ================= MAIN ================= */
export default function PackagesPortal({ onClose, onLoaded }) {
  const searchParams = useSearchParams();
  const vendorId = searchParams.get("vendorId");
  const rootCategoryId = searchParams.get("rootCategoryId");

  const [rootNodes, setRootNodes] = useState([]);
  const [path, setPath] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [modalPrice, setModalPrice] = useState("");
  const [selectedTerms, setSelectedTerms] = useState([]);

  const [pendingServiceId, setPendingServiceId] = useState(null);


  const [showActivateModal, setShowActivateModal] = useState(false);
  const [pendingService, setPendingService] = useState(null);
  const [activationPrice, setActivationPrice] = useState("");

  const [selectedTermsMap, setSelectedTermsMap] = useState({});
  const [allTerms, setAllTerms] = useState([]);

  const [categoryTree, setCategoryTree] = useState([]);

  function toggleTerm(term) {
    setSelectedTerms(prev => {
      const updated = prev.includes(term)
        ? prev.filter(t => t !== term) // ❌ remove → untick
        : [...prev, term];             // ✅ add → tick

      const serviceId =
        editingService?._id || pendingService?._id;

      if (serviceId) {
        setSelectedTermsMap(map => ({
          ...map,
          [serviceId]: updated
        }));
      }

      return updated;
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
  /* ================= FETCH TREE ================= */
  useEffect(() => {
    if (!vendorId || !rootCategoryId) return;

    async function load() {



      setLoading(true);

      // 1️⃣ Pricing tree
      const pricingRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-price-nodes/tree?vendorId=${vendorId}&rootCategoryId=${rootCategoryId}`
      );
      const pricingData = await pricingRes.json();

      // 2️⃣ Category image tree
      const catTree = await buildCategoryTree(rootCategoryId);
      setCategoryTree(catTree);

      // ================= SYNC BACKEND =================



      const masterIds = collectMasterIds(catTree);
      const vendorIds = collectVendorIds(pricingData.tree || []);

      const missingIds = [...masterIds].filter(id => !vendorIds.has(id));
      if (missingIds.length) {
        await Promise.all(
          missingIds.map(id =>
            fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-price-nodes/sync`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                vendorId,
                rootCategoryId,
                categoryId: id,
                price: 0,
                pricingStatus: "Inactive",
                terms: ""
              })
            })
          )
        );
      }

      const extraIds = [...vendorIds].filter(id => !masterIds.has(id));


      // 🔄 REFRESH pricing tree AFTER sync
      const refreshedRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-price-nodes/tree?vendorId=${vendorId}&rootCategoryId=${rootCategoryId}`
      );
      const refreshedPricing = await refreshedRes.json();

      // ================= BUILD FINAL TREE =================

      const imageMap = buildImageMapFromTree(catTree);

      const syncedTree = syncVendorTree(catTree, refreshedPricing.tree || []);
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
    // 👉 INACTIVE → ACTIVATE
    setPendingService(service);
    setPendingServiceId(service._id);
    setActivationPrice(service.price || "");

    // ⭐ SAME SOURCE AS EDIT
    const masterTerms = findTermsInCategoryTree(
      categoryTree,
      service.categoryId
    );

    // ⭐ SAME PRESELECT RULE AS EDIT
    const selected = parseTerms(service.terms);

    setAllTerms(masterTerms);
    setSelectedTerms(selected);

    setShowActivateModal(true);
  };


  const confirmActivateService = async () => {
    if (!pendingServiceId) return;   // safety

    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-price-nodes/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorPriceNodeId: pendingServiceId,
        price: Number(activationPrice),
        terms: selectedTerms.join(", "),
        pricingStatus: "Active"
      })
    });

    // update local UI object if still present
    if (pendingService) {
      pendingService.price = Number(activationPrice);
      pendingService.pricingStatus = "Active";
      pendingService.terms = selectedTerms.join(", ");
    }

    setRootNodes([...rootNodes]);
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
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-price-nodes/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorPriceNodeId: service._id,
        price: Number(service.price),
        pricingStatus: status   // ⭐ use param
      })
    });
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

        {/* LIST */}
        {/* ================= CATEGORY LIST ================= */}


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
                        onEdit={() => {
                          setEditingService(service);
                          setModalPrice(service.price || "");

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

      {/* MODALS */}
      {
        showEditModal && editingService && (
          <Modal title="Edit Service" onClose={() => setShowEditModal(false)}>
            <label className="modal-label">Price</label>
            <input
              className="price-input"
              value={modalPrice}
              onChange={e => setModalPrice(e.target.value)}
            />
            <label className="modal-label">Terms</label>

            {allTerms.length === 0 ? (
              <p className="empty-terms">No terms available for this service</p>
            ) : (
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
            )}


            <button
              className="btn-primary"
              onClick={async () => {
                if (!editingService) return; // safety

                editingService.price = Number(modalPrice);
                editingService.pricingStatus = "Active";
                editingService.terms = selectedTerms.join(", ");

                await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-price-nodes/update`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    vendorPriceNodeId: editingService._id,   // ✅ FIX
                    price: Number(modalPrice),               // ✅ FIX
                    terms: selectedTerms.join(", "),
                    pricingStatus: "Active"
                  })
                });

                setRootNodes([...rootNodes]);
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
            <label className="modal-label">Price</label>
            <input
              className="price-input"
              value={activationPrice}
              onChange={e => setActivationPrice(e.target.value)}
            />

            <label className="modal-label">Terms</label>

            {allTerms.length === 0 ? (

              <p className="empty-terms">No terms available for this service</p>
            ) : (
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
function ServiceCard({ service, isActive, toggleStatus, onEdit }) {
  const terms = parseTerms(service.terms); // ✅ from tree API


  return (
    <div className={`service-card ${isActive ? "active-card" : "inactive-card"}`}>
      <div className="service-top">
        <img
          src={service.imageUrl || "/placeholder.png"}
          alt={service.name}
        />

        <div className="service-info">
          <h4>{service.name}</h4>

          {/* ✅ TERMS FROM TREE API */}
          {terms.length > 0 && (
            <ul className="service-terms">
              {terms.map((t, i) => (
                <li key={i}>• {t}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="service-right">
          <span className="price">₹{service.price}</span>

          {isActive && onEdit && (
            <span className="edit" onClick={onEdit}>
              Edit
            </span>
          )}
        </div>
      </div>

      <div className="service-bottom right">
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