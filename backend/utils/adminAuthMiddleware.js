const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

function getAdminToken(req) {
  const auth = String(req.headers["authorization"] || "");
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

function requireAdminAuth(req, res, next) {
  if (!JWT_SECRET) {
    return res.status(500).json({ message: "JWT_SECRET not configured" });
  }

  const token = getAdminToken(req);
  if (!token) {
    return res.status(401).json({ message: "Missing admin token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.adminId) {
      return res.status(401).json({ message: "Invalid admin token" });
    }

    req.admin = {
      id: decoded.adminId,
      email: decoded.email || null,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid admin token" });
  }
}

module.exports = {
  requireAdminAuth,
};
