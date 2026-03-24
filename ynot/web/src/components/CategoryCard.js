"use client";

export default function CategoryCard({ category, onClick, disabled = false }) {
  const vendorCount = category.vendorCount || category.totalVendors || 0;
  const isPopular = vendorCount > 50;
  const badgeLabel = disabled ? "Coming Soon" : isPopular ? "Popular" : null;

  return (
    <div
      className={`categoryCard${disabled ? " categoryCardDisabled" : ""}`}
      onClick={disabled ? undefined : onClick}
      role={disabled ? undefined : "button"}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={
        disabled
          ? undefined
          : (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
      }
    >
      <div className="categoryMedia">
        <img
          src={category.imageUrl || "/placeholder.svg"}
          alt={category.name}
          className="categoryImage"
        />
        {badgeLabel ? <span className="categoryBadge">{badgeLabel}</span> : null}
      </div>

      <div className="categoryContent">
        <h3>{category.name}</h3>

        <p className="vendorCount">
          {disabled ? "Vendor onboarding opens soon" : `${vendorCount} vendors already growing`}
        </p>
      </div>
    </div>
  );
}
