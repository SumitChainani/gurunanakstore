/*
  GurunanakStore PhonePe API
  -------------------------
  PhonePe credentials stay on this server. The public website sends product IDs
  and quantities only; this server calculates the amount from catalog.js.

  Routes:
    GET  /health                      Basic readiness check
    POST /api/orders                  Save a customer order for owner approval
    GET  /api/orders/status?trackingCode=... Let a customer check approval status
    POST /api/admin/login             Check the private owner password
    GET  /api/admin/orders            List saved orders (owner only)
    POST /api/admin/orders/:id/approve Approve a payment/order (owner only)
    POST /api/payments/create         Create PhonePe Standard Checkout order
    GET  /api/payments/status?id=...  Verify a PhonePe Gateway order
*/

"use strict";

const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { URL } = require("node:url");
const PRODUCT_CATALOG = require("./catalog");
const PHONEPE_DISCOUNT_PERCENT = 10;
const TRACKING_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const PORT = Number(process.env.PORT || 8787);
const PHONEPE_ENV = String(process.env.PHONEPE_ENV || "sandbox").toLowerCase();
const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID || "";
const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET || "";
const PHONEPE_CLIENT_VERSION = process.env.PHONEPE_CLIENT_VERSION || "";
const SITE_URL = process.env.SITE_URL || "https://gurunanakstore.shop";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ORDERS_FILE = path.resolve(process.env.ORDERS_FILE || path.join(__dirname, "data", "orders.json"));
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
let orderWriteQueue = Promise.resolve();
const adminLoginFailures = new Map();
const ADMIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_MAX_FAILURES = 8;
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const adminSessions = new Map();

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
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
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
    const product = PRODUCT_CATALOG[productId];
    const price = product && product.price;
    if (!Number.isInteger(productId) || !price || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw Object.assign(new Error("The cart contains an invalid product or quantity."), { statusCode: 400 });
    }
    return total + price * quantity;
  }, 0);

  if (!Number.isSafeInteger(totalRupees) || totalRupees < 1 || totalRupees > 1000000) {
    throw Object.assign(new Error("The order amount is outside the allowed range."), { statusCode: 400 });
  }
  // PhonePe orders receive 10% off the merchandise total. The result is
  // returned in paise so the discount stays exact for UPI payments.
  return Math.round(totalRupees * (100 - PHONEPE_DISCOUNT_PERCENT));
}

function generateTrackingCode() {
  // Sixteen random base-32 characters make the code easy to copy while
  // avoiding look-alike characters such as I, O, 0, and 1.
  const randomBytes = crypto.randomBytes(16);
  const code = Array.from(randomBytes, (value) => TRACKING_CODE_ALPHABET[value & 31]).join("");
  return "GS-" + code;
}

function normalizeTrackingCode(value) {
  return String(value || "").trim().toUpperCase();
}

function isValidTrackingCode(value) {
  return /^GS-[A-HJ-NP-Z2-9]{16}$/.test(normalizeTrackingCode(value));
}

function buildOrder(body) {
  const items = body.items;
  const phonePeAmountPaise = getOrderTotal(items);
  const paymentMethod = String(body.paymentMethod || "PHONEPE_UPI").trim().toUpperCase();
  if (!["PHONEPE_UPI", "COD"].includes(paymentMethod)) {
    throw Object.assign(new Error("Choose PhonePe UPI or cash on delivery."), { statusCode: 400 });
  }
  const customer = body.customer || {};
  const name = String(customer.name || "").trim();
  const phone = String(customer.phone || "").replace(/\D/g, "");
  const address = String(customer.address || "").trim();
  const paymentReference = paymentMethod === "COD" ? "" : String(body.paymentReference || "").trim();

  if (name.length < 2 || name.length > 100) {
    throw Object.assign(new Error("Enter a valid customer name."), { statusCode: 400 });
  }
  if (!/^\d{10}$/.test(phone)) {
    throw Object.assign(new Error("Enter a valid 10-digit phone number."), { statusCode: 400 });
  }
  if (address.length < 8 || address.length > 500) {
    throw Object.assign(new Error("Enter a delivery address between 8 and 500 characters."), { statusCode: 400 });
  }
  const checkoutReference = String(body.checkoutReference || "").trim();
  if (!/^GS\d{13}[A-Z0-9]{8}$/.test(checkoutReference)) {
    throw Object.assign(new Error("The checkout reference is not valid. Reload checkout and try again."), { statusCode: 400 });
  }
  if (paymentMethod === "PHONEPE_UPI" && !paymentReference) {
    throw Object.assign(new Error("Enter your PhonePe transaction ID before sending the order for approval."), { statusCode: 400 });
  }
  if (paymentReference.length > 60) {
    throw Object.assign(new Error("The payment reference is too long."), { statusCode: 400 });
  }

  const orderItems = items.map((item) => {
    const product = PRODUCT_CATALOG[Number(item.productId)];
    return {
      productId: Number(item.productId),
      name: product.name,
      unitPrice: product.price,
      quantity: Number(item.quantity)
    };
  });
  const subtotalRupees = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const amountPaise = paymentMethod === "COD" ? subtotalRupees * 100 : phonePeAmountPaise;
  const amountRupees = amountPaise / 100;

  return {
    orderId: crypto.randomBytes(18).toString("base64url"),
    trackingCode: generateTrackingCode(),
    paymentMethod,
    status: "PENDING",
    paymentStatus: paymentMethod === "COD" ? "COD_PENDING" : paymentReference ? "REFERENCE_PROVIDED" : "NOT_REPORTED",
    checkoutReference,
    paymentReference,
    customer: { name, phone, address },
    items: orderItems,
    subtotalRupees,
    discountRupees: paymentMethod === "COD" ? 0 : Number((subtotalRupees * PHONEPE_DISCOUNT_PERCENT / 100).toFixed(2)),
    amountPaise,
    amountRupees,
    createdAt: new Date().toISOString(),
    confirmedAt: null
  };
}

async function readOrders() {
  try {
    const contents = await fs.readFile(ORDERS_FILE, "utf8");
    const orders = JSON.parse(contents);
    if (!Array.isArray(orders)) throw new Error("The saved order file is invalid.");
    return orders;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function saveOrders(orders) {
  await fs.mkdir(path.dirname(ORDERS_FILE), { recursive: true });
  const temporaryFile = ORDERS_FILE + ".tmp";
  await fs.writeFile(temporaryFile, JSON.stringify(orders, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporaryFile, ORDERS_FILE);
}

function updateOrders(operation) {
  const result = orderWriteQueue.then(async () => {
    const orders = await readOrders();
    const updatedResult = operation(orders);
    await saveOrders(orders);
    return updatedResult;
  });
  orderWriteQueue = result.catch(() => {});
  return result;
}

function publicOrder(order) {
  return {
    orderId: order.orderId,
    trackingCode: order.trackingCode || "",
    paymentMethod: order.paymentMethod || "PHONEPE_UPI",
    status: order.status,
    paymentStatus: order.paymentStatus,
    amountRupees: order.amountRupees,
    createdAt: order.createdAt,
    confirmedAt: order.confirmedAt
  };
}

function secretMatches(candidate) {
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 20) return false;
  const expectedHash = crypto.createHash("sha256").update(ADMIN_PASSWORD).digest();
  const candidateHash = crypto.createHash("sha256").update(String(candidate || "")).digest();
  return crypto.timingSafeEqual(candidateHash, expectedHash);
}

function adminAttemptsRemaining(ipAddress) {
  const entry = adminLoginFailures.get(ipAddress);
  if (!entry || Date.now() - entry.startedAt > ADMIN_FAILURE_WINDOW_MS) {
    adminLoginFailures.delete(ipAddress);
    return ADMIN_MAX_FAILURES;
  }
  return Math.max(0, ADMIN_MAX_FAILURES - entry.count);
}

function recordAdminFailure(ipAddress) {
  const now = Date.now();
  const entry = adminLoginFailures.get(ipAddress);
  if (!entry || now - entry.startedAt > ADMIN_FAILURE_WINDOW_MS) {
    adminLoginFailures.set(ipAddress, { startedAt: now, count: 1 });
    return;
  }
  entry.count += 1;
}

function clearAdminFailures(ipAddress) {
  adminLoginFailures.delete(ipAddress);
}

function hasAdminAccess(request) {
  const authorization = String(request.headers.authorization || "");
  if (!authorization.startsWith("Bearer ")) return false;
  const token = authorization.slice(7);
  const expiresAt = adminSessions.get(token);
  if (!expiresAt) return false;
  if (Date.now() >= expiresAt) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

function createAdminSession() {
  const now = Date.now();
  for (const [token, expiresAt] of adminSessions) {
    if (now >= expiresAt) adminSessions.delete(token);
  }
  const token = crypto.randomBytes(32).toString("base64url");
  adminSessions.set(token, now + ADMIN_SESSION_TTL_MS);
  return token;
}

function validOrderId(value) {
  return /^[A-Za-z0-9_-]{24}$/.test(String(value || ""));
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

  if (requestUrl.pathname.startsWith("/api/") && !ALLOWED_ORIGINS.has(origin)) {
    return sendJson(response, 403, { error: "This website is not allowed to use the order service." }, "");
  }

  if (requestUrl.pathname === "/health" && request.method === "GET") {
    return sendJson(response, 200, {
      ok: true,
      configured: isConfigured(),
      adminConfigured: ADMIN_PASSWORD.length >= 20,
      codEnabled: true,
      environment: PHONEPE_ENV
    }, origin);
  }

  if (requestUrl.pathname === "/api/orders" && request.method === "POST") {
    if (ADMIN_PASSWORD.length < 20) {
      return sendJson(response, 503, { error: "Online order approval is not ready. Please contact the store or try again later." }, origin);
    }
    try {
      const body = await readJson(request);
      const order = buildOrder(body);
      const savedOrder = await updateOrders((orders) => {
        const existingOrder = orders.find((entry) => entry.checkoutReference === order.checkoutReference);
        if (existingOrder) return existingOrder;
        while (orders.some((entry) => normalizeTrackingCode(entry.trackingCode) === order.trackingCode)) {
          order.trackingCode = generateTrackingCode();
        }
        orders.unshift(order);
        return order;
      });
      return sendJson(response, 201, {
        ...publicOrder(savedOrder),
        checkoutReference: savedOrder.checkoutReference,
        statusUrl: new URL("/order.html?trackingCode=" + encodeURIComponent(savedOrder.trackingCode), SITE_URL).toString()
      }, origin);
    } catch (error) {
      const status = Number(error.statusCode) || 500;
      if (status >= 500) console.error("Order could not be saved:", error.message);
      return sendJson(response, status, {
        error: status === 400 ? error.message : "We could not save this order right now. Please contact GurunanakStore."
      }, origin);
    }
  }

  if (requestUrl.pathname === "/api/orders/status" && request.method === "GET") {
    const trackingCode = normalizeTrackingCode(requestUrl.searchParams.get("trackingCode"));
    const orderId = requestUrl.searchParams.get("orderId") || "";
    if (trackingCode ? !isValidTrackingCode(trackingCode) : !validOrderId(orderId)) {
      return sendJson(response, 400, { error: "The order reference is not valid." }, origin);
    }
    try {
      const order = (await readOrders()).find((entry) => trackingCode
        ? normalizeTrackingCode(entry.trackingCode) === trackingCode
        : entry.orderId === orderId);
      if (!order) return sendJson(response, 404, { error: "We could not find this order." }, origin);
      return sendJson(response, 200, publicOrder(order), origin);
    } catch (error) {
      console.error("Order status could not be read:", error.message);
      return sendJson(response, 500, { error: "We could not check this order yet." }, origin);
    }
  }

  if (requestUrl.pathname === "/api/admin/login" && request.method === "POST") {
    if (ADMIN_PASSWORD.length < 20) {
      return sendJson(response, 503, { error: "Owner access has not been configured on the server yet." }, origin);
    }
    const ipAddress = request.socket.remoteAddress || "unknown";
    if (adminAttemptsRemaining(ipAddress) === 0) {
      return sendJson(response, 429, { error: "Too many attempts. Wait 15 minutes, then try again." }, origin);
    }
    try {
      const body = await readJson(request);
      if (!secretMatches(body.password)) {
        recordAdminFailure(ipAddress);
        return sendJson(response, ADMIN_PASSWORD ? 401 : 503, {
          error: ADMIN_PASSWORD ? "That password did not match." : "Owner access has not been configured on the server yet."
        }, origin);
      }
      clearAdminFailures(ipAddress);
      return sendJson(response, 200, { authenticated: true, token: createAdminSession() }, origin);
    } catch (error) {
      return sendJson(response, Number(error.statusCode) || 400, { error: error.message }, origin);
    }
  }

  if (requestUrl.pathname === "/api/admin/orders" && request.method === "GET") {
    if (!hasAdminAccess(request)) return sendJson(response, 401, { error: "Owner sign-in is required." }, origin);
    try {
      const orders = await readOrders();
      return sendJson(response, 200, { orders }, origin);
    } catch (error) {
      console.error("Owner order list could not be read:", error.message);
      return sendJson(response, 500, { error: "We could not load the saved orders." }, origin);
    }
  }

  const approveMatch = requestUrl.pathname.match(/^\/api\/admin\/orders\/([A-Za-z0-9_-]{24})\/approve$/);
  if (approveMatch && request.method === "POST") {
    if (!hasAdminAccess(request)) return sendJson(response, 401, { error: "Owner sign-in is required." }, origin);
    try {
      const orderId = approveMatch[1];
      const order = await updateOrders((orders) => {
        const foundOrder = orders.find((entry) => entry.orderId === orderId);
        if (!foundOrder) return null;
        if (foundOrder.status !== "APPROVED") {
          if (foundOrder.paymentMethod === "COD") {
            foundOrder.status = "APPROVED";
            foundOrder.paymentStatus = "COD_ACCEPTED";
            foundOrder.confirmedAt = new Date().toISOString();
          } else {
            if (!foundOrder.paymentReference) {
              throw Object.assign(new Error("Ask the customer for their payment reference before approving this order."), { statusCode: 400 });
            }
            foundOrder.status = "APPROVED";
            foundOrder.paymentStatus = "MANUALLY_VERIFIED";
            foundOrder.confirmedAt = new Date().toISOString();
          }
        }
        return publicOrder(foundOrder);
      });
      if (!order) return sendJson(response, 404, { error: "We could not find this order." }, origin);
      return sendJson(response, 200, order, origin);
    } catch (error) {
      const status = Number(error.statusCode) || 500;
      if (status >= 500) console.error("Order approval could not be saved:", error.message);
      return sendJson(response, status, {
        error: status === 400 ? error.message : "We could not save the approval. Please try again."
      }, origin);
    }
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

module.exports = { getOrderTotal, buildOrder, generateTrackingCode, isValidTrackingCode, server };
