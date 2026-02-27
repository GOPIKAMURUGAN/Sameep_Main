"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API_BASE_URL } from "../../config";

export default function VendorDashboardPage() {
  const searchParams = useSearchParams();
  const vendorId = searchParams.get("vendorId");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);

  const currencyFmt = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }),
    []
  );

  const numberFmt = useMemo(
    () => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }),
    []
  );

  useEffect(() => {
    if (!vendorId) return;

    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(
          `${API_BASE_URL}/api/vendor/dashboard/summary?vendorId=${encodeURIComponent(
            vendorId
          )}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          throw new Error("Failed to load dashboard");
        }

        const data = await res.json();
        setSummary(data?.data || data || null);
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [vendorId]);

  if (!vendorId) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0b0b0d",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        Vendor ID missing. Please open this page from the vendor dashboard link.
      </div>
    );
  }

  const todayRevenue = summary?.todayRevenue ?? summary?.revenueToday ?? 0;
  const todayOrders = summary?.todayOrders ?? summary?.ordersToday ?? 0;
  const avgBillValue = summary?.avgBillValue ?? summary?.averageBillValue ?? 0;
  const thisMonthRevenue =
    summary?.thisMonthRevenue ?? summary?.monthRevenue ?? summary?.monthlyRevenue ?? 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0d",
        color: "#fff",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h1 style={{ color: "#e6c37a", marginBottom: 8 }}>
          Vendor Dashboard
        </h1>
        <p style={{ color: "#bbb", marginBottom: 28 }}>
          Live snapshot of today&apos;s performance
        </p>

        {loading && (
          <div style={{ color: "#aaa", marginBottom: 16 }}>Loading...</div>
        )}
        {error && (
          <div style={{ color: "#fca5a5", marginBottom: 16 }}>{error}</div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #333",
              borderRadius: 14,
              padding: 20,
            }}
          >
            <div style={{ color: "#9aa0a6", fontSize: 12 }}>Today Revenue</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#e6c37a",
                marginTop: 8,
              }}
            >
              {currencyFmt.format(Number(todayRevenue) || 0)}
            </div>
          </div>

          <div
            style={{
              background: "#111",
              border: "1px solid #333",
              borderRadius: 14,
              padding: 20,
            }}
          >
            <div style={{ color: "#9aa0a6", fontSize: 12 }}>Today Orders</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#e6c37a",
                marginTop: 8,
              }}
            >
              {numberFmt.format(Number(todayOrders) || 0)}
            </div>
          </div>

          <div
            style={{
              background: "#111",
              border: "1px solid #333",
              borderRadius: 14,
              padding: 20,
            }}
          >
            <div style={{ color: "#9aa0a6", fontSize: 12 }}>
              Avg Bill Value
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#e6c37a",
                marginTop: 8,
              }}
            >
              {currencyFmt.format(Number(avgBillValue) || 0)}
            </div>
          </div>

          <div
            style={{
              background: "#111",
              border: "1px solid #333",
              borderRadius: 14,
              padding: 20,
            }}
          >
            <div style={{ color: "#9aa0a6", fontSize: 12 }}>
              This Month Revenue
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#e6c37a",
                marginTop: 8,
              }}
            >
              {currencyFmt.format(Number(thisMonthRevenue) || 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
