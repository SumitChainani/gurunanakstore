"use strict";

function isWhatsAppAlertsConfigured(env = process.env) {
  return [env.WHATSAPP_ACCESS_TOKEN, env.WHATSAPP_PHONE_NUMBER_ID, env.WHATSAPP_OWNER_NUMBER]
    .every((value) => typeof value === "string" && value.trim().length > 0);
}

function getWhatsAppConfig(env = process.env) {
  const accessToken = String(env.WHATSAPP_ACCESS_TOKEN || "").trim();
  const phoneNumberId = String(env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
  const ownerNumber = String(env.WHATSAPP_OWNER_NUMBER || "").replace(/[^\d]/g, "");
  const apiVersion = String(env.WHATSAPP_GRAPH_API_VERSION || "v26.0").trim();
  const templateName = String(env.WHATSAPP_TEMPLATE_NAME || "new_order_details").trim();
  const language = String(env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US").trim();

  if (!accessToken || !phoneNumberId || !ownerNumber) {
    throw new Error("WhatsApp alert configuration is incomplete.");
  }
  if (!/^\d+$/.test(phoneNumberId) || !/^\d{8,15}$/.test(ownerNumber)) {
    throw new Error("WhatsApp alert configuration has an invalid phone number.");
  }
  if (!/^v\d+\.0$/.test(apiVersion) || !/^[a-z0-9_]+$/.test(templateName) || !/^[a-z]{2}_[A-Z]{2}$/.test(language)) {
    throw new Error("WhatsApp alert configuration has an invalid API version or template setting.");
  }
  return { accessToken, phoneNumberId, ownerNumber, apiVersion, templateName, language };
}

function formatOrderTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unavailable";
  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Kolkata"
  }).format(date);
  return `${formatted} IST`;
}

function getOrderTemplateParameters(order = {}) {
  const amount = Number(order.amountRupees);
  return [
    String(order.orderId || "Unavailable"),
    Number.isFinite(amount) ? `₹${amount.toFixed(2)}` : "Unavailable",
    formatOrderTime(order.createdAt)
  ].map((text) => ({ type: "text", text }));
}

async function sendNewOrderWhatsAppAlert(order, options = {}) {
  const env = options.env || process.env;
  if (!isWhatsAppAlertsConfigured(env)) return { sent: false, skipped: true };

  const config = getWhatsAppConfig(env);
  const fetchImpl = options.fetchImpl || fetch;
  let response;
  try {
    response = await fetchImpl(
      `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: config.ownerNumber,
          type: "template",
          template: {
            name: config.templateName,
            language: { code: config.language },
            components: [{
              type: "body",
              parameters: getOrderTemplateParameters(order)
            }]
          }
        }),
        signal: AbortSignal.timeout(10000)
      }
    );
  } catch {
    // Do not propagate arbitrary transport/provider messages into logs; they
    // can contain request details. The caller logs this fixed safe message.
    throw new Error("WhatsApp Cloud API request failed or timed out.");
  }

  if (!response.ok) {
    throw new Error(`WhatsApp Cloud API returned HTTP ${response.status}.`);
  }
  const result = await response.json().catch(() => ({}));
  return { sent: true, messageId: result.messages?.[0]?.id || "" };
}

module.exports = {
  isWhatsAppAlertsConfigured,
  getWhatsAppConfig,
  formatOrderTime,
  getOrderTemplateParameters,
  sendNewOrderWhatsAppAlert
};
