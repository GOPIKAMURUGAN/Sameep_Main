const BillingSession = require("../models/BillingSession");
const Customer = require("../models/Customer");
const mongoose = require("mongoose");

exports.getVendorBills = async (req, res) => {
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
    console.error("getVendorBills error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getBillDetails = async (req, res) => {
  try {
    const { billId } = req.params;

    const bill = await BillingSession.findById(billId).lean();
    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }

    let customer = null;
    if (bill.customerId) {
      const doc = await Customer.findById(bill.customerId).lean();
      customer = doc
        ? {
            phone: doc.phone || doc.fullNumber || "",
            name: doc.name || "",
          }
        : null;
    }

    res.json({
      success: true,
      data: {
        ...bill,
        customer,
      },
    });
  } catch (err) {
    console.error("getBillDetails error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

function maskPhone(phone) {
  if (!phone) return "";
  return phone.slice(0, 5) + "****";
}
