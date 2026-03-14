"use client";
import "../components/dashboard/ProfileDashboard.css";

function normalizeGalleryImages(rowImages) {
  if (!rowImages) return [];

  if (Array.isArray(rowImages)) {
    return rowImages.filter(Boolean);
  }

  if (typeof rowImages === "object") {
    return Object.values(rowImages)
      .flat()
      .filter(Boolean);
  }

  return [];
}

function normalizeSocialLinks(vendorInfo) {
  const socialLinks = vendorInfo?.socialLinks || {};

  return [
    {
      key: "instagram",
      label: "Instagram",
      value: socialLinks.instagram || vendorInfo?.instagram,
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      value: socialLinks.linkedin || vendorInfo?.linkedin,
    },
    {
      key: "facebook",
      label: "Facebook",
      value: socialLinks.facebook || vendorInfo?.facebook,
    },
    {
      key: "youtube",
      label: "YouTube",
      value: socialLinks.youtube || vendorInfo?.youtube,
    },
    {
      key: "twitter",
      label: "Twitter",
      value:
        socialLinks.twitter ||
        socialLinks.x ||
        vendorInfo?.twitter ||
        vendorInfo?.x,
    },
  ].filter((item) => item.value);
}

function toLink(value, key) {
  if (!value) return "#";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${key}.com/${String(value).replace(/^@/, "")}`;
}

function formatHomeLocation(location) {
  if (!location) return "Not available";

  if (location.address) return location.address;

  if (
    Number.isFinite(Number(location.lat)) &&
    Number.isFinite(Number(location.lng))
  ) {
    return `${Number(location.lat).toFixed(6)}, ${Number(location.lng).toFixed(6)}`;
  }

  return "Not available";
}

export default function ProfileSection({ vendorInfo }) {
  const galleryImages = normalizeGalleryImages(vendorInfo?.rowImages);
  const socialLinks = normalizeSocialLinks(vendorInfo);
  const businessLocations =
    vendorInfo?.locations || vendorInfo?.nearbyLocations || [];
  const businessHours =
    vendorInfo?.businessHours || vendorInfo?.hours || [];

  return (
    <div className="profile-section">
      <div className="new-dashboard-card-title">Profile</div>

      <div className="profile-subsection">
        <div className="profile-subtitle">My Gallery</div>
        {galleryImages.length > 0 ? (
          <div className="profile-gallery-grid">
            {galleryImages.map((image, index) => {
              const imageUrl =
                typeof image === "string"
                  ? image
                  : image?.url || image?.src || image?.imageUrl || "";

              if (!imageUrl) return null;

              return (
                <img
                  key={`${imageUrl}-${index}`}
                  className="profile-gallery-image"
                  src={imageUrl}
                  alt={`Gallery ${index + 1}`}
                />
              );
            })}
          </div>
        ) : (
          <div className="profile-empty-state">No gallery images available.</div>
        )}
      </div>

      <div className="profile-subsection">
        <div className="profile-subtitle">My Social Handles</div>
        {socialLinks.length > 0 ? (
          <div className="profile-social">
            {socialLinks.map((item) => (
              <a
                key={item.key}
                className="profile-social-link"
                href={toLink(item.value, item.key)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.label}
              </a>
            ))}
          </div>
        ) : (
          <div className="profile-empty-state">No social handles available.</div>
        )}
      </div>

      <div className="profile-subsection">
        <div className="profile-subtitle">Locations &amp; Hours</div>

        <div className="profile-location-block">
          <div className="profile-label">Home Location</div>
          <p className="profile-copy">
            {formatHomeLocation(vendorInfo?.location)}
          </p>
        </div>

        <div className="profile-location-block">
          <div className="profile-label">Business Locations</div>
          {Array.isArray(businessLocations) && businessLocations.length > 0 ? (
            <div className="profile-list">
              {businessLocations.map((location, index) => (
                <div
                  key={`${typeof location === "string" ? location : location?.address || location?.name || index}-${index}`}
                  className="profile-list-item"
                >
                  {typeof location === "string"
                    ? location
                    : location?.name ||
                      location?.address ||
                      location?.locationName ||
                      "Location"}
                </div>
              ))}
            </div>
          ) : (
            <div className="profile-empty-state">No business locations available.</div>
          )}
        </div>

        <div className="profile-location-block">
          <div className="profile-label">Business Hours</div>
          {Array.isArray(businessHours) && businessHours.length > 0 ? (
            <div className="profile-hours">
              {businessHours.map((item, index) => (
                <div
                  key={`${item?._id || item?.day || index}-${index}`}
                  className="profile-hours-row"
                >
                  <span className="profile-hours-day">
                    {item?.day || `Day ${index + 1}`}
                  </span>
                  <span className="profile-hours-time">
                    {item?.hours || item?.time || "Closed"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="profile-empty-state">No business hours available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
