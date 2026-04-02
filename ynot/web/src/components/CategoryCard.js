"use client";

export default function CategoryCard({
  category,
  onClick,
  disabled = false,
  variant = "featured",
}) {
  const vendorCount = category.vendorCount || category.totalVendors || 0;
  const isPopular = vendorCount > 50;
  const categoryClassName = `categoryCard categoryCard${variant[0].toUpperCase()}${variant.slice(
    1
  )}${disabled ? " categoryCardDisabled" : ""}`;
  const badgeLabel = disabled ? "Coming soon" : isPopular ? "Popular" : null;

  return (
    <article
      className={categoryClassName}
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
        <div className="categoryOverlay" />
        {badgeLabel ? <span className="categoryBadge">{badgeLabel}</span> : null}
      </div>

      <div className="categoryContent">
        <h3>{category.name}</h3>
        <p className="vendorCount">
          {disabled
            ? "Vendor onboarding opens soon"
            : `${vendorCount} vendors growing`}
        </p>
      </div>
    </article>
  );
}
