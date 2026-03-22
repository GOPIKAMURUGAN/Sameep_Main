"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import CategoryCard from "../components/CategoryCard";
import { getCategories } from "../services/api";

export default function Home() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        setError("");
        const data = await getCategories();
        setCategories(data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load categories right now.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const sortedCategories = [...categories].sort(
    (a, b) =>
      (b.vendorCount || b.totalVendors || 0) -
      (a.vendorCount || a.totalVendors || 0)
  );

  const featuredCategories = sortedCategories.slice(0, 6);

  return (
    <div className="pageWrapper">
      <section className="heroCard heroCardExpanded">
        <div className="heroShell">
          <div className="heroSection">
            <div className="brandLockup">
              <Image
                src="/ynot-logo.svg"
                alt="YNOT Go Online. Instantly."
                width={272}
                height={80}
                priority
                className="brandLogo"
              />
            </div>
            <p className="brand">YNOT</p>
            <h1 className="title">Get Your Business Online</h1>
            <p className="subtitle">
              Build your digital storefront, showcase your services, and start
              onboarding customers in minutes.
            </p>
            <div className="heroActions">
              <button
                className="ctaButton"
                onClick={() => router.push("/onboarding")}
              >
                Set up my business
              </button>
              <button
                className="ghostCtaButton"
                onClick={() => {
                  const target = document.getElementById("categories");
                  target?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Explore categories
              </button>
            </div>
          </div>

          <div className="heroHighlights">
            <div className="heroHighlightCard">
              <div className="heroHighlightValue">500+</div>
              <div className="heroHighlightLabel">Vendors already using YNOT</div>
            </div>
            <div className="heroHighlightCard">
              <div className="heroHighlightValue">10+</div>
              <div className="heroHighlightLabel">Service categories to start from</div>
            </div>
            <div className="heroHighlightCard">
              <div className="heroHighlightValue">3 steps</div>
              <div className="heroHighlightLabel">Choose, onboard, go live</div>
            </div>
          </div>
        </div>

        <div className="howItWorks">
          <div className="sectionHeader">
            <p className="sectionEyebrow">How It Works</p>
            <h2>Launch faster with a guided setup flow</h2>
          </div>
          <div className="stepsGrid">
            <div className="stepCard">
              <div className="stepNumber">01</div>
              <h3>Choose your category</h3>
              <p>Start with the service category that best matches your business.</p>
            </div>
            <div className="stepCard">
              <div className="stepNumber">02</div>
              <h3>Set up your profile</h3>
              <p>Add your business details, services, and onboarding information.</p>
            </div>
            <div className="stepCard">
              <div className="stepNumber">03</div>
              <h3>Go online instantly</h3>
              <p>Get ready to publish your presence and begin taking customer interest.</p>
            </div>
          </div>
        </div>

        <div className="categoriesSection" id="categories">
          <div className="sectionHeader sectionHeaderInline">
            <div>
              <p className="sectionEyebrow">Popular Categories</p>
              <h2>Pick your category and get started</h2>
            </div>
            <div className="trustSection">
              Trusted by 500+ vendors across categories
            </div>
          </div>

          {loading ? <div className="loadingState">Loading categories...</div> : null}
          {!loading && error ? <div className="emptyState">{error}</div> : null}
          {!loading && !error ? (
            <div className="grid">
              {featuredCategories.map((cat) => {
                const categoryId = cat.categoryId || cat.id || cat._id;

                return (
                  <CategoryCard
                    key={categoryId}
                    category={cat}
                    onClick={() =>
                      router.push(`/onboarding?categoryId=${categoryId}`)
                    }
                  />
                );
              })}
            </div>
          ) : null}

          {!loading && !error && categories.length === 0 ? (
            <div className="emptyState">No categories available right now.</div>
          ) : null}

          {!loading && !error && sortedCategories.length > 6 ? (
            <>
              <div className="sectionHeader sectionHeaderSecondary">
                <div>
                  <p className="sectionEyebrow">Explore All</p>
                  <h2>More categories on YNOT</h2>
                </div>
              </div>
              <div className="grid">
                {sortedCategories.slice(6).map((cat) => {
                  const categoryId = cat.categoryId || cat.id || cat._id;

                  return (
                    <CategoryCard
                      key={categoryId}
                      category={cat}
                      onClick={() =>
                        router.push(`/onboarding?categoryId=${categoryId}`)
                      }
                    />
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
