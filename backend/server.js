require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const qs = require("querystring");
const axios = require("axios");

const connectDB = require("./config/db");

// 🔹 IMPORTANT: load model ONCE before routes
require("./models/VendorPriceNode");

// --------------------
// Route imports
// --------------------
const categoryRoutes = require("./routes/categoryRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const masterRoutes = require("./routes/masterRoutes");
const comboRoutes = require("./routes/comboRoutes");
const dummyComboRoutes = require("./routes/dummyComboRoutes");
const vendorComboPricingRoutes = require("./routes/vendorComboPricingRoutes");
const customerRoutes = require("./routes/customerRoutes");
const vendorPricingRoutes = require("./routes/vendorPricing");
const modelRoutes = require("./routes/modelRoutes");
const dummyCategoryRoutes = require("./routes/dummyCategoryRoutes");
const dummyVendorRoutes = require("./routes/dummyVendorRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const appConfigRoutes = require("./routes/appConfigRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const authRoutes = require("./routes/authRoutes");
const googlePlacesRoutes = require("./routes/googlePlacesRoutes");
const setupProgressRoutes = require("./routes/setupProgressRoutes");
const vendorFlowRoutes = require("./routes/vendorFlowRoutes");
const billingRoutes = require("./routes/billingRoutes");
const loyaltyRoutes = require("./routes/loyaltyRoutes");

const vendorPriceNodeRoutes = require(
  path.resolve(__dirname, "routes", "vendorPriceNodeRoutes")
);

// --------------------
// App init
// --------------------
const app = express();

// --------------------
// ✅ SINGLE, CORRECT CORS CONFIG
// --------------------
const allowedHeaders = [
  "Content-Type",
  "Authorization",
  "Accept",
  "Origin",
  "X-Requested-With",
  "x-root-category-id",
  "x-vendor-id",
  "x-actor-role",
];

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:4000",

];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // IMPORTANT: do NOT throw error
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders,
    credentials: false,
  })
);


// Trust proxy
app.set("trust proxy", 1);

// --------------------
// Connect DB
// --------------------
connectDB();

// --------------------
// Body parsing
// --------------------
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ limit: "8mb", extended: true }));

// --------------------
// Logger
// --------------------
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(
      `${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`
    );
  });
  next();
});

// --------------------
// Static uploads
// --------------------
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use("/uploads", express.static(uploadsDir));

// --------------------
// Health
// --------------------
app.get("/", (req, res) => res.json({ ok: true }));
app.get("/api/health", (req, res) =>
  res.status(200).json({ status: "ok" })
);

// --------------------
// API ROUTES
// --------------------
app.use("/api/categories", categoryRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/masters", masterRoutes);
app.use("/api/combos", comboRoutes);
app.use("/api/dummy-combos", dummyComboRoutes);
app.use("/api/vendor-combo-pricing", vendorComboPricingRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/vendorPricing", vendorPricingRoutes);
app.use("/api/models", modelRoutes);
app.use("/api/dummy-categories", dummyCategoryRoutes);
app.use("/api/dummy-vendors", dummyVendorRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api", uploadRoutes);
app.use("/api/app-config", appConfigRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/google/places", googlePlacesRoutes);
app.use("/api/setup-progress", setupProgressRoutes);
app.use("/api/vendor-flow", vendorFlowRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/loyalty", loyaltyRoutes);

// Vendor price nodes
app.use("/api/vendor-price-nodes", vendorPriceNodeRoutes);

// Auth (last)
app.use("/", authRoutes);

// --------------------
// Debug DB
// --------------------
app.get("/api/_debug/db", (req, res) => {
  const conn = mongoose.connection;
  res.json({
    readyState: conn.readyState,
    dbName: conn.db?.databaseName,
    host: conn.host,
  });
});

// --------------------
// Error handler
// --------------------
app.use((err, req, res, next) => {
  console.error(err.stack || err.message);
  res.status(500).json({
    message: "Internal Server Error",
    error: err.message,
  });
});

// --------------------
// Start server
// --------------------
const PORT = process.env.PORT || 5001;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
