const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { Readable } = require("node:stream");

const VERIFY_TOKEN = "local-test-verify-token-not-for-production-0123456789abcdef";
const APP_SECRET = "local-test-meta-app-secret";
let server;

test.before(() => {
  process.env.WHATSAPP_VERIFY_TOKEN = VERIFY_TOKEN;
  process.env.WHATSAPP_APP_SECRET = APP_SECRET;
  process.env.ADMIN_PASSWORD = "webhook-test-owner-password-at-least-twenty-chars";
  const app = require("./index");
  server = app.server;
});

async function send(method, url, body, headers = {}) {
  const request = Readable.from(body === undefined ? [] : [body]);
  request.method = method;
  request.url = url;
  request.headers = Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));
  request.socket = { remoteAddress: "127.0.0.1" };
  return new Promise((resolve) => {
    const response = {
      writeHead(status, responseHeaders) {
        this.status = status;
        this.headers = responseHeaders;
      },
      end(responseBody) {
        resolve({ status: this.status, headers: this.headers, body: responseBody || "" });
      }
    };
    server.emit("request", request, response);
  });
}

function signedHeaders(body) {
  return {
    "Content-Type": "application/json",
    "X-Hub-Signature-256": "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(body).digest("hex")
  };
}

test("GET verifies Meta subscription and returns the challenge as plain text", async () => {
  const response = await send("GET", "/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=" + VERIFY_TOKEN + "&hub.challenge=challenge-123");
  assert.equal(response.status, 200);
  assert.equal(response.body, "challenge-123");
  assert.match(response.headers["Content-Type"], /^text\/plain/);
});

test("GET rejects an incorrect token, mode, or missing challenge", async () => {
  const invalidToken = await send("GET", "/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=challenge-123");
  const invalidMode = await send("GET", "/webhooks/whatsapp?hub.mode=unsubscribe&hub.verify_token=" + VERIFY_TOKEN + "&hub.challenge=challenge-123");
  const missingChallenge = await send("GET", "/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=" + VERIFY_TOKEN);
  assert.equal(invalidToken.status, 403);
  assert.equal(invalidMode.status, 403);
  assert.equal(missingChallenge.status, 403);
});

test("POST accepts signed inbound-message and delivery-status events", async () => {
  const body = Buffer.from(JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{
      id: "test-waba",
      changes: [{
        field: "messages",
        value: {
          messages: [{ from: "15550000000", id: "wamid.inbound", type: "text", text: { body: "hello" } }],
          statuses: [{ id: "wamid.outbound", status: "delivered", recipient_id: "15550000001" }]
        }
      }]
    }]
  }));
  const response = await send("POST", "/webhooks/whatsapp", body, signedHeaders(body));
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), { received: true });
});

test("POST rejects missing or invalid Meta signatures", async () => {
  const body = Buffer.from(JSON.stringify({ object: "whatsapp_business_account", entry: [{ changes: [] }] }));
  const missing = await send("POST", "/webhooks/whatsapp", body, { "Content-Type": "application/json" });
  const invalid = await send("POST", "/webhooks/whatsapp", body, { ...signedHeaders(body), "X-Hub-Signature-256": "sha256=" + "0".repeat(64) });
  assert.equal(missing.status, 401);
  assert.equal(invalid.status, 401);
});

test("POST rejects malformed JSON and malformed event envelopes", async () => {
  const malformedJson = Buffer.from("{");
  const malformedEnvelope = Buffer.from(JSON.stringify({ object: "wrong", entry: [] }));
  const badJsonResponse = await send("POST", "/webhooks/whatsapp", malformedJson, signedHeaders(malformedJson));
  const badEnvelopeResponse = await send("POST", "/webhooks/whatsapp", malformedEnvelope, signedHeaders(malformedEnvelope));
  assert.equal(badJsonResponse.status, 400);
  assert.deepEqual(JSON.parse(badJsonResponse.body), { error: "Webhook payload is invalid." });
  assert.equal(badEnvelopeResponse.status, 400);
});

test("POST enforces a request size limit", async () => {
  const body = Buffer.alloc(1024 * 1024 + 1, 65);
  const response = await send("POST", "/webhooks/whatsapp", body, { "Content-Length": String(body.length) });
  assert.equal(response.status, 413);
});
