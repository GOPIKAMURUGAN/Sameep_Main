import { buildVendorSeoSectionModel } from "../utils/vendorSeo";
import "./SeoContentSection.css";

function formatList(values) {
  if (!Array.isArray(values) || values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

export default function ServerSeoContentSection({ vendorInfo }) {
  const model = buildVendorSeoSectionModel(vendorInfo);
  const isEcommerceTemplate =
    String(vendorInfo?.selectedTemplateKey || "").trim().toLowerCase() === "ecommerce";
  const contentLabel = isEcommerceTemplate ? "Popular Products" : "Popular Services";

  if (!model.businessName) return null;

  const hasServices = model.serviceNames.length > 0;
  const hasAreas = model.audienceAreas.length > 0;

  if (!hasServices && !hasAreas && !model.intro) return null;

  const quickLinks = [
    { href: "#seo-discover-overview", label: "Overview" },
    hasServices ? { href: "#seo-discover-services", label: contentLabel } : null,
    hasAreas ? { href: "#seo-discover-areas", label: "Areas" } : null,
    { href: "#contact", label: "Contact" },
  ].filter(Boolean);

  return (
    <section className="seo-content-section" aria-label="Business and service area details">
      <div className="seo-content-shell">
        <p className="seo-content-kicker">Discover More</p>
        <h1 id="seo-discover-overview" className="seo-content-title">
          {model.heading}
        </h1>
        {model.intro ? <p className="seo-content-intro">{model.intro}.</p> : null}

        <nav className="seo-content-links" aria-label="Business content quick links">
          {quickLinks.map((link) => (
            <a key={link.href} href={link.href} className="seo-content-link-pill">
              {link.label}
            </a>
          ))}
        </nav>

        {hasServices || hasAreas ? (
          <div className="seo-content-grid">
            {hasServices ? (
              <div className="seo-content-card">
                <h2 id="seo-discover-services">{contentLabel}</h2>
                <p>
                  {model.businessName}
                  {model.city ? ` in ${model.city}` : ""}
                  {hasServices ? ` offers ${formatList(model.serviceNames.slice(0, 8))}.` : "."}
                </p>
                <ul>
                  {model.serviceNames.slice(0, 8).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {hasAreas ? (
              <div className="seo-content-card">
                <h2 id="seo-discover-areas">Areas We Serve</h2>
                <p>
                  {model.businessName} serves customers in {formatList(model.audienceAreas.slice(0, 8))}.
                </p>
                <ul>
                  {model.audienceAreas.slice(0, 8).map((area) => (
                    <li key={area}>{area}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
