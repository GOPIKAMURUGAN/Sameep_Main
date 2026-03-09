const BillingSession = require("../models/BillingSession");
const Customer = require("../models/Customer");
const LoyaltyLedger = require("../models/LoyaltyLedger");
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

    const summaryAgg = await BillingSession.aggregate([
      {
        $match: {
          vendorId: vendorObjectId,
          status: "COMPLETED",
        },
      },
      {
        $facet: {
          today: [
            { $match: { createdAt: { $gte: today } } },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$totalAmount" },
                orders: { $sum: 1 },
              },
            },
          ],
          month: [
            { $match: { createdAt: { $gte: monthStart } } },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$totalAmount" },
                orders: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const todayRow = summaryAgg?.[0]?.today?.[0] || {};
    const monthRow = summaryAgg?.[0]?.month?.[0] || {};

    const todayRevenue = todayRow.revenue || 0;
    const todayOrders = todayRow.orders || 0;
    const avgBillValue = todayOrders ? todayRevenue / todayOrders : 0;

    const monthRevenue = monthRow.revenue || 0;
    const monthOrders = monthRow.orders || 0;
    const monthAvgBill = monthOrders > 0 ? Math.round(monthRevenue / monthOrders) : 0;

    const loyaltyAgg = await LoyaltyLedger.aggregate([
      {
        $match: {
          vendorId: vendorObjectId,
        },
      },
      {
        $group: {
          _id: null,
          earned: {
            $sum: {
              $cond: [{ $eq: ["$type", "EARN"] }, "$points", 0],
            },
          },
          redeemed: {
            $sum: {
              $cond: [
                { $eq: ["$type", "REDEEM"] },
                { $abs: "$points" },
                0,
              ],
            },
          },
        },
      },
    ]);

    const loyaltyRow = loyaltyAgg?.[0] || {};

    res.json({
      success: true,
      data: {
        todayRevenue,
        todayOrders,
        avgBillValue: Math.round(avgBillValue),
        monthRevenue,
        monthOrders,
        monthAvgBill,
        loyaltyEarned: loyaltyRow.earned || 0,
        loyaltyRedeemed: loyaltyRow.redeemed || 0,
      },
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ success: false, message: "Dashboard failed" });
  }
};

exports.getFinancialYearMonthly = async (req, res) => {
  try {
    const { vendorId } = req.query;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "vendorId required" });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based

    // FY start year
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;

    const fyStart = new Date(fyStartYear, 3, 1); // Apr 1
    const fyEnd = new Date(fyStartYear + 1, 2, 31, 23, 59, 59); // Mar 31

    const aggregationResult = await BillingSession.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(vendorId),
          status: "COMPLETED",
          createdAt: { $gte: fyStart, $lte: fyEnd },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id": 1 } },
    ]);

    // ================= FINANCIAL YEAR MONTH ORDER (APR → MAR) =================
    const FINANCIAL_MONTHS = [
      "Apr", "May", "Jun", "Jul", "Aug", "Sep",
      "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
    ];
    const MONTH_LABELS = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    // Convert aggregation into lookup
    const monthMap = {};
    aggregationResult.forEach((m) => {
      const label = MONTH_LABELS[m._id.month - 1];
      monthMap[label] = {
        revenue: m.revenue || 0,
        orders: m.orders || 0,
        avgBill: m.orders ? Math.round(m.revenue / m.orders) : 0,
      };
    });

    // Build financial year ordered array
    const financialYearData = FINANCIAL_MONTHS.map((label) => ({
      month: label,
      revenue: monthMap[label]?.revenue || 0,
      orders: monthMap[label]?.orders || 0,
      avgBill: monthMap[label]?.avgBill || 0,
    }));

    res.json({ success: true, data: financialYearData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

exports.getTopServices = async (req, res) => {
  try {
    const { vendorId } = req.query;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "vendorId required" });
    }

    const data = await BillingSession.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(vendorId),
          status: "COMPLETED",
        },
      },
      { $unwind: "$cartItems" },
      {
        $group: {
          _id: "$cartItems.name",
          totalQty: { $sum: "$cartItems.qty" },
          revenue: { $sum: "$cartItems.total" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]);

    res.json({ success: true, data });
  } catch (err) {
    console.error("Top services error", err);
    res.status(500).json({ success: false, message: "Failed to load top services" });
  }
};

exports.getDailyTrend = async (req, res) => {
  try {
    const { vendorId } = req.query;
    if (!vendorId) {
      return res.status(400).json({ success: false, message: "vendorId required" });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const trend = await BillingSession.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(vendorId),
          status: "COMPLETED",
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: { day: { $dayOfMonth: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.day": 1 } },
    ]);

    res.json({ success: true, data: trend });
  } catch (err) {
    console.error("Daily trend error", err);
    res.status(500).json({ success: false });
  }
};

exports.getBillsDrilldown = async (req, res) => {
  try {
    const { vendorId, from, to, limit = 100 } = req.query;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "vendorId required" });
    }

    const query = { vendorId: new mongoose.Types.ObjectId(vendorId) };

    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const bills = await BillingSession.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    const formatted = await Promise.all(
      bills.map(async (bill) => {
        let phone = "Walk-in";

        if (bill.customerId) {
          const customer = await Customer.findById(bill.customerId).lean();
          if (customer?.phone) {
            phone = maskPhone(customer.phone);
          } else if (customer?.fullNumber) {
            phone = maskPhone(customer.fullNumber);
          }
        }

        return {
          billId: bill._id,
          total: bill.totalAmount,
          earned: bill.pointsEarned || 0,
          redeemed: bill.pointsRedeemed || 0,
          items: bill.items || bill.cartItems || [],
          createdAt: bill.createdAt,
          phone,
        };
      })
    );

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error("getBillsDrilldown error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

function maskPhone(phone) {
  if (!phone) return "";
  return phone.slice(0, 5) + "****";
}

exports.getStylistPerformance = async (req, res) => {
  try {
    const { vendorId, range } = req.query;

    if (!vendorId) {
      return res.status(400).json({ message: "vendorId required" });
    }

    const now = new Date();
    let startDate;

    if (range === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === "mtd") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === "ytd") {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(0);
    }

    const result = await BillingSession.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(vendorId),
          status: "COMPLETED",
          createdAt: { $gte: startDate },
        },
      },
      { $unwind: "$cartItems" },
      {
        $match: {
          "cartItems.resourceId": { $ne: null },
        },
      },
      {
        $group: {
          _id: "$cartItems.resourceId",
          stylist: { $first: "$cartItems.resourceName" },
          revenue: { $sum: "$cartItems.total" },
          services: { $sum: "$cartItems.qty" },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    res.json(result);
  } catch (err) {
    console.error("Stylist analytics error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
