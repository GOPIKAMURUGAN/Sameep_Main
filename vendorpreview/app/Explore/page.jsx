"use client";
export const dynamic = "force-dynamic";

import AdvantageSection from "../About/About";
import RootsSection from "../Root/RootSection";
import { useEffect, useState, useMemo } from "react";
import { useVendor } from "../Vendorcontext";
import "./Explore.css";
import HeroSection from "../Hero/Hero";
import { API_BASE_URL } from "../../config";
// adjust path if needed: ../config or ../../config

import { useSearchParams } from "next/navigation";


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

function ServiceCard({ data, sectionName }) {


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
          <button className="btn-primary">Enroll Now</button>
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

    const main = data.options.find(o => o.label === selectedMain);
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
    const main = data.options.find(o => o.label === selectedMain);
    if (main) sum += main.price || 0;

    const sub = main?.subOptions?.find(s => s.label === selectedSub);
    if (sub) sum += sub.price || 0;

    return sum || data.base;
  }, [data, selectedMain, selectedSub]);

  const dynamicImg = useMemo(() => {
    if (!selectedMain) return data.img || null;
    const main = data.options.find(o => o.label === selectedMain);

    if (selectedSub && main?.subOptions?.length) {
      const sub = main.subOptions.find(s => s.label === selectedSub);
      if (sub?.imageUrl) return sub.imageUrl;
    }

    return main?.imageUrl || data.img || null;
  }, [data, selectedMain, selectedSub]);
  const selectedTerms = useMemo(() => {
    if (!selectedMain) return [];

    const main = data.options.find(o => o.label === selectedMain);
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
        {data.options.map(opt => (
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
        data.options.find(o => o.label === selectedMain)?.subOptions?.length > 0 && (
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
        <button className="btn-primary">Enroll Now</button>
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

function convertFromTree(tree, imageMap) {
  return tree
    .map(level0 => {
      // ✅ CASE 0: level-0 leaf
      if (
        level0.isLeaf &&
        level0.pricingStatus === "Active"
      ) {
        return {
          sectionName: level0.name,
          cards: [
            {
              title: level0.name,
              img: imageMap[level0.categoryId] || null,
              base: Number(level0.price) || 0,
              options: [],
              simple: true,


            },
          ],
        };
      }

      // ✅ CASE: level0 has multiple ACTIVE level1 leaves → ONE card with options
      const activeLevel1Leaves =
        (level0.children || []).filter(
          c => c.isLeaf && c.pricingStatus === "Active"
        );

      if (activeLevel1Leaves.length > 1) {
        let minPrice = Infinity;

        const options = activeLevel1Leaves.map(c => {
          const price = Number(c.price) || 0;
          if (price < minPrice) minPrice = price;

          return {
            label: c.name.trim(),
            price,
            imageUrl: imageMap[c.categoryId] || null,
            terms: normalizeTerms(c.terms || ""), // ✅ ADD
          };

        });

        return {
          sectionName: level0.name,
          cards: [
            {
              title: level0.name,
              img: imageMap[level0.categoryId] || null,
              options,
              base: minPrice === Infinity ? 0 : minPrice,
              defaultMain: options[0]?.label || null,
              defaultSub: null,
              simple: false,

            },
          ],
        };
      }


      return {
        sectionName: level0.name,
        cards: (level0.children || [])
          .map(level1 => {
            let minPrice = Infinity;
            let defaultMain = null;
            let defaultSub = null;
            const options = [];

            // ✅ CASE 1: level1 itself is a leaf
            if (
              level1.isLeaf &&
              level1.pricingStatus === "Active"
            ) {

              return {
                title: level1.name,
                img: imageMap[level1.categoryId] || null,
                base: Number(level1.price) || 0,
                options: [],
                simple: true,



              };

            }

            // ✅ CASE 2: single child leaf
            if (
              level1.children?.length === 1 &&
              level1.children[0].isLeaf &&
              level1.children[0].pricingStatus === "Active"
            ) {

              return {
                title: level1.name,
                img: imageMap[level1.categoryId] || null,
                base: Number(level1.price) || 0,
                options: [],
                simple: true,



              };

            }
            // ✅ GROUP mixed level1 nodes (leaf + parent) into ONE card
            const activeLevel1 = (level0.children || []).filter(
              c => c.pricingStatus === "Active"
            );

            if (activeLevel1.length > 1) {
              let minPrice = Infinity;

              const options = activeLevel1.map(l1 => {
                // CASE A: level1 is a leaf
                if (l1.isLeaf) {
                  const price = Number(l1.price) || 0;
                  minPrice = Math.min(minPrice, price);

                  return {
                    label: l1.name.trim(),
                    price,
                    imageUrl: imageMap[l1.categoryId] || null,
                    subOptions: [],
                  };
                }

                // CASE B: level1 has children (Self Play)
                const subOptions = (l1.children || [])
                  .filter(c => c.pricingStatus === "Active")
                  .map(c => {
                    const price = Number(c.price) || 0;
                    minPrice = Math.min(minPrice, price);

                    return {
                      label: c.name.trim(),
                      price,
                      imageUrl: imageMap[c.categoryId] || null,
                      terms: normalizeTerms(c.terms || ""), // ✅ ADD
                    };

                  });

                return {
                  label: l1.name.trim(),
                  price: 0,
                  imageUrl: imageMap[l1.categoryId] || null,
                  subOptions,
                };
              });

              return {
                sectionName: level0.name,
                cards: [
                  {
                    title: level0.name,
                    img: imageMap[level0.categoryId] || null,
                    options,
                    base: minPrice === Infinity ? 0 : minPrice,
                    defaultMain: options[0]?.label || null,
                    defaultSub: options[0]?.subOptions?.[0]?.label || null,
                    simple: false,
                    terms: collectLeafTerms(level0),


                  },
                ],
              };
            }

            // ---------------- NORMAL CARD FLOW ----------------
            // ---------------- NORMAL CARD FLOW ----------------
            level1.children?.forEach(level2 => {

              // ✅ CASE 1: level2 is a LEAF → main option (no sub-options)
              if (level2.isLeaf && level2.pricingStatus === "Active") {
                const price = Number(level2.price) || 0;

                options.push({
                  label: level2.name.trim(),
                  price,
                  imageUrl: imageMap[level2.categoryId] || null,
                  terms: normalizeTerms(level2.terms || ""),
                  subOptions: [], // ✅ leaf → empty
                });

                if (price < minPrice) {
                  minPrice = price;
                  defaultMain = level2.name.trim();
                }
              }

              // ✅ CASE 2: level2 has children → THESE ARE SUB-OPTIONS
              else if (level2.children?.length) {
                const subOptions = level2.children
                  .filter(c => c.isLeaf && c.pricingStatus === "Active")
                  .map(c => {
                    const price = Number(c.price) || 0;

                    if (price < minPrice) {
                      minPrice = price;
                      defaultMain = level2.name.trim();
                      defaultSub = c.name.trim();
                    }

                    return {
                      label: c.name.trim(),
                      price,
                      imageUrl: imageMap[c.categoryId] || null,
                      terms: normalizeTerms(c.terms || ""),
                    };
                  });

                if (!subOptions.length) return;

                options.push({
                  label: level2.name.trim(),   // 👈 parent (Hair Spa, Manicure, etc.)
                  price: 0,
                  imageUrl: imageMap[level2.categoryId] || null,
                  subOptions,                  // ✅ THIS WAS MISSING
                });
              }
            });


            if (!options.length) return null;
            // const leaf = level1.children[0];
            return {
              title: level1.name,
              img: imageMap[level1.categoryId] || null,
              options,
              base: minPrice === Infinity ? 0 : minPrice,
              defaultMain,
              defaultSub,
              simple: false,
              terms: collectLeafTerms(level1),

            };


          })
          .filter(Boolean),
      };
    })
    .filter(section => section.cards.length);
}


// --------------------------------------------------
// MAIN Explore Page
// --------------------------------------------------
export default function Page({ onReady }) {
  const [vendorLoaded, setVendorLoaded] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [category, setCategory] = useState(null);


const toAnchor = (label) =>
  label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

  const { vendorInfo, setVendorInfo } = useVendor();

  const googleRating = vendorInfo?.googlePlace?.rating;
  const googleReviews = vendorInfo?.googlePlace?.userRatingsTotal;
  const googleMapsUrl = vendorInfo?.googlePlace?.mapsUrl;

  const searchParams = useSearchParams();
  const rootCategoryId = searchParams.get("rootCategoryId");
  const vendorId = searchParams.get("vendorId");

  useEffect(() => {
    if (!vendorId) return;

    async function fetchVendor() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/dummy-vendors/${vendorId}`,
          { cache: "no-store" }
        );

        if (!res.ok) throw new Error("Vendor API failed");

        const data = await res.json();
        setVendorInfo(data);

        setVendorLoaded(true); // ✅ MARK DONE
      } catch (err) {
        console.error("Vendor fetch error", err);
        setVendorLoaded(true); // still unblock UI
      }
    }

    fetchVendor();
  }, [vendorId, setVendorInfo]);


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

      // ✅ Global state (Header uses this)
      setVendorInfo(prev => ({
        ...prev,
        categoryData: categoryObj
      }));

    } catch (err) {
      console.error("Category fetch error", err);
    }
  }

  fetchCategory();
}, [rootCategoryId, setVendorInfo]);


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
        const pricingData = await pricingRes.json();

        const categoryTree = await buildCategoryTree(rootCategoryId);
        const imageMap = buildImageMapFromTree(categoryTree);

        setHeroImages(extractHeroImages(categoryTree));

        const converted = convertFromTree(pricingData.tree, imageMap);
        setFinalCategories(converted);
        // ⭐ store first-level categories for Footer → Popular
setVendorInfo(prev => ({
  ...prev,
  popularCategories: converted.map(section => ({
    name: section.sectionName
  }))
}));

        setDataLoaded(true); // ✅ MARK DONE
      } catch (e) {
        console.error("API Error:", e);
        setDataLoaded(true);
      }
    }

    load();
  }, [vendorId, rootCategoryId]);
  useEffect(() => {
    if (vendorLoaded && dataLoaded) {
      onReady?.();
    }
  }, [vendorLoaded, dataLoaded, onReady]);

  const sectionsWithHeading = [];
  const cardsWithoutHeading = [];

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


  return (
    <>
      {/* ✅ HERO SECTION */}
      <HeroSection
        images={heroImages}

        // ⭐ GOOGLE (vendor API)
        googleRating={vendorInfo?.googlePlace?.rating}
        googleReviews={vendorInfo?.googlePlace?.userRatingsTotal}
        googleMapsUrl={vendorInfo?.googlePlace?.mapsUrl}

        // 🟢 CATEGORY (category API)
        tagline={category?.homePopup?.tagline}
        description={category?.homePopup?.description}
        button1Label={category?.homePopup?.button1Label}
        button2Label={category?.homePopup?.button2Label}
      />



      {/* ✅ EXISTING EXPLORE CONTENT */}
      <section id="categories"  className="women-styling">

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
      {section.cards.map(c => (
        <ServiceCard key={c.title} data={c} sectionName={section.sectionName} />
      ))}
    </div>
  </div>
))}


        {/* 🔹 FLAT GRID (NO HEADINGS) */}
        {cardsWithoutHeading.length > 0 && (
          <div className="ws-grid">
            {cardsWithoutHeading.map(c => (
              <div key={c.title} className="ws-card-wrapper">
                {/* 🔹 SHOW HEADING INSTEAD OF CARD TITLE */}
              <h2
  id={`cat-${toAnchor(c.title)}`}
  className="ws-heading small"
>
  {c.title}
</h2>


                <ServiceCard
                  data={c}
                  sectionName={c.title}  // forces card title to hide
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


    </>
  );

}
