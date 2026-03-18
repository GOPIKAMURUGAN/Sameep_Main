"use client";

import { useEffect, useState } from "react";
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

  return (
    <div className="pageWrapper">
      <section className="heroCard heroCardExpanded">
        <div className="heroSection">
          <p className="brand">YNOT</p>
          <h1 className="title">Get Your Business Online</h1>
          <p className="subtitle">
            Launch your business presence in minutes with a powerful digital
            setup.
          </p>
          <button
            className="ctaButton"
            onClick={() => router.push("/onboarding")}
          >
            Set up my business
          </button>
        </div>

        <div className="trustSection">
          Trusted by 500+ vendors across categories
        </div>

        {loading ? <div className="loadingState">Loading categories...</div> : null}
        {!loading && error ? <div className="emptyState">{error}</div> : null}
        {!loading && !error ? (
          <div className="grid">
            {sortedCategories.map((cat) => {
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
      </section>
    </div>
  );
}
