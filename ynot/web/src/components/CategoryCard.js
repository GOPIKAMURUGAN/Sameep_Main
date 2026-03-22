"use client";

export default function CategoryCard({ category, onClick }) {
  const vendorCount = category.vendorCount || category.totalVendors || 0;
  const isPopular = vendorCount > 50;

  return (
    <div className="categoryCard" onClick={onClick}>
      <div className="categoryMedia">
        <img
          src={category.imageUrl || "/placeholder.svg"}
          alt={category.name}
          className="categoryImage"
        />
        {isPopular ? <span className="categoryBadge">Popular</span> : null}
      </div>

      <div className="categoryContent">
        <h3>{category.name}</h3>

        <p className="vendorCount">{vendorCount} vendors already growing</p>
      </div>
    </div>
  );
}
