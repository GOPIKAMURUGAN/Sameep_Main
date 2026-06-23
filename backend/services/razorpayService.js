const Razorpay = require("razorpay");
const crypto = require("crypto");

function buildRazorpayClient(config) {
  const keyId = String(config?.razorpay?.keyId || "").trim();
  const keySecret = String(config?.razorpay?.keySecret || "").trim();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are incomplete");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

function verifyRazorpaySignature({ orderId, paymentId, signature, keySecret }) {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", String(keySecret || ""))
    .update(body)
    .digest("hex");

  return expectedSignature === String(signature || "");
}

module.exports = {
  buildRazorpayClient,
  verifyRazorpaySignature,
};
