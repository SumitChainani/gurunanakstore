const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isWhatsAppAlertsConfigured,
  getWhatsAppConfig,
  formatOrderTime,
  getOrderTemplateParameters,
  sendNewOrderWhatsAppAlert
} = require("./whatsapp-notifications");

const configuredEnv = {
  WHATSAPP_ACCESS_TOKEN: "test-token",
  WHATSAPP_PHONE_NUMBER_ID: "123456789012345",
  WHATSAPP_OWNER_NUMBER: "+1 (415) 555-0132",
  WHATSAPP_GRAPH_API_VERSION: "v26.0",
  WHATSAPP_TEMPLATE_NAME: "owner_order_alert",
  WHATSAPP_TEMPLATE_LANGUAGE: "en_GB"
};

test("WhatsApp alerts are safely skipped until all credentials are configured", async () => {
  assert.equal(isWhatsAppAlertsConfigured({}), false);
  assert.equal(isWhatsAppAlertsConfigured({ ...configuredEnv, WHATSAPP_OWNER_NUMBER: "   " }), false);
  assert.deepEqual(await sendNewOrderWhatsAppAlert(undefined, { env: {} }), { sent: false, skipped: true });
});

test("WhatsApp order template sends only order ID, amount, and India-local time", async () => {
  let requestUrl;
  let requestOptions;
  const order = {
    orderId: "order-id-example",
    amountRupees: 479,
    createdAt: "2026-10-16T10:15:00.000Z",
    customer: { name: "Do not send", phone: "919999999999", address: "Private address" },
    paymentReference: "PRIVATE-REFERENCE"
  };
  const result = await sendNewOrderWhatsAppAlert(order, {
    env: configuredEnv,
    fetchImpl: async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return { ok: true, json: async () => ({ messages: [{ id: "wamid.test" }] }) };
    }
  });

  assert.equal(requestUrl, "https://graph.facebook.com/v26.0/123456789012345/messages");
  assert.equal(requestOptions.method, "POST");
  assert.equal(requestOptions.headers.Authorization, "Bearer test-token");
  const payload = JSON.parse(requestOptions.body);
  assert.equal(payload.to, "14155550132");
  assert.equal(payload.template.name, "owner_order_alert");
  assert.deepEqual(payload.template.language, { code: "en_GB" });
  assert.deepEqual(payload.template.components, [{
    type: "body",
    parameters: [
      { type: "text", text: "order-id-example" },
      { type: "text", text: "₹479.00" },
      { type: "text", text: "16 Oct 2026, 15:45 IST" }
    ]
  }]);
  assert.deepEqual(Object.keys(payload).sort(), ["messaging_product", "template", "to", "type"]);
  assert.equal(JSON.stringify(payload).includes("919999999999"), false);
  assert.equal(JSON.stringify(payload).includes("Private address"), false);
  assert.equal(JSON.stringify(payload).includes("PRIVATE-REFERENCE"), false);
  assert.deepEqual(result, { sent: true, messageId: "wamid.test" });
});

test("formats saved order time in India time and handles missing optional values", () => {
  assert.equal(formatOrderTime("2026-10-16T10:15:00.000Z"), "16 Oct 2026, 15:45 IST");
  assert.equal(formatOrderTime("invalid"), "Unavailable");
  assert.deepEqual(getOrderTemplateParameters({ orderId: "id-only" }), [
    { type: "text", text: "id-only" },
    { type: "text", text: "Unavailable" },
    { type: "text", text: "Unavailable" }
  ]);
});

test("WhatsApp configuration validates complete settings", () => {
  assert.throws(() => getWhatsAppConfig({ ...configuredEnv, WHATSAPP_PHONE_NUMBER_ID: "bad-id" }), /invalid phone number/);
  assert.throws(() => getWhatsAppConfig({ ...configuredEnv, WHATSAPP_TEMPLATE_NAME: "Bad Template" }), /invalid API version or template/);
  assert.throws(() => getWhatsAppConfig({ ...configuredEnv, WHATSAPP_GRAPH_API_VERSION: "latest" }), /invalid API version or template/);
  assert.deepEqual(getWhatsAppConfig(configuredEnv), {
    accessToken: "test-token",
    phoneNumberId: "123456789012345",
    ownerNumber: "14155550132",
    apiVersion: "v26.0",
    templateName: "owner_order_alert",
    language: "en_GB"
  });
});

test("WhatsApp API errors expose only the HTTP status", async () => {
  await assert.rejects(sendNewOrderWhatsAppAlert({}, {
    env: configuredEnv,
    fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ error: "sensitive provider response" }) })
  }), /HTTP 401/);
});

test("WhatsApp transport errors are sanitized before server logging", async () => {
  await assert.rejects(sendNewOrderWhatsAppAlert({}, {
    env: configuredEnv,
    fetchImpl: async () => { throw new Error("transport included a private token"); }
  }), (error) => {
    assert.equal(error.message, "WhatsApp Cloud API request failed or timed out.");
    assert.equal(error.message.includes("private token"), false);
    return true;
  });
});
