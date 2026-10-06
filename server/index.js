/*
  GurunanakStore PhonePe API
  -------------------------
  PhonePe credentials stay on this server. The public website sends product IDs
  and quantities only; this server calculates the amount from catalog.js.

  Routes:
    GET  /health                      Basic readiness check
    POST /api/payments/create         Create PhonePe Standard Checkout order
    GET  /api/payments/status?id=...  Verify the order with PhonePe
*/

"use strict";

const http = require("node:http");
const crypto = require("node:crypto");
const { URL } = require("node:url");
const PRODUCT_PRICES_RUPEES = require("./catalog");

const PORT = Number(process.env.PORT || 8787);
const PHONEPE_ENV = String(process.env.PHONEPE_ENV || "sandbox").toLowerCase();
const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID || "";
const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET || "";
const PHONEPE_CLIENT_VERSION = process.env.PHONEPE_CLIENT_VERSION || "";
const SITE_URL = process.env.SITE_URL || "https://gurunanakstore.shop";
const ALLOWED_ORIGINS = new Set(
  String(process.env.SITE_ORIGINS || "https://gurunanakstore.shop,https://www.gurunanakstore.shop")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

if (PHONEPE_ENV !== "sandbox" && PHONEPE_ENV !== "production") {
  throw new Error("PHONEPE_ENV must be either sandbox or production.");
}

const API_BASE = PHONEPE_ENV === "production"
  ? "https://api.phonepe.com/apis/pg"
  : "https://api-preprod.phonepe.com/apis/pg-sandbox";
const AUTH_URL = PHONEPE_ENV === "production"
  ? "https://api.phonepe.com/apis/identity-manager/v1/oauth/token"
  : "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token";

let cachedToken = "";
let tokenExpiresAt = 0;

function isConfigured() {
  return Boolean(PHONEPE_CLIENT_ID && PHONEPE_CLIENT_SECRET && PHONEPE_CLIENT_VERSION);
}

function corsHeaders(origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin"
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return headers;
}

function sendJson(response, status, body, origin) {
  response.writeHead(status, corsHeaders(origin));
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    let tooLarge = false;
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      if (tooLarge) return;
      raw += chunk;
      if (raw.length > 32 * 1024) {
        tooLarge = true;
        raw = "";
      }
    });
    request.on("end", () => {
      if (tooLarge) {
        reject(Object.assign(new Error("Request is too large."), { statusCode: 413 }));
        return;
      }
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch (error) {
        reject(Object.assign(new Error("Send a valid JSON request."), { statusCode: 400 }));
      }
    });
    request.on("error", reject);
  });
}

function getOrderTotal(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
    throw Object.assign(new Error("Your cart is empty or has too many products."), { statusCode: 400 });
  }

  const totalRupees = items.reduce((total, item) => {
    const productId = Number(item && item.productId);
    const quantity = Number(item && item.quantity);
    const price = PRODUCT_PRICES_RUPEES[productId];
    if (!Number.isInteger(productId) || !price || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw Object.assign(new Error("The cart contains an invalid product or quantity."), { statusCode: 400 });
    }
    return total + price * quantity;
  }, 0);

  if (!Number.isSafeInteger(totalRupees) || totalRupees < 1 || totalRupees > 1000000) {
    throw Object.assign(new Error("The order amount is outside the allowed range."), { statusCode: 400 });
  }
  return totalRupees * 100;
}

async function getAccessToken() {
  if (!isConfigured()) {
    throw Object.assign(new Error("PhonePe credentials are not configured on the payment server."), { statusCode: 503 });
  }
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) return cachedToken;

  const body = new URLSearchParams({
    client_id: PHONEPE_CLIENT_ID,
    client_version: PHONEPE_CLIENT_VERSION,
    client_secret: PHONEPE_CLIENT_SECRET,
    grant_type: "client_credentials"
  });
  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) {
    throw new Error("PhonePe authorization failed. Check the server credentials and environment.");
  }

  cachedToken = result.access_token;
  const expiryValue = Number(result.expires_at || 0);
  tokenExpiresAt = expiryValue > 1000000000000 ? expiryValue : expiryValue * 1000;
  if (!tokenExpiresAt) tokenExpiresAt = Date.now() + 30 * 60 * 1000;
  return cachedToken;
}

async function phonePeRequest(url, options) {
  const token = await getAccessToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: "O-Bearer " + token,
      ...(options && options.headers)
    },
    signal: AbortSignal.timeout(20000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Never send PhonePe's raw response or credentials back to the browser.
    console.error("PhonePe API returned HTTP", response.status);
    throw new Error("PhonePe could not process the request. Please try again shortly.");
  }
  return result;
}

async function createPayment(requestBody) {
  const amount = getOrderTotal(requestBody.items);
  const merchantOrderId = "GS" + Date.now() + crypto.randomBytes(8).toString("hex");
  const redirect = new URL("/checkout.html", SITE_URL);
  redirect.searchParams.set("payment", "return");
  redirect.searchParams.set("merchantOrderId", merchantOrderId);

  const result = await phonePeRequest(API_BASE + "/checkout/v2/pay", {
    method: "POST",
    body: JSON.stringify({
      merchantOrderId,
      amount,
      expireAfter: 1200,
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: "GurunanakStore order",
        merchantUrls: { redirectUrl: redirect.toString() },
        paymentModeConfig: {
          // PhonePe creates this QR for this order and amount; the uploaded
          // merchant QR below is only a separate manual-payment fallback.
          enabledPaymentModes: [
            { type: "UPI_INTENT" },
            { type: "UPI_QR" }
          ]
        }
      }
    })
  });

  if (!result.redirectUrl || result.state !== "PENDING") {
    throw new Error("PhonePe did not return a checkout link.");
  }
  if (new URL(result.redirectUrl).protocol !== "https:") {
    throw new Error("PhonePe returned an insecure checkout link.");
  }
  return { merchantOrderId, amount, redirectUrl: result.redirectUrl };
}

async function getPaymentStatus(merchantOrderId) {
  if (!/^GS\d{13}[a-f0-9]{16}$/.test(merchantOrderId)) {
    throw Object.assign(new Error("The payment reference is not valid."), { statusCode: 400 });
  }
  const url = API_BASE + "/checkout/v2/order/" + encodeURIComponent(merchantOrderId) + "/status?details=false";
  const result = await phonePeRequest(url, { method: "GET" });
  return { merchantOrderId, state: String(result.state || "UNKNOWN"), amount: Number(result.amount || 0) };
}

const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin || "";
  const requestUrl = new URL(request.url, "http://localhost");

  if (request.method === "OPTIONS") {
    if (!ALLOWED_ORIGINS.has(origin)) return sendJson(response, 403, { error: "This website is not allowed to use the payment service." }, "");
    response.writeHead(204, corsHeaders(origin));
    return response.end();
  }

  if (requestUrl.pathname === "/health" && request.method === "GET") {
    return sendJson(response, 200, { ok: true, configured: isConfigured(), environment: PHONEPE_ENV }, origin);
  }

  if (requestUrl.pathname === "/api/payments/create" && request.method === "POST") {
    if (!ALLOWED_ORIGINS.has(origin)) return sendJson(response, 403, { error: "This website is not allowed to use the payment service." }, "");
    try {
      const body = await readJson(request);
      const payment = await createPayment(body);
      return sendJson(response, 200, payment, origin);
    } catch (error) {
      const status = Number(error.statusCode) || (isConfigured() ? 502 : 503);
      if (status >= 500) console.error("PhonePe payment start failed:", error.message);
      return sendJson(response, status, { error: status === 400 ? error.message : "PhonePe checkout is not ready. Please contact us or try again later." }, origin);
    }
  }

  if (requestUrl.pathname === "/api/payments/status" && request.method === "GET") {
    if (!ALLOWED_ORIGINS.has(origin)) return sendJson(response, 403, { error: "This website is not allowed to use the payment service." }, "");
    try {
      const merchantOrderId = requestUrl.searchParams.get("merchantOrderId") || "";
      return sendJson(response, 200, await getPaymentStatus(merchantOrderId), origin);
    } catch (error) {
      const status = Number(error.statusCode) || (isConfigured() ? 502 : 503);
      if (status >= 500) console.error("PhonePe status check failed:", error.message);
      return sendJson(response, status, { error: status === 400 ? error.message : "PhonePe could not confirm this payment yet." }, origin);
    }
  }

  return sendJson(response, 404, { error: "Not found." }, origin);
});

if (require.main === module) {
  server.listen(PORT, "0.0.0.0", () => {
    console.log("GurunanakStore PhonePe API listening on port " + PORT + " (" + PHONEPE_ENV + ")");
  });
}

module.exports = { getOrderTotal };
