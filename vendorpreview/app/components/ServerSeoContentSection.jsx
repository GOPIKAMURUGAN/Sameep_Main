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
  const visibleServices = model.serviceNames.slice(0, 12);
  const visibleAreas = model.audienceAreas.slice(0, 3);

  if (!hasServices && !hasAreas && !model.intro) return null;

  return (
    <section className="seo-content-section" aria-label="Business and service area details">
      <div className="seo-content-shell">
        <p className="seo-content-kicker">Discover More</p>
        <h1 id="seo-discover-overview" className="seo-content-title">
          {model.heading}
        </h1>
        {model.intro ? <p className="seo-content-intro">{model.intro}.</p> : null}

        {hasServices || hasAreas ? (
          <div className="seo-content-grid">
            {hasServices ? (
              <div className="seo-content-card">
                <h2 id="seo-discover-services">{contentLabel}</h2>
                <p>
                  {model.businessName}
                  {hasServices
                    ? ` offers the following popular ${isEcommerceTemplate ? "products" : "services"}${
                        visibleAreas.length > 0 ? ` in ${formatList(visibleAreas)}` : ""
                      }.`
                    : "."}
                </p>
                <ul>
                  {visibleServices.map((item) => (
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
