import { useEffect, useState } from "react";
import {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
} from "../../services/planService";
import PlanForm from "./PlanForm";

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await getPlans();
      setPlans(res?.data || []);
    } catch (err) {
      console.error("Failed to load plans", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleSave = async (payload) => {
    try {
      if (payload?._id) {
        await updatePlan(payload._id, payload);
      } else {
        await createPlan(payload);
      }
      setShowForm(false);
      setEditing(null);
      loadPlans();
    } catch (err) {
      console.error("Save plan failed", err);
    }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Delete plan "${plan.name}"?`)) return;
    try {
      await deletePlan(plan._id);
      loadPlans();
    } catch (err) {
      console.error("Delete plan failed", err);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Subscription Plans</h2>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          style={{
            padding: "10px 16px",
            borderRadius: 6,
            border: "none",
            background: "#00AEEF",
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          + Create Plan
        </button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ paddingBottom: 8 }}>Name</th>
                <th style={{ paddingBottom: 8 }}>Price</th>
                <th style={{ paddingBottom: 8 }}>Billing Cycle</th>
                <th style={{ paddingBottom: 8 }}>Active</th>
                <th style={{ paddingBottom: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan._id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "10px 0" }}>{plan.name}</td>
                  <td style={{ padding: "10px 0" }}>₹{Number(plan.price || 0).toLocaleString("en-IN")}</td>
                  <td style={{ padding: "10px 0" }}>{plan.billingCycle}</td>
                  <td style={{ padding: "10px 0" }}>{plan.active ? "Yes" : "No"}</td>
                  <td style={{ padding: "10px 0" }}>
                    <button
                      onClick={() => {
                        setEditing(plan);
                        setShowForm(true);
                      }}
                      style={{ marginRight: 10, cursor: "pointer" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(plan)}
                      style={{ color: "red", cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!plans.length && (
                <tr>
                  <td colSpan={5} style={{ paddingTop: 12, color: "#888" }}>
                    No plans found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <PlanForm
          initialData={editing}
          onSubmit={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
