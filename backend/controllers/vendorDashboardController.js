const BillingSession = require("../models/BillingSession");
const mongoose = require("mongoose");

// Helper: start of day
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

exports.getDashboardSummary = async (req, res) => {
  try {
    const { vendorId } = req.query;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "vendorId required" });
    }

    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

    const today = startOfToday();
    const monthStart = startOfMonth();

    const todayBills = await BillingSession.find({
      vendorId: vendorObjectId,
      status: "COMPLETED",
      createdAt: { $gte: today },
    });

    const monthBills = await BillingSession.find({
      vendorId: vendorObjectId,
      status: "COMPLETED",
      createdAt: { $gte: monthStart },
    });

    const todayRevenue = todayBills.reduce((sum, b) => sum + b.totalAmount, 0);
    const todayOrders = todayBills.length;
    const avgBillValue = todayOrders ? todayRevenue / todayOrders : 0;

    const monthRevenue = monthBills.reduce((sum, b) => sum + b.totalAmount, 0);

    res.json({
      success: true,
      data: {
        todayRevenue,
        todayOrders,
        avgBillValue: Math.round(avgBillValue),
        monthRevenue,
      },
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ success: false, message: "Dashboard failed" });
  }
};
