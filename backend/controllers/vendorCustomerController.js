const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const BillingSession = require("../models/BillingSession");
const LoyaltyLedger = require("../models/LoyaltyLedger");

exports.getVendorCustomer = async (req, res) => {
  try {
    const { vendorId, phone, range = "all" } = req.query;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "vendorId required" });
    }
    if (!phone) {
      return res.status(400).json({ success: false, message: "phone required" });
    }

    const customer = await Customer.findOne({
      $or: [{ phone }, { fullNumber: phone }],
    }).lean();

    if (!customer) {
      return res.json({ success: true, data: null });
    }

    let rangeStart = null;
    if (range === "3m") {
      rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 90);
    } else if (range === "6m") {
      rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 180);
    } else if (range === "1y") {
      rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 365);
    }

    const billQuery = {
      vendorId: new mongoose.Types.ObjectId(vendorId),
      customerId: customer._id,
      status: "COMPLETED",
    };
    if (rangeStart) {
      billQuery.createdAt = { $gte: rangeStart };
    }

    const billsRaw = await BillingSession.find(billQuery)
      .sort({ createdAt: -1 })
      .lean();

    const bills = billsRaw.map((bill) => {
      const items = bill.items || bill.cartItems || [];
      const earned = bill.pointsEarned || 0;
      const redeemed = bill.pointsRedeemed || 0;

      return {
        billId: bill._id,
        total: bill.total || bill.totalAmount || 0,
        earned,
        redeemed,
        createdAt: bill.createdAt,
        phone: bill.phone || bill.customerPhone || customer.phone || customer.fullNumber || "Walk-in",
        items: items.map((i) => ({
          name: i.name,
          nodePath: i.nodePath || [],
        })),
      };
    });

    const totalSpend = billsRaw.reduce(
      (sum, b) => sum + (b.totalAmount || 0),
      0
    );
    const totalVisits = billsRaw.length;
    const avgBill = totalVisits ? Math.round(totalSpend / totalVisits) : 0;
    const lastVisit = billsRaw[0]?.createdAt || null;

    const loyaltyAgg = await LoyaltyLedger.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(vendorId),
          customerId: customer._id,
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
          balance: {
            $sum: {
              $cond: [{ $eq: ["$type", "EARN"] }, "$remainingPoints", 0],
            },
          },
        },
      },
    ]);

    const loyaltyRow = loyaltyAgg?.[0] || {};

    const now = new Date();
    const expiringPoints = await LoyaltyLedger.aggregate([
      {
        $match: {
          vendorId: new mongoose.Types.ObjectId(vendorId),
          customerId: customer._id,
          type: "EARN",
          remainingPoints: { $gt: 0 },
          expiryDate: { $gt: now },
        },
      },
      {
        $project: {
          _id: 0,
          expiryDate: 1,
          remainingPoints: 1,
          daysToExpire: {
            $ceil: {
              $divide: [{ $subtract: ["$expiryDate", now] }, 86400000],
            },
          },
        },
      },
      { $sort: { expiryDate: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        customer: {
          phone: customer.phone || customer.fullNumber || phone,
          totalVisits,
          totalSpend,
          avgBill,
          lastVisit,
        },
        loyalty: {
          earned: loyaltyRow.earned || 0,
          redeemed: loyaltyRow.redeemed || 0,
          balance: loyaltyRow.balance || 0,
          expiringPoints,
        },
        bills,
      },
    });
  } catch (err) {
    console.error("getVendorCustomer error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
