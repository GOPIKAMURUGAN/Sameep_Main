import { useEffect, useState } from "react";

const featureDefaults = {
  website: true,
  digitalMenu: true,
  basicBilling: true,
  customerBilling: false,
  whatsappBilling: false,
  whatsappBundle: 0,
  advancedBilling: false,
  humanResourceManagement: false,
  loyaltyModule: false,
  otpVerification: false,
  otpBundle: 0,
  analyticsCustomer: false,
  analyticsResource: false,
  analyticsReports: false,
};

export default function PlanForm({ initialData, onSubmit, onClose }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [billingCycle, setBillingCycle] = useState("yearly");
  const [active, setActive] = useState(true);
  const [features, setFeatures] = useState(featureDefaults);

  useEffect(() => {
    if (!initialData) {
      setName("");
      setPrice(0);
      setBillingCycle("yearly");
      setActive(true);
      setFeatures(featureDefaults);
      return;
    }

    setName(initialData.name || "");
    setPrice(Number(initialData.price || 0));
    setBillingCycle(initialData.billingCycle || "yearly");
    setActive(initialData.active !== false);
    setFeatures({
      ...featureDefaults,
      ...(initialData.features || {}),
    });
  }, [initialData]);

  const updateFeature = (key, value) => {
    setFeatures((prev) => ({ ...prev, [key]: value }));
  };

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      ...initialData,
      name,
      price: Number(price || 0),
      billingCycle,
      active,
      features: {
        ...features,
        whatsappBundle: Number(features.whatsappBundle || 0),
        otpBundle: Number(features.otpBundle || 0),
      },
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 12,
          width: 560,
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        }}
      >
        <h3 style={{ marginTop: 0, color: "#00AEEF" }}>
          {initialData ? "Edit Plan" : "Create Plan"}
        </h3>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ fontWeight: "bold" }}>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Plan name"
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc" }}
          />

          <label style={{ fontWeight: "bold" }}>Price</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc" }}
          />

          <label style={{ fontWeight: "bold" }}>Billing Cycle</label>
          <select
            value={billingCycle}
            onChange={(e) => setBillingCycle(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc" }}
          >
            <option value="yearly">Yearly</option>
            <option value="monthly">Monthly</option>
            <option value="daily">Daily</option>
          </select>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Active
          </label>

          <div style={{ marginTop: 10, fontWeight: "bold" }}>Features</div>
          {[
            ["website", "Website"],
            ["digitalMenu", "Digital Menu"],
            ["basicBilling", "Basic Billing"],
            ["customerBilling", "Customer Billing"],
            ["whatsappBilling", "WhatsApp Billing"],
            ["advancedBilling", "Advanced Billing"],
            ["humanResourceManagement", "Human Resource Management"],
            ["loyaltyModule", "Loyalty Module"],
            ["otpVerification", "OTP Verification"],
            ["analyticsCustomer", "Customer Analytics"],
            ["analyticsResource", "Resource Analytics"],
            ["analyticsReports", "Analytics Reports"],
          ].map(([key, label]) => (
            <label key={key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={Boolean(features[key])}
                onChange={(e) => updateFeature(key, e.target.checked)}
              />
              {label}
            </label>
          ))}

          <label style={{ fontWeight: "bold", marginTop: 10 }}>WhatsApp Bundle</label>
          <input
            type="number"
            value={features.whatsappBundle}
            onChange={(e) => updateFeature("whatsappBundle", e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc" }}
          />

          <label style={{ fontWeight: "bold" }}>OTP Bundle</label>
          <input
            type="number"
            value={features.otpBundle}
            onChange={(e) => updateFeature("otpBundle", e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc" }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                background: "#00AEEF",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
