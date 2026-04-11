const axios = require("axios");
const { getWhatsAppBillingConfig } = require("./whatsappBillingConfig");

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
      billUrl,
      billPath,
    } = data;
    const config = await getWhatsAppBillingConfig();
    const variableMap = {
      customerName,
      vendorName,
      billAmount,
      earned,
      redeemed,
      finalPaid,
      balance,
      billUrl,
      billPath,
    };

    const cleanMobile = mobile.replace("+", "");
    const bodyVariables = Array.isArray(config.bodyVariables) ? config.bodyVariables : [];
    const bodyParameters = bodyVariables.map((variableName) => ({
      type: "text",
      text: String(variableMap[variableName] ?? ""),
    }));

    const components = [
      {
        type: "body",
        parameters: bodyParameters,
      },
    ];

    if (config.buttonUrlVariable && (billPath || billUrl)) {
      components.push({
        type: "button",
        sub_type: "url",
        index: String(config.buttonIndex ?? 0),
        parameters: [
          {
            type: "text",
            text: String(variableMap[config.buttonUrlVariable] ?? ""),
          },
        ],
      });
    }

    const payload = {
      integrated_number: process.env.MSG91_WHATSAPP_NUMBER,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: config.templateName,
          language: {
            code: config.language,
          },
          components,
        },
        to: cleanMobile,
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
