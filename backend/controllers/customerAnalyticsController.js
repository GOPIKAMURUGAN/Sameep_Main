const BillingSession = require("../models/BillingSession");
const Customer = require("../models/Customer");
const mongoose = require("mongoose");

exports.getCustomerAnalytics = async (req, res) => {
  try {
    const { vendorId } = req.query;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "vendorId required" });
    }

    const bills = await BillingSession.find({
      vendorId: new mongoose.Types.ObjectId(vendorId),
      status: "COMPLETED",
      customerId: { $ne: null },
    }).lean();

    if (!bills.length) {
      return res.json({
        success: true,
        data: {
          totalCustomers: 0,
          repeatCustomers: 0,
          repeatRate: 0,
          newCustomers: 0,
          returningCustomers: 0,
          topSpenders: [],
          avgLTV: 0,
        },
      });
    }

    // ===============================
    // Build customer map
    // ===============================
    const customerMap = {};

    bills.forEach((bill) => {
      const id = String(bill.customerId);

      if (!customerMap[id]) {
        customerMap[id] = {
          customerId: id,
          visits: 0,
          spend: 0,
          firstVisit: bill.createdAt,
          lastVisit: bill.createdAt,
        };
      }

      const cust = customerMap[id];
      cust.visits += 1;
      cust.spend += bill.totalAmount || 0;

      if (bill.createdAt < cust.firstVisit) cust.firstVisit = bill.createdAt;
      if (bill.createdAt > cust.lastVisit) cust.lastVisit = bill.createdAt;
    });

    const customers = Object.values(customerMap);

    // ===============================
    // Repeat Customers
    // ===============================
    const repeatCustomers = customers.filter((c) => c.visits > 1).length;
    const totalCustomers = customers.length;
    const repeatRate = Math.round((repeatCustomers / totalCustomers) * 100);

    // ===============================
    // FIX: New vs Returning Logic
    // ===============================
    const THIRTY_DAYS = new Date();
    THIRTY_DAYS.setDate(THIRTY_DAYS.getDate() - 30);

    let newCustomers = 0;
    let activeCustomers = 0;

    customers.forEach((c) => {
      const firstVisit = new Date(c.firstVisit);
      const lastVisit = new Date(c.lastVisit);

      if (firstVisit >= THIRTY_DAYS) {
        newCustomers++;
      }

      if (lastVisit >= THIRTY_DAYS) {
        activeCustomers++;
      }
    });

    // Returning = active - new (removes overlap)
    const returningCustomers = Math.max(activeCustomers - newCustomers, 0);

    // ===============================
    // Retained Customers (True Retention)
    // ===============================
    let retainedCustomers = 0;

    customers.forEach((c) => {
      const firstVisit = new Date(c.firstVisit);
      const lastVisit = new Date(c.lastVisit);

      if (firstVisit < THIRTY_DAYS && lastVisit >= THIRTY_DAYS) {
        retainedCustomers++;
      }
    });

    // ===============================
    // Top Spenders
    // ===============================
    const topSpendersRaw = customers
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    const customerIds = topSpendersRaw.map((c) => c.customerId);
    const customerDocs = await Customer.find({ _id: { $in: customerIds } })
      .select("fullNumber phone mobile")
      .lean();

    const customerLookup = {};
    customerDocs.forEach((c) => {
      customerLookup[String(c._id)] = c.fullNumber || c.phone || c.mobile || "";
    });

    const topSpenders = topSpendersRaw.map((c) => ({
      customerId: c.customerId,
      phone: customerLookup[c.customerId] || "",
      totalSpend: c.spend,
      visits: c.visits,
    }));

    // ===============================
    // Customer Lifetime Value (LTV)
    // ===============================
    const totalRevenue = customers.reduce((sum, c) => sum + c.spend, 0);
    const avgLTV = Math.round(totalRevenue / totalCustomers);

    res.json({
      success: true,
      data: {
        totalCustomers,
        repeatCustomers,
        repeatRate,
        newCustomers,
        returningCustomers,
        retainedCustomers,
        topSpenders,
        avgLTV,
      },
    });
  } catch (err) {
    console.error("Customer analytics error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
