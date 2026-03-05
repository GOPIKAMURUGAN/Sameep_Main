const axios = require("axios");

async function sendBillWhatsapp(data) {
  try {
    const {
      mobile,
      customerName,
      vendorName,
      billAmount,
      earned,
      redeemed,
      finalPaid,
      balance,
    } = data;

    const payload = {
      integrated_number: "15558138529",
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: "bill_confirmation",
          language: {
            code: "En_GB",
          },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: String(customerName ?? "") },
                { type: "text", text: String(vendorName ?? "") },
                { type: "text", text: String(billAmount ?? 0) },
                { type: "text", text: String(earned ?? 0) },
                { type: "text", text: String(redeemed ?? 0) },
                { type: "text", text: String(finalPaid ?? 0) },
                { type: "text", text: String(balance ?? 0) },
              ],
            },
          ],
        },
        to: mobile,
      },
    };

    const response = await axios.post(
      "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/",
      payload,
      {
        headers: {
          authkey: process.env.MSG91_AUTHKEY,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (err) {
    console.error("sendBillWhatsapp error:", err?.response?.data || err.message);
    throw err;
  }
}

module.exports = { sendBillWhatsapp };
