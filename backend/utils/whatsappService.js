const axios = require("axios");
const { getWhatsAppBillingConfig } = require("./whatsappBillingConfig");
const { getWhatsAppEnquiryConfig } = require("./whatsappEnquiryConfig");

async function sendTemplateWhatsapp({
  mobile,
  templateName,
  language,
  bodyParameters = [],
  buttonComponent = null,
}) {
  const cleanMobile = String(mobile || "").replace("+", "").trim();

  if (!cleanMobile) {
    throw new Error("Mobile number is required");
  }

  const components = [];

  if (Array.isArray(bodyParameters) && bodyParameters.length > 0) {
    components.push({
      type: "body",
      parameters: bodyParameters,
    });
  }

  if (buttonComponent) {
    components.push(buttonComponent);
  }

  const payload = {
    integrated_number: process.env.MSG91_WHATSAPP_NUMBER,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: templateName,
        language: {
          code: language,
        },
        ...(components.length > 0 ? { components } : {}),
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
}

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

    const bodyVariables = Array.isArray(config.bodyVariables) ? config.bodyVariables : [];
    const bodyParameters = bodyVariables.map((variableName) => ({
      type: "text",
      text: String(variableMap[variableName] ?? ""),
    }));

    let buttonComponent = null;

    if (config.buttonUrlVariable && (billPath || billUrl)) {
      buttonComponent = {
        type: "button",
        sub_type: "url",
        index: String(config.buttonIndex ?? 0),
        parameters: [
          {
            type: "text",
            text: String(variableMap[config.buttonUrlVariable] ?? ""),
          },
        ],
      };
    }

    return await sendTemplateWhatsapp({
      mobile,
      templateName: config.templateName,
      language: config.language,
      bodyParameters,
      buttonComponent,
    });
  } catch (err) {
    console.error("sendBillWhatsapp error:", err?.response?.data || err.message);
    throw err;
  }
}

async function sendVendorEnquiryWhatsapp(data) {
  try {
    const { mobile } = data || {};
    const config = await getWhatsAppEnquiryConfig();

    if (!config.enabled) {
      return { skipped: true, reason: "disabled" };
    }

    return await sendTemplateWhatsapp({
      mobile,
      templateName: config.templateName,
      language: config.language,
      bodyParameters: [],
    });
  } catch (err) {
    console.error("sendVendorEnquiryWhatsapp error:", err?.response?.data || err.message);
    throw err;
  }
}

module.exports = { sendBillWhatsapp, sendVendorEnquiryWhatsapp };
