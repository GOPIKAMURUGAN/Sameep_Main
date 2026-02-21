"use client";
export const dynamic = "force-dynamic";

import AdvantageSection from "../About/About";
import RootsSection from "../Root/RootSection";
import { useEffect, useState, useMemo } from "react";
import { useVendor } from "../VendorContext";

import "./Explore.css";
import HeroSection from "../Hero/Hero";
import { API_BASE_URL } from "../../config";
// adjust path if needed: ../config or ../../config
import { Suspense } from "react";

import { useSearchParams } from "next/navigation";
// import { useLoginPopup } from "./LoginPopupContext";


const toAnchor = (label) =>
  label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");





const categoryCache = new Map();

async function buildCategoryTree(parentId) {
  if (categoryCache.has(parentId)) {
    return categoryCache.get(parentId);
  }

  const res = await fetch(
    `${API_BASE_URL}/api/dummy-categories?parentId=${parentId}`,
    { cache: "no-store" }
  );

  const children = await res.json();

  // IMPORTANT: stop recursion if empty
  if (!Array.isArray(children) || children.length === 0) {
    categoryCache.set(parentId, []);
    return [];
  }

  const enrichedChildren = await Promise.all(
    children.map(async (node) => ({
      ...node,
      children: await buildCategoryTree(node._id),
    }))
  );

  categoryCache.set(parentId, enrichedChildren);
  return enrichedChildren;
}




function buildNameMapFromTree(nodes) {
  const map = {};

  function walk(node) {
    // ⭐ YOUR CATEGORY API USES _id
    if (node._id && node.name) {
      map[node._id] = node.name.trim();

    }
    node.children?.forEach(walk);
  }

  nodes.forEach(walk);
  return map;
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

// --------------------------------------------------
// CHIP
// --------------------------------------------------
function Chip({ active, onClick, children }) {
  return (
    <button className={`chip ${active ? "active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

function TermsList({ terms }) {
  if (!terms || terms.length === 0) return null;

  return (
    <ul className="ws-terms">
      {terms.map((t, i) => (
        <li key={i}>
          <span className="ws-check">✓</span>
          {t}
        </li>
      ))}
    </ul>
  );
}



function ServiceCard({ data, sectionName, openLogin }) {

  // ================= LOYALTY STATES =================
  const [loadingRule, setLoadingRule] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [isEnabled, setIsEnabled] = useState(false);
  const [percentPer100, setPercentPer100] = useState(0);
  const [expiryDays, setExpiryDays] = useState(0);





  const showTitle =
    !!data.title &&
    (
      !sectionName ||
      data.title.trim().toLowerCase() !==
      sectionName.trim().toLowerCase()
    );


  const formatPrice = (n) => {
    const price = Number(n || 0);
    if (price <= 0) return "Contact for price";
    return `₹${price.toLocaleString("en-IN")}`;
  };


  // ✅ SIMPLE CARD (single leaf, no chips)
  if (data.simple) {
    return (
      <div className="ws-card">
        {showTitle && <h3 className="ws-title">{data.title}</h3>}

        <div className="ws-media">
          {data.img && <img src={data.img} alt={data.title} />}
        </div>

        {/* ✅ PRICE FIRST */}
        <div className="ws-price">{formatPrice(data.base)}</div>


        {/* ✅ TERMS AFTER PRICE */}
        <TermsList terms={data.terms} />

        <div className="ws-actions">
          <button
            className="btn-primary"
            onClick={() =>
              openLogin({
                serviceName: data.title,
                price: total ,
                terms: selectedTerms?.join(", ") || "",

                attributes: {
                  mainOption: selectedMain,
                  subOption: selectedSub,
                },

                // ⭐ FIXED CATEGORY PATH
                categoryPath: [
                  sectionName,          // Hair
                  selectedMain,         // Hair Spa
                  selectedSub,          // Relaxing
                ].filter(Boolean),

                categoryIds: [], // keep empty if you don’t map ids yet
              })
            }
          >
            Enroll Now
          </button>





        </div>
      </div>
    );
  }



  // ---------------- NORMAL CARD ----------------
  const [selectedMain, setSelectedMain] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);

  useEffect(() => {
    setSelectedMain(data.defaultMain || null);
    setSelectedSub(data.defaultSub || null);
  }, [data.defaultMain, data.defaultSub]);

  useEffect(() => {
    if (!selectedMain) return;

    const main = data.options?.find(o => o.label === selectedMain);

    if (!main) return;

    if (main.subOptions?.length) {
      const cheapest = main.subOptions.reduce((a, b) =>
        b.price < a.price ? b : a
      );
      setSelectedSub(cheapest.label);
    } else {
      setSelectedSub(null);
    }
  }, [selectedMain, data.options]);

  const total = useMemo(() => {
    let sum = 0;
    const main = data.options?.find(o => o.label === selectedMain);

    if (main) sum += main.price || 0;

    const sub = main?.subOptions?.find(s => s.label === selectedSub);
    if (sub) sum += sub.price || 0;

    return sum || data.base;
  }, [data, selectedMain, selectedSub]);

  const dynamicImg = useMemo(() => {
    if (!selectedMain) return data.img || null;
    const main = data.options?.find(o => o.label === selectedMain);

    if (selectedSub && main?.subOptions?.length) {
      const sub = main.subOptions.find(s => s.label === selectedSub);
      if (sub?.imageUrl) return sub.imageUrl;
    }

    return main?.imageUrl || data.img || null;
  }, [data, selectedMain, selectedSub]);
  const selectedTerms = useMemo(() => {
    if (!selectedMain) return [];

    const main = data.options?.find(o => o.label === selectedMain);
    if (!main) return [];

    // Sub-option selected → use its terms
    if (selectedSub && main.subOptions?.length) {
      const sub = main.subOptions.find(s => s.label === selectedSub);
      return sub?.terms || [];
    }

    // Otherwise main option terms
    return main.terms || [];
  }, [data.options, selectedMain, selectedSub]);

  return (
    <div className="ws-card">
      {showTitle && <h3 className="ws-title">{data.title}</h3>}

      {sectionName &&
        data.title?.trim().toLowerCase() !==
        sectionName.trim().toLowerCase() && (
          <h4 className="ws-mobile-category">
            {sectionName}
          </h4>
        )}



      <div className="ws-media">
        {dynamicImg && <img src={dynamicImg} alt={data.title} />}
      </div>

      <div className="ws-price">{formatPrice(total)}</div>

      <div className="ws-subhead">Select Service</div>





      <div className="ws-chips">
        {data.options?.map(opt => (
          <Chip
            key={opt.label}
            active={selectedMain === opt.label}
            onClick={() =>
              setSelectedMain(
                selectedMain === opt.label ? null : opt.label
              )
            }
          >
            {opt.label}
          </Chip>
        ))}
      </div>

      {selectedMain &&
        data.options?.find(o => o.label === selectedMain)?.subOptions?.length > 0 && (
          <div className="ws-subsection">
            <div className="ws-subhead small">
              Choose {selectedMain} Type
            </div>
            <div className="ws-chips">
              {data.options
                .find(o => o.label === selectedMain)
                .subOptions.map(s => (
                  <Chip
                    key={s.label}
                    active={selectedSub === s.label}
                    onClick={() =>
                      setSelectedSub(
                        selectedSub === s.label ? null : s.label
                      )
                    }
                  >
                    {s.label}
                  </Chip>
                ))}
            </div>
          </div>
        )}
      {/* ✅ TERMS MOVED BELOW SELECT SERVICE */}
      <TermsList terms={selectedTerms} />


      <div className="ws-actions">
        <button
          className="btn-primary"
          onClick={() =>
            openLogin({
              serviceName: data.title,
              price: total,
              terms: selectedTerms?.join(", ") || "",

              attributes: {
                mainOption: selectedMain,
                subOption: selectedSub,
              },

              // ⭐ FIXED CATEGORY PATH
              categoryPath: [
                sectionName,          // Hair
                selectedMain,         // Hair Spa
                selectedSub,          // Relaxing
              ].filter(Boolean),

              categoryIds: [], // keep empty if you don’t map ids yet
            })
          }
        >
          Enroll Now
        </button>



      </div>


    </div>
  );

}


// --------------------------------------------------
// API → UI Converter with min price detection
// --------------------------------------------------

function normalizeTerms(terms) {
  if (!terms) return [];

  return terms
    .split(/[.,]/)     // ✅ split by comma OR dot
    .map(t => t.trim())
    .filter(Boolean)
    .slice(0, 10);      // max 3 points
}

function collectLeafTerms(node) {
  const terms = [];

  function walk(n) {
    if (
      n.isLeaf &&
      n.pricingStatus === "Active" &&
      n.terms
    ) {
      terms.push(...normalizeTerms(n.terms));
    }
    n.children?.forEach(walk);
  }

  walk(node);

  // unique + max 3
  return [...new Set(terms)].slice(0, 3);
}

function convertFromTree(tree, imageMap, nameMap) {

  const getName = (node) =>
    nameMap?.[node?.categoryId] || node?.name || "";

  return tree.map(level0 => {

    /* =====================================================
       ✅ CASE 0 — LEVEL0 ITSELF IS A LEAF
       ===================================================== */
    if (level0.isLeaf && level0.pricingStatus === "Active") {
      return {
        sectionName: getName(level0),
        cards: [{
          id: level0.categoryId,
          title: getName(level0),
          img: imageMap[level0.categoryId] || null,
          base: Number(level0.price) || 0,
          options: [],
          simple: true
        }]
      };
    }

    const children = level0.children || [];

    /* =====================================================
       🟡 LOGIC 1 — GROUP ONLY IF ALL CHILDREN ARE LEAVES
       (Salon / Zero Trim / Size Based)
       ===================================================== */
    const activeLeaves = children.filter(
      c => c.isLeaf && c.pricingStatus === "Active"
    );

    const allChildrenAreLeaves =
      children.length &&
      children.every(c => c.isLeaf);

    if (activeLeaves.length > 1 && allChildrenAreLeaves) {

      let minPrice = Infinity;

      const options = activeLeaves.map(c => {
        const price = Number(c.price) || 0;
        minPrice = Math.min(minPrice, price);

        return {
          label: getName(c).trim(),
          price,
          imageUrl: imageMap[c.categoryId] || null,
          terms: normalizeTerms(c.terms || ""),
          subOptions: []
        };
      });

      return {
        sectionName: getName(level0),
        cards: [{
          id: level0.categoryId,
          title: getName(level0),
          img: imageMap[level0.categoryId] || null,
          options,
          base: minPrice === Infinity ? 0 : minPrice,
          defaultMain: options[0]?.label || null,
          defaultSub: null,
          simple: false
        }]
      };
    }

    /* =====================================================
       🔵 LOGIC 2 — NORMAL HIERARCHY (Tuition Flow)
       ===================================================== */
    const cards = children.map(level1 => {

      /* ---------- LEVEL1 IS DIRECT LEAF ---------- */
      if (level1.isLeaf && level1.pricingStatus === "Active") {
        return {
          id: level1.categoryId,
          title: getName(level1),
          img: imageMap[level1.categoryId] || null,
          base: Number(level1.price) || 0,
          options: [],
          simple: true,
          terms: normalizeTerms(level1.terms || "")
        };
      }

      let minPrice = Infinity;
      let defaultMain = null;
      let defaultSub = null;
      const options = [];

      (level1.children || []).forEach(level2 => {

        /* ---------- LEVEL2 IS LEAF ---------- */
        if (level2.isLeaf && level2.pricingStatus === "Active") {
          const price = Number(level2.price) || 0;

          options.push({
            label: getName(level2).trim(),
            price,
            imageUrl: imageMap[level2.categoryId] || null,
            terms: normalizeTerms(level2.terms || ""),
            subOptions: []
          });

          if (price < minPrice) {
            minPrice = price;
            defaultMain = getName(level2).trim();
          }
        }

        /* ---------- LEVEL2 HAS SUBOPTIONS ---------- */
        else if (level2.children?.length) {

          const subOptions = level2.children
            .filter(c => c.isLeaf && c.pricingStatus === "Active")
            .map(c => {
              const price = Number(c.price) || 0;

              if (price < minPrice) {
                minPrice = price;
                defaultMain = getName(level2).trim();
                defaultSub = getName(c).trim();
              }

              return {
                label: getName(c).trim(),
                price,
                imageUrl: imageMap[c.categoryId] || null,
                terms: normalizeTerms(c.terms || "")
              };
            });

          if (subOptions.length) {
            options.push({
              label: getName(level2).trim(),
              price: 0,
              imageUrl: imageMap[level2.categoryId] || null,
              subOptions
            });
          }
        }

      });

      if (!options.length) return null;

      return {
        id: level1.categoryId,
        title: getName(level1),
        img: imageMap[level1.categoryId] || null,
        options,
        base: minPrice === Infinity ? 0 : minPrice,
        defaultMain,
        defaultSub,
        simple: false,
        terms: collectLeafTerms(level1)
      };

    }).filter(Boolean);

    return {
      sectionName: getName(level0),
      cards
    };

  }).filter(section => section.cards?.length);
}



// --------------------------------------------------
// MAIN Explore Page
// --------------------------------------------------
function ExploreContent({ onReady }) {
  // ================= CART + BILLING STATES =================
  const [cartItems, setCartItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const cartTotal = cartItems.reduce((a, b) => a + (b.total || 0), 0);
  // ================= LOYALTY STATES (FIX ERROR) =================
  const [loadingRule, setLoadingRule] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [isEnabled, setIsEnabled] = useState(false);
  const [percentPer100, setPercentPer100] = useState(0);
  const [expiryDays, setExpiryDays] = useState(0);
  const [ruleLoaded, setRuleLoaded] = useState(false);


  const [customerMobile, setCustomerMobile] = useState("");
  const [availablePoints, setAvailablePoints] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [earnPoints, setEarnPoints] = useState(0);

  const [customerId, setCustomerId] = useState(null);
  const [billingId, setBillingId] = useState(null);

  const [showOtpInput, setShowOtpInput] = useState(false);
  const [verifyingCustomer, setVerifyingCustomer] = useState(false);
  const [checkingCustomer, setCheckingCustomer] = useState(false);
  const [customerValidated, setCustomerValidated] = useState(false);
  const [loyaltyLoaded, setLoyaltyLoaded] = useState(true);
  const [processingBill, setProcessingBill] = useState(false);


  const [dataLoaded, setDataLoaded] = useState(false);
  const [category, setCategory] = useState(null);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);

  const [showLogin, setShowLogin] = useState(false);
  const [viewMode, setViewMode] = useState("preview");
  // ================= MENU TREE (TEMP SAFE STATE) =================
  const [menuTree, setMenuTree] = useState([]);

  const [selectedServiceName, setSelectedServiceName] = useState("");
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedTerms, setSelectedTerms] = useState("");
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [selectedCategoryPath, setSelectedCategoryPath] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  // ================= MOBILE DETECTION =================
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile(); // run once
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const openLogin = (serviceData) => {
    if (serviceData) {
      setSelectedServiceName(serviceData.serviceName || "");
      setSelectedPrice(serviceData.price ?? null);
      setSelectedTerms(serviceData.terms || "");
      setSelectedAttributes(serviceData.attributes || {});
      setSelectedCategoryPath(serviceData.categoryPath || []);
      setSelectedCategoryIds(serviceData.categoryIds || []);
    }

    setShowLogin(true);
  };

  const closeLogin = () => setShowLogin(false);


  const toAnchor = (label) =>
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

  //const { vendorInfo } = useVendor() || {};
  const { vendorInfo, setVendorInfo } = useVendor() || {};

    
  const googleRating = vendorInfo?.googlePlace?.rating;
  const googleReviews = vendorInfo?.googlePlace?.userRatingsTotal;
  const googleMapsUrl = vendorInfo?.googlePlace?.mapsUrl;
  const [countryCode, setCountryCode] = useState("91");
  const [categoryData, setCategoryData] = useState(null);


  const searchParams = useSearchParams();
  
const rootCategoryId =
  vendorInfo?.categoryId || searchParams.get("rootCategoryId");

const vendorId =
  vendorInfo?.vendorId || searchParams.get("vendorId");

  const verifyOtp = async () => {
    if (!otp || otp.length < 4) {
      alert("Enter valid OTP");
      return;
    }

    try {
      setLoadingOtp(true);

      const res = await fetch(
        `${API_BASE_URL}/api/customers/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            categoryId: rootCategoryId,
            vendorId: vendorId,
            countryCode: "91",
            phone: mobile,
            otp: otp,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "OTP verification failed");
        return;
      }

      // ⭐ Save token
      if (data?.token) {
        localStorage.setItem("authToken", data.token);
      }

      // ⭐ CUSTOMER ID FROM BACKEND
      const customerId =
        data?.customerId ||
        data?.customer?._id ||
        data?.user?._id;

      // ⭐ CALL ENQUIRY API AFTER LOGIN
      await createEnquiry(customerId);

      closeLogin();
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setLoadingOtp(false);
    }
  };
  const createEnquiry = async (customerId) => {
    try {
      const enquiryPhone = mobile;

      const payload = {
        vendorId: String(vendorId),
        categoryId: String(rootCategoryId),
        customerId,
        phone: enquiryPhone,

        serviceName: selectedServiceName || "",
        source: selectedCategoryPath?.[0] || "",   // ⭐ FIXED

        price:
          selectedPrice == null || selectedPrice === ""
            ? null
            : Number(selectedPrice),

        terms: selectedTerms || "",
        categoryPath: selectedCategoryPath || [],
        categoryIds: selectedCategoryIds || [],
        attributes: selectedAttributes || {},
      };

      const res = await fetch(
        `${API_BASE_URL}/api/enquiries`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("Enquiry error:", data);
        return;
      }

      console.log("✅ Enquiry created", data);
    } catch (err) {
      console.error("Enquiry API error", err);
    }
  };



  const requestOtp = async () => {
    if (!mobile || mobile.length !== 10) {
      alert("Enter valid mobile number");
      return;
    }

    try {
      setLoadingOtp(true);

      const res = await fetch(
        `${API_BASE_URL}/api/customers/request-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            countryCode: countryCode,
            phone: mobile,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "OTP request failed");
        return;
      }

      setOtpSent(true); 
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setLoadingOtp(false);
    }
  };

  useEffect(() => {
    if (!vendorId) return;

   async function fetchVendor() {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/dummy-vendors/${vendorId}`,
      { cache: "no-store" }
    );

    if (!res.ok) throw new Error("Vendor API failed");

    // ⚠️ SSR now handles vendor data
    // We keep this only to unblock preview loading state
    //await res.json();
    const data = await res.json();

// Inject preview vendor into context
if (setVendorInfo) {
  console.log("🟢 Injecting preview vendor into context");
  setVendorInfo(data);
}

    } catch (err) {
    console.error("Vendor fetch error", err);
    
  }
}

fetchVendor();

  }, [vendorId]);


  useEffect(() => {
    if (!rootCategoryId) return;

    async function fetchCategory() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/dummy-categories/${rootCategoryId}`,
          { cache: "no-store" }
        );

        if (!res.ok) throw new Error("Category API failed");

        const data = await res.json();
        const categoryObj = Array.isArray(data) ? data[0] : data;

        // ✅ Local state (Explore page)
        setCategory(categoryObj);

        // Keep category data locally (SSR vendor remains untouched)
setCategoryData(categoryObj);


      } catch (err) {
        console.error("Category fetch error", err);
      }
    }

    fetchCategory();
  }, [rootCategoryId]);


  const handleVerifyOtp = async () => {
    if (!billingId || !otp) return;

    try {
      await fetch(`${API_BASE_URL}/api/billing/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingId,
          otp,
        }),
      });

      const completeRes = await fetch(`${API_BASE_URL}/api/billing/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingId,
          paymentMode: "CASH",
        }),
      });

      const completeData = await completeRes.json();
      if (completeData?.success) {
        setCartItems([]);
        setCustomerMobile("");
        setAvailablePoints(0);
        setRedeemPoints(0);
        setCustomerId(null);
        setBillingId(null);
        setEarnPoints(0);
      }

      setShowOtpInput(false);
      setRedeemPoints(0);
      setOtp("");
    } catch (err) {
      console.error(err);
    }
  };






  function extractHeroImages(categoryTree) {
    const images = [];

    categoryTree.forEach(node => {
      if (node.imageUrl) {
        images.push(node.imageUrl);
      }
    });

    return images.slice(0, 5); // limit slides
  }
  const [heroImages, setHeroImages] = useState([]);



  const [finalCategories, setFinalCategories] = useState([]);

  useEffect(() => {



    if (!vendorId || !rootCategoryId) return;

    async function load() {
      try {
        const PRICING_API =
          `${API_BASE_URL}/api/vendor-price-nodes/tree` +
          `?vendorId=${vendorId}` +
          `&rootCategoryId=${rootCategoryId}`;

        const pricingRes = await fetch(PRICING_API, { cache: "no-store" });

if (!pricingRes.ok) {
  const text = await pricingRes.text();
  console.error("Pricing API returned non-JSON:", text);
  throw new Error("Pricing API failed");
}

const pricingData = await pricingRes.json();

setMenuTree(pricingData?.tree || []);

        // ✅ build master category tree
        const categoryTree = await buildCategoryTree(rootCategoryId);
        const imageMap = buildImageMapFromTree(categoryTree);
        const nameMap = buildNameMapFromTree(categoryTree);

        const masterIdSet = new Set(Object.keys(nameMap));

        // ⭐ FIND INVALID NODES
        function collectInvalidNodes(nodes, invalid = []) {
          nodes.forEach(node => {
            if (!masterIdSet.has(node.categoryId)) {
              invalid.push(node);
            }

            if (node.children?.length) {
              collectInvalidNodes(node.children, invalid);
            }
          });

          return invalid;
        }

        const invalidNodes = collectInvalidNodes(pricingData.tree);

       
        if (invalidNodes.length) {
          await Promise.all(
            invalidNodes.map(node =>
              fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor-price-nodes/update`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  vendorPriceNodeId: node._id,   
                  pricingStatus: "Archive"
                })
              })
            )
          );
        }

        setHeroImages(extractHeroImages(categoryTree));

        const converted = convertFromTree(
          pricingData.tree,
          imageMap,
          nameMap
        );

        setFinalCategories(converted);
        setDataLoaded(true);
        console.log("✅ DATA LOADED TRIGGERED");

      } catch (e) {
        console.error("API Error:", e);
        setDataLoaded(true);
        console.log("✅ DATA LOADED TRIGGERED");
      }
    }
    load();
  }, [vendorId, rootCategoryId]);
useEffect(() => {
  if (vendorInfo && dataLoaded) {
    onReady?.();
  }
}, [vendorInfo, dataLoaded, onReady]);


  const cardsWithoutHeading = [];
  const sectionsWithHeading = [];


  finalCategories.forEach(section => {
    const hasSingleCard = section.cards.length === 1;
    const singleCard = section.cards[0];

    const hideHeading =
      hasSingleCard &&
      singleCard.title?.trim().toLowerCase() ===
      section.sectionName.trim().toLowerCase();

    if (hideHeading) {
      cardsWithoutHeading.push(singleCard);
    } else {
      sectionsWithHeading.push(section);
    }
  });


  useEffect(() => {
    const compute = () => setIsMobile(window.innerWidth < 1024);
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);



  useEffect(() => {
    if (!vendorId) return;
    if (ruleLoaded) return; // 🔥 prevents refetch

    const fetchVendorRule = async () => {
      try {
        const res = await fetch(
  `${API_BASE_URL}/api/loyalty/vendor-rule/${encodeURIComponent(vendorId)}`
);

if (!res.ok) {
  console.warn("No loyalty rule found for vendor yet");
  setIsEnabled(false);
  setExpiryDays(0);
  return;
}

const data = await res.json();


        if (data?.success && data?.data) {
          setPercentPer100(data.data.percentPer100 || 0);
        } else {
          setPercentPer100(0);
        }
      } catch (err) {
        console.error("Failed to load vendor rule", err);
        setPercentPer100(0);
      } finally {
        setRuleLoaded(true);
      }
    };

    fetchVendorRule();
  }, [vendorId, ruleLoaded]);

  useEffect(() => {
    // 🛑 DO NOT calculate until rule is loaded
    if (!ruleLoaded) {
      setEarnPoints(0);
      return;
    }

    if (!percentPer100 || !cartTotal) {
      setEarnPoints(0);
      return;
    }

    const pts = Math.floor((cartTotal / 100) * percentPer100);
    setEarnPoints(pts);
  }, [cartTotal, percentPer100, ruleLoaded]);

  useEffect(() => {
    if (!customerMobile || customerMobile.length !== 10) return;

    const handle = setTimeout(() => {
      verifyCustomer(customerMobile);
    }, 500);

    return () => clearTimeout(handle);
  }, [customerMobile, vendorId]);

  useEffect(() => {
    if (viewMode !== "loyalty" || !vendorId) return;

    let cancelled = false;
    const fetchRule = async () => {
      try {
        setLoadingRule(true);
        const res = await fetch(
          `${API_BASE_URL}/api/loyalty/vendor-rule/${encodeURIComponent(vendorId)}`
        );
        if (!res.ok) throw new Error("Failed to load loyalty rule");
        const data = await res.json();
        if (cancelled) return;

        if (data?.success && data?.data) {
          const rule = data.data;
          if (typeof rule.isEnabled === "boolean") setIsEnabled(rule.isEnabled);
          if (typeof rule.expiryDays === "number") setExpiryDays(rule.expiryDays);
      
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch loyalty rule", err);
        }
      } finally {
        if (!cancelled) setLoadingRule(false);
      }
    };

    fetchRule();
    return () => {
      cancelled = true;
    };
  }, [viewMode, vendorId]);

  const saveLoyaltyRule = async () => {
    if (!vendorId) return;

    try {
      setSavingRule(true);
      setSaveMessage("");
     const payload = {
  vendorId,
  categoryId: rootCategoryId,
  percentPer100,
  expiryDays,
  isEnabled,
};


  const res = await fetch(
  `${API_BASE_URL}/api/loyalty/vendor-rule`, {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
   if (!res.ok) {
  const text = await res.text();
  console.error("🔥 Loyalty save API error:", text);
  throw new Error("Failed to save loyalty rule");
}

      setSaveMessage("Saved ✓");
    } catch (err) {
      console.error("Failed to save loyalty rule", err);
    } finally {
      setSavingRule(false);
    }
  };

  async function fetchWallet(cId) {
    if (!cId || !vendorId) return;

    try {
      setLoyaltyLoaded(false);
      const res = await fetch(
        `${API_BASE_URL}/api/loyalty/wallet?vendorId=${vendorId}&customerId=${cId}`
      );

      const wallet = await res.json();
      if (wallet?.success) {
        setAvailablePoints(wallet?.availablePoints || 0);
        setLoyaltyLoaded(true);
      }
    } catch (err) {
      console.error("Wallet fetch failed", err);
      setLoyaltyLoaded(false);
    }
  }

  async function verifyCustomer(mobile) {
    if (!mobile || mobile.length !== 10) return;

    try {
      setVerifyingCustomer(true);
      setCheckingCustomer(true);
      setCustomerValidated(false);

      const bypassPayload = {
        countryCode: "91",
        phone: mobile,
      };

      const bypassRes = await fetch(
        `${API_BASE_URL}/api/customers/bypass-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bypassPayload),
        }
      );

      const bypassData = await bypassRes.json();
      const id = bypassData?.customer?._id || null;

      setCustomerId(id);
      setCustomerValidated(Boolean(id));
      if (id) {
        fetchWallet(id);
      }
    } catch (err) {
      console.error("Customer verification failed", err);
      setCustomerValidated(false);
    }

    setVerifyingCustomer(false);
    setCheckingCustomer(false);
  }

  const addToCart = (node, nodePath = [], categoryPathIds = []) => {
    setCartItems(prev => {
      const safePathIds = (categoryPathIds || []).filter(Boolean);
      const existing = prev.find(i => i.itemId === node._id);
      if (existing) {
        return prev.map(i => {
          if (i.itemId !== node._id) return i;
          const qty = i.qty + 1;
          return { ...i, qty, total: i.price * qty };
        });
      }
      return [
        ...prev,
        {
          itemId: node.categoryId || node._id,
categoryId: node.categoryId || node._id,

          name: node.name,
          price: node.price,
          qty: 1,
          total: node.price,
         
          parentId: node.parentId || null,
          rootCategoryId: rootCategoryId || node.rootCategoryId || null,
          nodePath,
          categoryPathIds: safePathIds.length ? safePathIds : [node._id],
        },
      ];
    });
  };

  const clearCart = () => {
    setCartItems([]);
    setRedeemPoints(0);
  };

  async function handleGenerateBill() {
    if (!vendorId || !customerId || !cartItems.length) {
      alert("Missing billing data");
      return;
    }

    try {
      setProcessingBill(true);

      // STEP 1 - Create billing session
      const createRes = await fetch(`${API_BASE_URL}/api/billing/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          customerId,
        }),
      });

      const createData = await createRes.json();
      const newBillingId = createData?.data?._id;

      if (!newBillingId) throw new Error("Billing session failed");
      setBillingId(newBillingId);

      // STEP 2 - Update cart with hierarchy fields
      const updateRes = await fetch(`${API_BASE_URL}/api/billing/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingId: newBillingId,
          cartItems,
        }),
      });

      const updateData = await updateRes.json();
      if (!updateData?.success) throw new Error("Billing update failed");

      if (redeemPoints > 0) {
        // STEP 3 - Request OTP for redemption
        const otpRes = await fetch(`${API_BASE_URL}/api/billing/request-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            billingId: newBillingId,
            redeemPoints,
          }),
        });

        const otpData = await otpRes.json();
        if (!otpData?.success) throw new Error("OTP request failed");

        setShowOtpInput(true);
        return;
      }

      // STEP 3 - Complete billing
      const completeRes = await fetch(`${API_BASE_URL}/api/billing/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingId: newBillingId,
          paymentMode: "CASH",
        }),
      });

      const completeData = await completeRes.json();
      if (!completeData?.success) throw new Error("Billing completion failed");

      setCartItems([]);
      setCustomerMobile("");
      setAvailablePoints(0);
      setRedeemPoints(0);
      setCustomerId(null);
      setBillingId(null);
      setEarnPoints(0);

      alert("Bill Generated Successfully");
    } catch (err) {
      console.error(err);
      alert("Billing failed");
    } finally {
      setProcessingBill(false);
    }
  }



  const increaseQty = (itemId) => {
    setCartItems(prev =>
      prev.map(i => {
        if (i.itemId !== itemId) return i;
        const qty = i.qty + 1;
        return { ...i, qty, total: i.price * qty };
      })
    );
  };

  const decreaseQty = (itemId) => {
    setCartItems(prev => {
      const item = prev.find(i => i.itemId === itemId);
      if (!item) return prev;
      if (item.qty > 1) {
        return prev.map(i => {
          if (i.itemId !== itemId) return i;
          const qty = i.qty - 1;
          return { ...i, qty, total: i.price * qty };
        });
      }
      return prev.filter(i => i.itemId !== itemId);
    });
  };

  const removeItem = (itemId) => {
    setCartItems(prev => prev.filter(i => i.itemId !== itemId));
  };

  const menuClassForDepth = (depth, isLeaf = false) => {
    if (isLeaf) return "menu-leaf";
    if (depth === 0) return "menu-root";
    if (depth === 1) return "menu-category";
    return "menu-sub";
  };

  const menuStyleForClass = (cls) => {
    if (cls === "menu-root") {
      return { color: "#e6c37a", fontWeight: 700, fontSize: 20 };
    }
    if (cls === "menu-category") {
      return { color: "#e6c37a", fontWeight: 600 };
    }
    if (cls === "menu-sub") {
      return { color: "#d8b46a" };
    }
    return { color: "#ffffff" };
  };

  const renderMenuNodes = (nodes, depth = 0, path = [], pathIds = []) => {
    if (!Array.isArray(nodes) || nodes.length === 0) return null;

    return nodes.map((node, idx) => {
      if (!node || typeof node !== "object") return null;

      const name = node.name || node.title || "Untitled";
      const newPath = [...path, name];
    const newPathIds = [...pathIds, node.categoryId || node._id];

      const hasChildren = Array.isArray(node.children) && node.children.length > 0;
      const hasPrice = node.price !== undefined && node.price !== null;

      // Only render prices on leaf nodes
      if (!hasChildren && hasPrice) {
        const cls = menuClassForDepth(depth, true);
        return (
          <div
            key={`${depth}-leaf-${name}-${idx}`}
            style={{
              marginLeft: depth * 16,
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 12,
              ...menuStyleForClass(cls),
            }}
          >
            <span style={{ flex: 1 }}>{name}</span>
            <span style={{ minWidth: 90, textAlign: "right" }}>
              ₹ {node.price}
            </span>
            <button
              type="button"
              onClick={() => addToCart(node, newPath, newPathIds)}
              style={{
                minWidth: 70,
                textAlign: "right",
                color: "rgba(255,255,255,0.5)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              [+ Add]
            </button>
          </div>
        );
      }

      // Skip non-leaf nodes with no children
      if (!hasChildren) return null;

      const cls = menuClassForDepth(depth, false);
      const headingStyle = {
        marginBottom: 6,
        ...menuStyleForClass(cls),
      };

      return (
        <div
          key={`${depth}-node-${name}-${idx}`}
          style={{ marginBottom: 16 }}
        >
          <div style={{ ...headingStyle, marginLeft: depth * 14 }}>
            {name}
          </div>
          <div>{renderMenuNodes(node.children, depth + 1, newPath, newPathIds)}</div>
        </div>
      );
    });
  };






  return (
    <>

      {
        showLogin && (
          <div className="login-overlay" onClick={closeLogin}>
            <div
              className="login-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="login-small">Log in</p>

              <h2 className="login-title">
                Welcome to {
                  vendorInfo?.businessName ||
                  vendorInfo?.name ||
                  "Our Service"
                }
              </h2>

              <p className="login-desc">
                {otpSent
                  ? "Enter the OTP sent to your phone"
                  : "Explore our services with a quick login."}
              </p>

              {/* ================= MOBILE INPUT ================= */}
              {!otpSent && (
                <div className="login-input-row">
                  <select
                    className="login-code"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                  >
                    <option value="91">IN +91</option>
                  </select>


                  <input
                    className="login-input"
                    placeholder="Mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                  />
                </div>
              )}

              {/* ================= OTP INPUT ================= */}
              {otpSent && (
                <input
                  className="login-input"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              )}

              {/* ================= BUTTON ================= */}
              <button
                className="login-btn-main"
                onClick={!otpSent ? requestOtp : verifyOtp}
                disabled={loadingOtp}
              >
                {loadingOtp
                  ? "Please wait..."
                  : otpSent
                    ? "Verify OTP"
                    : "Continue"}
              </button>

              <button className="login-cancel" onClick={closeLogin}>
                Cancel
              </button>
            </div>
          </div>
        )

      }
      {/* ✅ HERO SECTION */}
      <HeroSection
        images={heroImages}

        // ⭐ GOOGLE (vendor API)
        googleRating={vendorInfo?.googlePlace?.rating}
        googleReviews={vendorInfo?.googlePlace?.userRatingsTotal}
        googleMapsUrl={vendorInfo?.googlePlace?.mapsUrl}

        // ⭐ TRUST (NEW)
        //trustSummary={vendorInfo?.trustSummary}
        trustSummary={vendorInfo?.trust || vendorInfo?.trustSummary}


        // 🟢 CATEGORY (category API)
        tagline={vendorInfo?.customFields?.freeText1 ||category?.homePopup?.tagline}
        description={vendorInfo?.customFields?.freeText2 ||category?.homePopup?.description}
        button1Label={category?.homePopup?.button1Label}
        button2Label={category?.homePopup?.button2Label}
      />



      {/* ✅ EXISTING EXPLORE CONTENT */}
      <section id="categories" className="women-styling">

        {/* 🔹 NORMAL SECTIONS */}
        {sectionsWithHeading.map(section => (
          <div
            key={section.sectionName}
            id={`cat-${toAnchor(section.sectionName)}`}
          // 🔥 THIS IS KEY
          >
            <h2
              id={`cat-${toAnchor(section.sectionName)}`}
              className="ws-heading"
            >
              {section.sectionName}
            </h2>



            <div className="ws-grid">
              {section.cards.map((c, index) => (
                <ServiceCard
                  key={`${section.sectionName}-${c.id || c.title}-${index}`}

                  data={c}
                  sectionName={section.sectionName}
                  openLogin={openLogin}
                />
              ))}

            </div>
          </div>
        ))}


        {/* 🔹 FLAT GRID (NO HEADINGS) */}
        {cardsWithoutHeading.length > 0 && (
          <div className="ws-grid">
            {cardsWithoutHeading.map((c, index) => (
              <div key={`flat-${c.id || c.title}-${index}`} className="ws-card-wrapper">

                {/* 🔹 SHOW HEADING INSTEAD OF CARD TITLE */}
                <h2
                  id={`cat-${toAnchor(c.title)}`}
                  className="ws-heading small"
                >
                  {c.title}
                </h2>

                <ServiceCard
                  key={c.id}
                  data={c}
                  sectionName={c.title}



                  openLogin={openLogin}
                />

              </div>
            ))}
          </div>
        )}


      </section>
      {category?.whyUs && (
        <AdvantageSection whyUs={category.whyUs} />
      )}

      <RootsSection about={category?.about} />
      {viewMode === "menu" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(8, 8, 8, 0.96)",
            color: "#f3f3f3",
            zIndex: 2000,
            overflowY: "auto",
            padding: "24px",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Menu</div>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              style={{
                marginLeft: "auto",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#f3f3f3",
                padding: "6px 10px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>

          <div
            style={{
              display: "flex",
              width: "100%",
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: 1, paddingRight: isMobile ? 0 : "320px" }}>
              {menuTree.length === 0 ? (
                <div>No services available</div>
              ) : (
                <div>
                  {renderMenuNodes(
                    menuTree,
                    0,
                    [],
                    rootCategoryId ? [rootCategoryId] : []
                  )}
                </div>
              )}
            </div>
            {!isMobile && (
              <div
                style={{
                  width: "300px",
                  position: "sticky",
                  top: "80px",
                  marginLeft: "20px",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxHeight: "75vh",
                    overflowY: "auto",
                    background: "rgba(12, 10, 8, 0.95)",
                    border: "1px solid rgba(245, 217, 122, 0.35)",
                    borderRadius: 10,
                    padding: "12px",
                    color: "#f3f3f3",
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#F5D97A", marginBottom: 10 }}>
                    Cart
                  </div>
                  {cartItems.length === 0 ? (
                    <div style={{ color: "rgba(255,255,255,0.6)" }}>Empty</div>
                  ) : (
                    <>
                      {cartItems.map((item, index) => (
                        <div
                          key={`${item.itemId || item.name}-${index}`}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            marginBottom: 12,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <span style={{ flex: 1 }}>{item.name}</span>
                            <span style={{ minWidth: 80, textAlign: "right" }}>
                              ₹ {item.total}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ minWidth: 40, color: "rgba(255,255,255,0.8)" }}>
                              x{item.qty}
                            </span>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => increaseQty(item.itemId)}
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 4,
                                  border: "1px solid rgba(245, 217, 122, 0.35)",
                                  background: "transparent",
                                  color: "#F5D97A",
                                  cursor: "pointer",
                                }}
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => decreaseQty(item.itemId)}
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 4,
                                  border: "1px solid rgba(245, 217, 122, 0.35)",
                                  background: "transparent",
                                  color: "#F5D97A",
                                  cursor: "pointer",
                                }}
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem(item.itemId)}
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 4,
                                  border: "1px solid rgba(245, 217, 122, 0.35)",
                                  background: "transparent",
                                  color: "#F5D97A",
                                  cursor: "pointer",
                                }}
                              >
                                🗑
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div
                        className="cart-total"
                        style={{
                          borderTop: "1px solid rgba(245, 217, 122, 0.25)",
                          paddingTop: 10,
                          marginTop: 8,
                          fontWeight: 700,
                          color: "#F5D97A",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>Total</span>
                        <span>₹ {cartTotal}</span>
                      </div>
                      {earnPoints > 0 && (
                        <div style={{ marginTop: 6 }}>
                          You will earn: {earnPoints} points
                        </div>
                      )}
                      <button
                        onClick={clearCart}
                        style={{
                          width: "100%",
                          background: "#222",
                          border: "1px solid #555",
                          padding: "10px",
                          borderRadius: "8px",
                          color: "#fff",
                          marginTop: "10px",
                          cursor: "pointer",
                        }}
                      >
                        Clear Cart
                      </button>
                      <div
                        style={{
                          borderTop: "1px solid #333",
                          marginTop: "20px",
                          paddingTop: "15px",
                        }}
                      >
                        <label style={{ color: "#e6c37a", fontSize: "14px" }}>
                          Customer Mobile
                        </label>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            background: "#111",
                            border: "1px solid #444",
                            borderRadius: "8px",
                            overflow: "hidden",
                            marginTop: "6px",
                            marginBottom: "10px",
                          }}
                        >
                          <div
                            style={{
                              padding: "10px 12px",
                              borderRight: "1px solid #333",
                              color: "#aaa",
                              fontWeight: 500,
                            }}
                          >
                            +91
                          </div>
                          <input
                            value={customerMobile}
                            onChange={(e) => setCustomerMobile(e.target.value)}
                            placeholder="Enter mobile"
                            style={{
                              flex: 1,
                              background: "transparent",
                              border: "none",
                              outline: "none",
                              color: "#fff",
                              padding: "10px",
                            }}
                          />
                        </div>
                        <div style={{ fontSize: "13px", color: "#aaa", marginTop: 6 }}>
                          Available Points: {availablePoints}
                        </div>
                        {verifyingCustomer && (
                          <div style={{ fontSize: "12px", color: "#999", marginTop: 6 }}>
                            Checking customer...
                          </div>
                        )}
                        {availablePoints > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: "12px", color: "#aaa" }}>
                              Redeem Points
                            </div>
                            <input
                              type="number"
                              value={redeemPoints}
                              min={0}
                              max={availablePoints}
                              onChange={(e) => setRedeemPoints(Number(e.target.value))}
                              style={{
                                width: "100%",
                                background: "#111",
                                border: "1px solid #444",
                                padding: "10px",
                                borderRadius: "8px",
                                color: "#fff",
                                marginTop: "6px",
                              }}
                            />
                          </div>
                        )}
                        {showOtpInput && (
                          <div style={{ marginTop: 10 }}>
                            <input
                              placeholder="Enter OTP"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                              style={{
                                width: "100%",
                                background: "#111",
                                border: "1px solid #444",
                                padding: "10px",
                                borderRadius: "8px",
                                color: "#fff",
                              }}
                            />
                          </div>
                        )}
                        {showOtpInput && (
                          <button
                            onClick={handleVerifyOtp}
                            style={{
                              marginTop: "10px",
                              width: "100%",
                              background: "#222",
                              border: "1px solid #555",
                              padding: "10px",
                              borderRadius: "8px",
                              color: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            Verify OTP
                          </button>
                        )}
                        <button
                          onClick={handleGenerateBill}
                          style={{
                            marginTop: "14px",
                            width: "100%",
                            background: "#e6c37a",
                            color: "#000",
                            padding: "12px",
                            borderRadius: "10px",
                            fontWeight: "600",
                            opacity:
                              cartItems.length > 0 &&
                                customerValidated &&
                                loyaltyLoaded &&
                                checkingCustomer === false &&
                                !processingBill &&
                                !showOtpInput &&
                                !verifyingCustomer
                                ? 1
                                : 0.6,
                            cursor:
                              cartItems.length > 0 &&
                                customerValidated &&
                                loyaltyLoaded &&
                                checkingCustomer === false &&
                                !processingBill &&
                                !showOtpInput &&
                                !verifyingCustomer
                                ? "pointer"
                                : "not-allowed",
                          }}
                          disabled={
                            !(
                              cartItems.length > 0 &&
                              customerValidated &&
                              loyaltyLoaded &&
                              checkingCustomer === false &&
                              !processingBill &&
                              !showOtpInput &&
                              !verifyingCustomer
                            )
                          }
                        >
                          Generate Bill
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {isMobile && (
            <>
              <div
                onClick={() => setCartOpen(true)}
                style={{
                  position: "fixed",
                  bottom: "20px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#e6c37a",
                  color: "#000",
                  padding: "12px 20px",
                  borderRadius: "30px",
                  fontWeight: "600",
                  zIndex: 3000,
                  cursor: "pointer",
                }}
              >
                Cart ({cartItems.length}) ₹{cartTotal}
              </div>

              {cartOpen && (
                <div
                  style={{
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "#0a0a0a",
                    borderTopLeftRadius: "20px",
                    borderTopRightRadius: "20px",
                    maxHeight: "70vh",
                    overflowY: "auto",
                    padding: "20px",
                    zIndex: 4000,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#F5D97A" }}>
                      Cart
                    </div>
                    <button
                      type="button"
                      onClick={() => setCartOpen(false)}
                      style={{
                        marginLeft: "auto",
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "#f3f3f3",
                        padding: "6px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      Close
                    </button>
                  </div>
                  <div
                    style={{
                      background: "rgba(12, 10, 8, 0.95)",
                      border: "1px solid rgba(245, 217, 122, 0.35)",
                      borderRadius: 10,
                      padding: "12px",
                      color: "#f3f3f3",
                    }}
                  >
                    {cartItems.length === 0 ? (
                      <div style={{ color: "rgba(255,255,255,0.6)" }}>Empty</div>
                    ) : (
                      <>
                        {cartItems.map((item, index) => (
                          <div
                            key={`${item.itemId || item.name}-${index}`}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                              marginBottom: 12,
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                              <span style={{ flex: 1 }}>{item.name}</span>
                              <span style={{ minWidth: 80, textAlign: "right" }}>
                                ₹ {item.total}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ minWidth: 40, color: "rgba(255,255,255,0.8)" }}>
                                x{item.qty}
                              </span>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  type="button"
                                  onClick={() => increaseQty(item.itemId)}
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 4,
                                    border: "1px solid rgba(245, 217, 122, 0.35)",
                                    background: "transparent",
                                    color: "#F5D97A",
                                    cursor: "pointer",
                                  }}
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() => decreaseQty(item.itemId)}
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 4,
                                    border: "1px solid rgba(245, 217, 122, 0.35)",
                                    background: "transparent",
                                    color: "#F5D97A",
                                    cursor: "pointer",
                                  }}
                                >
                                  -
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.itemId)}
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 4,
                                    border: "1px solid rgba(245, 217, 122, 0.35)",
                                    background: "transparent",
                                    color: "#F5D97A",
                                    cursor: "pointer",
                                  }}
                                >
                                  🗑
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div
                          className="cart-total"
                          style={{
                            borderTop: "1px solid rgba(245, 217, 122, 0.25)",
                            paddingTop: 10,
                            marginTop: 8,
                            fontWeight: 700,
                            color: "#F5D97A",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>Total</span>
                          <span>₹ {cartTotal}</span>
                        </div>
                        {earnPoints > 0 && (
                          <div style={{ marginTop: 6 }}>
                            You will earn: {earnPoints} points
                          </div>
                        )}
                        <button
                          onClick={clearCart}
                          style={{
                            width: "100%",
                            background: "#222",
                            border: "1px solid #555",
                            padding: "10px",
                            borderRadius: "8px",
                            color: "#fff",
                            marginTop: "10px",
                            cursor: "pointer",
                          }}
                        >
                          Clear Cart
                        </button>
                        <div
                          style={{
                            borderTop: "1px solid #333",
                            marginTop: "20px",
                            paddingTop: "15px",
                          }}
                        >
                          <label style={{ color: "#e6c37a", fontSize: "14px" }}>
                            Customer Mobile
                          </label>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              background: "#111",
                              border: "1px solid #444",
                              borderRadius: "8px",
                              overflow: "hidden",
                              marginTop: "6px",
                              marginBottom: "10px",
                            }}
                          >
                            <div
                              style={{
                                padding: "10px 12px",
                                borderRight: "1px solid #333",
                                color: "#aaa",
                                fontWeight: 500,
                              }}
                            >
                              +91
                            </div>
                            <input
                              value={customerMobile}
                              onChange={(e) => setCustomerMobile(e.target.value)}
                              placeholder="Enter mobile"
                              style={{
                                flex: 1,
                                background: "transparent",
                                border: "none",
                                outline: "none",
                                color: "#fff",
                                padding: "10px",
                              }}
                            />
                          </div>
                          <div style={{ fontSize: "13px", color: "#aaa" }}>
                            Available Points: {availablePoints}
                          </div>
                          {verifyingCustomer && (
                            <div style={{ fontSize: "12px", color: "#999", marginTop: 6 }}>
                              Checking customer...
                            </div>
                          )}
                          {availablePoints > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: "12px", color: "#aaa" }}>
                                Redeem Points
                              </div>
                              <input
                                type="number"
                                value={redeemPoints}
                                min={0}
                                max={availablePoints}
                                onChange={(e) => setRedeemPoints(Number(e.target.value))}
                                style={{
                                  width: "100%",
                                  background: "#111",
                                  border: "1px solid #444",
                                  padding: "10px",
                                  borderRadius: "8px",
                                  color: "#fff",
                                  marginTop: "6px",
                                }}
                              />
                            </div>
                          )}
                          {showOtpInput && (
                            <div style={{ marginTop: 10 }}>
                              <input
                                placeholder="Enter OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                style={{
                                  width: "100%",
                                  background: "#111",
                                  border: "1px solid #444",
                                  padding: "10px",
                                  borderRadius: "8px",
                                  color: "#fff",
                                }}
                              />
                            </div>
                          )}
                          {showOtpInput && (
                            <button
                              onClick={handleVerifyOtp}
                              style={{
                                marginTop: "10px",
                                width: "100%",
                                background: "#222",
                                border: "1px solid #555",
                                padding: "10px",
                                borderRadius: "8px",
                                color: "#fff",
                                cursor: "pointer",
                              }}
                            >
                              Verify OTP
                            </button>
                          )}
                          <button
                            onClick={handleGenerateBill}
                            style={{
                              marginTop: "14px",
                              width: "100%",
                              background: "#e6c37a",
                              color: "#000",
                              padding: "12px",
                              borderRadius: "10px",
                              fontWeight: "600",
                              opacity:
                                cartItems.length > 0 &&
                                  customerValidated &&
                                  loyaltyLoaded &&
                                  checkingCustomer === false &&
                                  !processingBill &&
                                  !showOtpInput &&
                                  !verifyingCustomer
                                  ? 1
                                  : 0.6,
                              cursor:
                                cartItems.length > 0 &&
                                  customerValidated &&
                                  loyaltyLoaded &&
                                  checkingCustomer === false &&
                                  !processingBill &&
                                  !showOtpInput &&
                                  !verifyingCustomer
                                  ? "pointer"
                                  : "not-allowed",
                            }}
                            disabled={
                              !(
                                cartItems.length > 0 &&
                                customerValidated &&
                                loyaltyLoaded &&
                                checkingCustomer === false &&
                                !processingBill &&
                                !showOtpInput &&
                                !verifyingCustomer
                              )
                            }
                          >
                            Generate Bill
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {viewMode === "loyalty" && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#111",
            color: "#fff",
            padding: 16,
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            maxHeight: "85vh",
            overflowY: "auto",
            zIndex: 9999,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
            Loyalty Program Settings
          </div>

          {loadingRule ? (
            <div style={{ fontSize: 14, color: "#ccc", marginBottom: 12 }}>
              Loading...
            </div>
          ) : null}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <label style={{ fontWeight: 600 }}>Enabled</label>
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, marginBottom: 6 }}>Earn Percentage</div>
            <input
              type="number"
              value={percentPer100}
              onChange={(e) => setPercentPer100(Number(e.target.value))}
              style={{
                width: "100%",
                background: "#0b0b0b",
                border: "1px solid #333",
                color: "#fff",
                padding: "10px",
                borderRadius: 8,
              }}
            />
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
              % points per ₹100 spent
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, marginBottom: 6 }}>Expiry Days</div>
            <input
              type="number"
              value={expiryDays}
              onChange={(e) => setExpiryDays(Number(e.target.value))}
              style={{
                width: "100%",
                background: "#0b0b0b",
                border: "1px solid #333",
                color: "#fff",
                padding: "10px",
                borderRadius: 8,
              }}
            />
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
              Points expiry (days)
            </div>
          </div>

          {saveMessage && (
            <div style={{ fontSize: 12, color: "#7fe3a2", marginBottom: 8 }}>
              {saveMessage}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={saveLoyaltyRule}
              disabled={savingRule}
              style={{
                flex: 1,
                background: "#e6c37a",
                color: "#000",
                padding: "10px",
                borderRadius: 10,
                fontWeight: 600,
                border: "none",
                cursor: savingRule ? "not-allowed" : "pointer",
                opacity: savingRule ? 0.7 : 1,
              }}
            >
              {savingRule ? "Saving..." : "Save Settings"}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("menu")}
              style={{
                flex: 1,
                background: "#222",
                color: "#fff",
                padding: "10px",
                borderRadius: 10,
                fontWeight: 600,
                border: "1px solid #333",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setViewMode("menu")}
        style={{
          position: "fixed",
          right: 20,
          bottom: 90,
          padding: "12px 18px",
          borderRadius: 999,
          border: "none",
          cursor: "pointer",
          background: "linear-gradient(135deg, #E6BF6A, #CFA94E)",
          color: "#0B0B0D",
          fontWeight: 900,
          boxShadow:
            "0 6px 14px rgba(255, 200, 110, 0.35), 0 0 18px rgba(255, 190, 120, 0.35)",
          zIndex: 1000,
        }}
      >
        Menu
      </button>

      <button
        type="button"
        onClick={() => setViewMode("loyalty")}
        style={{
          position: "fixed",
          right: 20,
          bottom: 150,
          padding: "12px 18px",
          borderRadius: 999,
          border: "1px solid #e6c37a",
          cursor: "pointer",
          background: "#111",
          color: "#e6c37a",
          fontWeight: 900,
          boxShadow:
            "0 6px 14px rgba(255, 200, 110, 0.15), 0 0 18px rgba(255, 190, 120, 0.2)",
          zIndex: 1000,
        }}
      >
        Loyalty ⚙️
      </button>

    </>
  );

}
  // --------------------------------------------------
  // ✅ MAIN Explore Page with Suspense wrapper
  // --------------------------------------------------
  export default function Explore({ onReady }) {
    return (

      <Suspense fallback={<div>Loading...</div>}>
        <ExploreContent onReady={onReady} />
      </Suspense>
    );
  }

