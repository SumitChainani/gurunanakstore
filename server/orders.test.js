const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { Readable } = require("node:stream");

const OWNER_PASSWORD = "test-owner-password-that-is-long-enough-2026";
let server;
let ordersFile;
let temporaryDirectory;
let createdOrder;
let originalFetch;

test.before(async () => {
  temporaryDirectory = await fs.mkdtemp(path.join(__dirname, ".orders-test-"));
  ordersFile = path.join(temporaryDirectory, "orders.json");
  process.env.ADMIN_PASSWORD = OWNER_PASSWORD;
  process.env.ORDERS_FILE = ordersFile;
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  delete process.env.WHATSAPP_OWNER_NUMBER;
  delete process.env.WHATSAPP_GRAPH_API_VERSION;
  delete process.env.WHATSAPP_TEMPLATE_NAME;
  delete process.env.WHATSAPP_TEMPLATE_LANGUAGE;
  const app = require("./index");
  server = app.server;
});

test.after(async () => {
  if (originalFetch) global.fetch = originalFetch;
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  delete process.env.WHATSAPP_OWNER_NUMBER;
  delete process.env.WHATSAPP_GRAPH_API_VERSION;
  delete process.env.WHATSAPP_TEMPLATE_NAME;
  delete process.env.WHATSAPP_TEMPLATE_LANGUAGE;
  if (temporaryDirectory) await fs.rm(temporaryDirectory, { recursive: true, force: true });
});

async function send(pathname, options) {
  const requestOptions = Object.assign({}, options || {});
  const headers = Object.fromEntries(Object.entries(
    Object.assign({ Origin: "https://gurunanakstore.shop" }, requestOptions.headers || {})
  ).map(([name, value]) => [name.toLowerCase(), value]));
  const request = Readable.from(requestOptions.body ? [requestOptions.body] : []);
  request.method = requestOptions.method || "GET";
  request.url = pathname;
  request.headers = headers;
  request.socket = { remoteAddress: "127.0.0.1" };
  return new Promise((resolve) => {
    const response = {
      writeHead(status, responseHeaders) {
        this.status = status;
        this.headers = responseHeaders;
      },
      end(body) {
        resolve({
          status: this.status,
          headers: this.headers,
          json: async () => JSON.parse(body || "null")
        });
      }
    };
    server.emit("request", request, response);
  });
}

test("saves an order and exposes only its public status", async () => {
  let whatsappAlertsSent = 0;
  let whatsappPayload;
  originalFetch = global.fetch;
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "123456789012345";
  process.env.WHATSAPP_OWNER_NUMBER = "919876543210";
  process.env.WHATSAPP_GRAPH_API_VERSION = "v26.0";
  process.env.WHATSAPP_TEMPLATE_NAME = "new_order_details";
  process.env.WHATSAPP_TEMPLATE_LANGUAGE = "en_US";
  global.fetch = async (url, options) => {
    whatsappAlertsSent += 1;
    whatsappPayload = JSON.parse(options.body);
    return { ok: true, json: async () => ({ messages: [{ id: "wamid.test" }] }) };
  };
  const response = await send("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId: 1, quantity: 1 }],
      customer: { name: "Sumit Test", phone: "8815960890", address: "12 Test Road, Pune 411001" },
      checkoutReference: "GS1234567890123AB12CD34",
      paymentReference: "UPI-TEST-123"
    })
  });
  assert.equal(response.status, 201);
  createdOrder = await response.json();
  assert.match(createdOrder.orderId, /^[A-Za-z0-9_-]{24}$/);
  assert.match(createdOrder.trackingCode, /^GS-[A-HJ-NP-Z2-9]{16}$/);
  assert.equal(createdOrder.amountRupees, 289.52);
  assert.equal(createdOrder.status, "PENDING");
  assert.equal(createdOrder.checkoutReference, "GS1234567890123AB12CD34");
  assert.equal(new URL(createdOrder.statusUrl).searchParams.get("trackingCode"), createdOrder.trackingCode);

  const repeatedSubmission = await send("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId: 1, quantity: 1 }],
      customer: { name: "Sumit Test", phone: "8815960890", address: "12 Test Road, Pune 411001" },
      checkoutReference: "GS1234567890123AB12CD34",
      paymentReference: "UPI-TEST-123"
    })
  });
  const repeatedOrder = await repeatedSubmission.json();
  assert.equal(repeatedOrder.orderId, createdOrder.orderId);
  assert.equal(repeatedOrder.trackingCode, createdOrder.trackingCode);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(whatsappAlertsSent, 0, "unverified UPI orders must not notify the owner");
  assert.equal(whatsappPayload, undefined);
  global.fetch = originalFetch;
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  delete process.env.WHATSAPP_OWNER_NUMBER;
  delete process.env.WHATSAPP_GRAPH_API_VERSION;
  delete process.env.WHATSAPP_TEMPLATE_NAME;
  delete process.env.WHATSAPP_TEMPLATE_LANGUAGE;

  const publicResponse = await send("/api/orders/status?trackingCode=" + encodeURIComponent(createdOrder.trackingCode.toLowerCase()));
  assert.equal(publicResponse.status, 200);
  const publicStatus = await publicResponse.json();
  assert.equal(publicStatus.status, "PENDING");
  assert.equal(publicStatus.trackingCode, createdOrder.trackingCode);
  assert.equal("customer" in publicStatus, false);
  assert.equal("paymentReference" in publicStatus, false);

  const legacyStatus = await send("/api/orders/status?orderId=" + encodeURIComponent(createdOrder.orderId));
  assert.equal(legacyStatus.status, 200);

  const invalidReference = await send("/api/orders/status?trackingCode=GS-NOT-A-REAL-CODE");
  assert.equal(invalidReference.status, 400);

  const savedOrders = JSON.parse(await fs.readFile(ordersFile, "utf8"));
  assert.equal(savedOrders.length, 1);
  assert.equal(savedOrders[0].customer.address, "12 Test Road, Pune 411001");
});

test("WhatsApp notification failure does not fail or undo a successfully saved order", async () => {
  originalFetch = global.fetch;
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "123456789012345";
  process.env.WHATSAPP_OWNER_NUMBER = "919876543210";
  process.env.WHATSAPP_GRAPH_API_VERSION = "v26.0";
  process.env.WHATSAPP_TEMPLATE_NAME = "new_order_details";
  process.env.WHATSAPP_TEMPLATE_LANGUAGE = "en_US";
  global.fetch = async () => { throw new Error("simulated Meta outage"); };
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const response = await send("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ productId: 1, quantity: 1 }],
        customer: { name: "Alert Failure Test", phone: "8815960893", address: "15 Test Road, Pune 411001" },
        checkoutReference: "GS1234567890126AB12CD34",
        paymentReference: "UPI-ALERT-FAILURE"
      })
    });
    assert.equal(response.status, 201);
    const responseOrder = await response.json();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(JSON.parse(await fs.readFile(ordersFile, "utf8")).find((order) => order.orderId === responseOrder.orderId).status, "PENDING");

    const login = await send("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: OWNER_PASSWORD })
    });
    const session = await login.json();
    const approval = await send("/api/admin/orders/" + responseOrder.orderId + "/approve", {
      method: "POST",
      headers: { Authorization: "Bearer " + session.token, "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    assert.equal(approval.status, 200);
    assert.equal((await approval.json()).paymentStatus, "MANUALLY_VERIFIED");
    await new Promise((resolve) => setImmediate(resolve));
    const savedOrders = JSON.parse(await fs.readFile(ordersFile, "utf8"));
    assert.equal(savedOrders.find((order) => order.orderId === responseOrder.orderId).status, "APPROVED");
  } finally {
    console.error = originalConsoleError;
    global.fetch = originalFetch;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_OWNER_NUMBER;
    delete process.env.WHATSAPP_GRAPH_API_VERSION;
    delete process.env.WHATSAPP_TEMPLATE_NAME;
    delete process.env.WHATSAPP_TEMPLATE_LANGUAGE;
  }
});

test("keeps order details private until the owner signs in", async () => {
  const localFileOrigin = await send("/api/admin/orders", { headers: { Origin: "null" } });
  assert.equal(localFileOrigin.status, 403);

  const response = await send("/api/admin/orders");
  assert.equal(response.status, 401);

  const wrongPassword = await send("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "not-the-owner-password" })
  });
  assert.equal(wrongPassword.status, 401);

  const login = await send("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: OWNER_PASSWORD })
  });
  assert.equal(login.status, 200);
  const session = await login.json();
  assert.equal(session.authenticated, true);
  assert.match(session.token, /^[A-Za-z0-9_-]{43}$/);

  const orders = await send("/api/admin/orders", { headers: { Authorization: "Bearer " + session.token } });
  assert.equal(orders.status, 200);
  const list = await orders.json();
  const ownerOrder = list.orders.find((order) => order.orderId === createdOrder.orderId);
  assert.ok(ownerOrder);
  assert.equal(ownerOrder.customer.name, "Sumit Test");
  assert.equal(ownerOrder.trackingCode, createdOrder.trackingCode);
  assert.equal(ownerOrder.paymentReference, "UPI-TEST-123");
});

test("blocks file-page CORS preflight but allows the production storefront origin", async () => {
  const fileHealth = await send("/health", { headers: { Origin: "null" } });
  assert.equal(fileHealth.status, 200);
  assert.equal(fileHealth.headers["Access-Control-Allow-Origin"], undefined);

  const fileOrigin = await send("/api/orders", {
    method: "OPTIONS",
    headers: {
      Origin: "null",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type"
    }
  });
  assert.equal(fileOrigin.status, 403);

  for (const origin of ["https://gurunanakstore.shop", "https://www.gurunanakstore.shop"]) {
    const storeOrigin = await send("/api/orders", {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"
      }
    });
    assert.equal(storeOrigin.status, 204);
    assert.equal(storeOrigin.headers["Access-Control-Allow-Origin"], origin);
  }
});

test("rejects invalid checkout contact details without saving an order", async () => {
  const before = JSON.parse(await fs.readFile(ordersFile, "utf8")).length;
  const invalidCustomers = [
    { name: "", phone: "8815960892", address: "8 Delivery Street, Pune 411001" },
    { name: "Invalid Phone", phone: "123", address: "8 Delivery Street, Pune 411001" },
    { name: "Invalid Address", phone: "8815960892", address: "Pune" }
  ];

  for (const [index, customer] of invalidCustomers.entries()) {
    const response = await send("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ productId: 1, quantity: 1 }],
        customer,
        checkoutReference: "GS123456789012" + (7 + index) + "AB12CD34",
        paymentReference: "UPI-TEST-123"
      })
    });
    assert.equal(response.status, 400);
  }

  const after = JSON.parse(await fs.readFile(ordersFile, "utf8")).length;
  assert.equal(after, before);
});

test("requires a PhonePe transaction ID when creating an order and blocks approval without one", async () => {
  const before = JSON.parse(await fs.readFile(ordersFile, "utf8"));
  const missingReference = await send("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId: 1, quantity: 1 }],
      customer: { name: "No Reference", phone: "8815960891", address: "44 Market Road, Pune 411001" },
      checkoutReference: "GS1234567890124AB12CD34",
      paymentReference: "   "
    })
  });
  assert.equal(missingReference.status, 400);
  assert.match((await missingReference.json()).error, /transaction ID/i);
  assert.equal(JSON.parse(await fs.readFile(ordersFile, "utf8")).length, before.length);

  // Check the owner approval guard against a legacy order record that has no reference.
  const storedOrders = JSON.parse(await fs.readFile(ordersFile, "utf8"));
  const storedCreatedOrder = storedOrders.find((order) => order.orderId === createdOrder.orderId);
  const validReference = storedCreatedOrder.paymentReference;
  storedCreatedOrder.paymentReference = "";
  await fs.writeFile(ordersFile, JSON.stringify(storedOrders, null, 2));
  const login = await send("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: OWNER_PASSWORD })
  });
  const session = await login.json();
  const response = await send("/api/admin/orders/" + createdOrder.orderId + "/approve", {
    method: "POST",
    headers: { Authorization: "Bearer " + session.token, "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  assert.equal(response.status, 400);
  storedCreatedOrder.paymentReference = validReference;
  await fs.writeFile(ordersFile, JSON.stringify(storedOrders, null, 2));
});

test("saves COD at full price and lets the owner accept it without marking payment paid", async () => {
  const health = await send("/health");
  assert.equal(health.status, 200);
  assert.equal((await health.json()).codEnabled, true);

  const response = await send("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId: 1, quantity: 1 }],
      customer: { name: "COD Customer", phone: "8815960892", address: "8 Delivery Street, Pune 411001" },
      paymentMethod: "COD",
      checkoutReference: "GS1234567890125AB12CD34",
      paymentReference: "SHOULD-BE-IGNORED"
    })
  });
  assert.equal(response.status, 201);
  const codOrder = await response.json();
  assert.equal(codOrder.paymentMethod, "COD");
  assert.equal(codOrder.amountRupees, 329);
  assert.equal(codOrder.status, "PENDING");
  assert.equal(codOrder.paymentStatus, "COD_PENDING");

  const persistedOrders = JSON.parse(await fs.readFile(ordersFile, "utf8"));
  const persistedCOD = persistedOrders.find((order) => order.trackingCode === codOrder.trackingCode);
  assert.ok(persistedCOD);
  assert.equal(persistedCOD.discountRupees, 0);
  assert.equal(persistedCOD.amountPaise, 32900);
  assert.equal(persistedCOD.paymentReference, "");

  const login = await send("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: OWNER_PASSWORD })
  });
  const session = await login.json();
  const adminOrdersResponse = await send("/api/admin/orders", {
    headers: { Authorization: "Bearer " + session.token }
  });
  assert.equal(adminOrdersResponse.status, 200);
  const adminOrders = await adminOrdersResponse.json();
  assert.equal(adminOrders.orders.find((order) => order.orderId === codOrder.orderId).paymentMethod, "COD");

  const approval = await send("/api/admin/orders/" + codOrder.orderId + "/approve", {
    method: "POST",
    headers: { Authorization: "Bearer " + session.token, "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  assert.equal(approval.status, 200);
  const approvedOrder = await approval.json();
  assert.equal(approvedOrder.status, "APPROVED");
  assert.equal(approvedOrder.paymentStatus, "COD_ACCEPTED");
  assert.equal(approvedOrder.paymentMethod, "COD");
});

test("sends one owner-only WhatsApp alert for a newly saved COD order", async () => {
  let whatsappAlertsSent = 0;
  let whatsappPayload;
  originalFetch = global.fetch;
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "123456789012345";
  process.env.WHATSAPP_OWNER_NUMBER = "919876543210";
  process.env.WHATSAPP_GRAPH_API_VERSION = "v26.0";
  process.env.WHATSAPP_TEMPLATE_NAME = "new_order_details";
  process.env.WHATSAPP_TEMPLATE_LANGUAGE = "en_US";
  global.fetch = async (_url, options) => {
    whatsappAlertsSent += 1;
    whatsappPayload = JSON.parse(options.body);
    return { ok: true, json: async () => ({ messages: [{ id: "wamid.cod" }] }) };
  };

  try {
    const requestBody = {
      items: [{ productId: 1, quantity: 1 }],
      customer: { name: "COD Alert Test", phone: "8815960894", address: "Private COD Address" },
      paymentMethod: "COD",
      checkoutReference: "GS1234567890127AB12CD34"
    };
    const firstOrderResponse = await send("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    assert.equal(firstOrderResponse.status, 201);
    const order = await firstOrderResponse.json();

    const duplicateResponse = await send("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    assert.equal(duplicateResponse.status, 201);
    assert.equal((await duplicateResponse.json()).orderId, order.orderId);

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(whatsappAlertsSent, 1, "duplicate checkout retries must not send a second alert");
    assert.equal(whatsappPayload.to, "919876543210");
    assert.equal(whatsappPayload.template.name, "new_order_details");
    assert.deepEqual(whatsappPayload.template.components[0].parameters.map((parameter) => parameter.text), [
      order.orderId,
      "₹329.00",
      new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "Asia/Kolkata"
      }).format(new Date(order.createdAt)) + " IST"
    ]);
    assert.equal(JSON.stringify(whatsappPayload).includes("8815960894"), false);
    assert.equal(JSON.stringify(whatsappPayload).includes("Private COD Address"), false);
  } finally {
    global.fetch = originalFetch;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_OWNER_NUMBER;
    delete process.env.WHATSAPP_GRAPH_API_VERSION;
    delete process.env.WHATSAPP_TEMPLATE_NAME;
    delete process.env.WHATSAPP_TEMPLATE_LANGUAGE;
  }
});

test("owner approval updates the public customer status", async () => {
  let whatsappAlertsSent = 0;
  let whatsappPayload;
  originalFetch = global.fetch;
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "123456789012345";
  process.env.WHATSAPP_OWNER_NUMBER = "919876543210";
  process.env.WHATSAPP_GRAPH_API_VERSION = "v26.0";
  process.env.WHATSAPP_TEMPLATE_NAME = "new_order_details";
  process.env.WHATSAPP_TEMPLATE_LANGUAGE = "en_US";
  global.fetch = async (_url, options) => {
    whatsappAlertsSent += 1;
    whatsappPayload = JSON.parse(options.body);
    return { ok: true, json: async () => ({ messages: [{ id: "wamid.approved" }] }) };
  };

  try {
    const login = await send("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: OWNER_PASSWORD })
    });
    const session = await login.json();
    const response = await send("/api/admin/orders/" + createdOrder.orderId + "/approve", {
      method: "POST",
      headers: { Authorization: "Bearer " + session.token, "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    assert.equal(response.status, 200);
    const approval = await response.json();
    assert.equal(approval.status, "APPROVED");
    assert.equal(approval.trackingCode, createdOrder.trackingCode);
    assert.equal(approval.paymentStatus, "MANUALLY_VERIFIED");
    assert.ok(approval.confirmedAt);

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(whatsappAlertsSent, 1);
    assert.equal(whatsappPayload.to, "919876543210");
    assert.equal(whatsappPayload.template.name, "new_order_details");
    assert.deepEqual(whatsappPayload.template.components[0].parameters.map((parameter) => parameter.text), [
      createdOrder.orderId,
      "₹289.52",
      new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "Asia/Kolkata"
      }).format(new Date(createdOrder.createdAt)) + " IST"
    ]);
    assert.equal(JSON.stringify(whatsappPayload).includes("8815960890"), false);
    assert.equal(JSON.stringify(whatsappPayload).includes("12 Test Road"), false);

    const duplicateApproval = await send("/api/admin/orders/" + createdOrder.orderId + "/approve", {
      method: "POST",
      headers: { Authorization: "Bearer " + session.token, "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    assert.equal(duplicateApproval.status, 200);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(whatsappAlertsSent, 1, "repeated approval must not send another alert");

    const customerStatus = await send("/api/orders/status?trackingCode=" + encodeURIComponent(createdOrder.trackingCode));
    assert.equal(customerStatus.status, 200);
    assert.equal((await customerStatus.json()).status, "APPROVED");
  } finally {
    global.fetch = originalFetch;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_OWNER_NUMBER;
    delete process.env.WHATSAPP_GRAPH_API_VERSION;
    delete process.env.WHATSAPP_TEMPLATE_NAME;
    delete process.env.WHATSAPP_TEMPLATE_LANGUAGE;
  }
});

test("owner can reject pending orders and delete rejected or approved orders", async () => {
  const createOrder = async (checkoutReference, paymentMethod) => {
    const response = await send("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ productId: 1, quantity: 1 }],
        customer: { name: "Order Desk Test", phone: "8815960892", address: "8 Order Desk Road, Pune 411001" },
        checkoutReference,
        paymentReference: paymentMethod === "COD" ? "IGNORED" : "UPI-REJECT-TEST",
        paymentMethod
      })
    });
    assert.equal(response.status, 201);
    return response.json();
  };

  const login = await send("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: OWNER_PASSWORD })
  });
  assert.equal(login.status, 200);
  const session = await login.json();
  const authHeaders = { Authorization: "Bearer " + session.token, "Content-Type": "application/json" };

  const rejectedOrder = await createOrder("GS9876543210123AB12CD34", "PHONEPE_UPI");
  const unauthenticatedReject = await send("/api/admin/orders/" + rejectedOrder.orderId + "/reject", { method: "POST" });
  assert.equal(unauthenticatedReject.status, 401);
  const rejectResponse = await send("/api/admin/orders/" + rejectedOrder.orderId + "/reject", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({})
  });
  assert.equal(rejectResponse.status, 200);
  const rejected = await rejectResponse.json();
  assert.equal(rejected.status, "REJECTED");
  assert.equal(rejected.paymentStatus, "REFERENCE_PROVIDED");
  assert.ok(rejected.rejectedAt);
  assert.equal("customer" in rejected, false);

  const approveRejected = await send("/api/admin/orders/" + rejectedOrder.orderId + "/approve", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({})
  });
  assert.equal(approveRejected.status, 409);

  const rejectedCustomerStatus = await send("/api/orders/status?trackingCode=" + encodeURIComponent(rejectedOrder.trackingCode));
  assert.equal(rejectedCustomerStatus.status, 200);
  assert.equal((await rejectedCustomerStatus.json()).status, "REJECTED");

  const unauthenticatedDelete = await send("/api/admin/orders/" + rejectedOrder.orderId + "/delete", { method: "POST" });
  assert.equal(unauthenticatedDelete.status, 401);
  const deleteRejected = await send("/api/admin/orders/" + rejectedOrder.orderId + "/delete", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({})
  });
  assert.equal(deleteRejected.status, 200);
  assert.equal((await deleteRejected.json()).deleted, true);
  const deletedRejectedStatus = await send("/api/orders/status?trackingCode=" + encodeURIComponent(rejectedOrder.trackingCode));
  assert.equal(deletedRejectedStatus.status, 404);

  const approvedCODOrder = await createOrder("GS9876543210124AB12CD34", "COD");
  const approveCOD = await send("/api/admin/orders/" + approvedCODOrder.orderId + "/approve", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({})
  });
  assert.equal(approveCOD.status, 200);
  assert.equal((await approveCOD.json()).paymentStatus, "COD_ACCEPTED");

  const rejectApproved = await send("/api/admin/orders/" + approvedCODOrder.orderId + "/reject", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({})
  });
  assert.equal(rejectApproved.status, 409);

  const deleteApproved = await send("/api/admin/orders/" + approvedCODOrder.orderId + "/delete", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({})
  });
  assert.equal(deleteApproved.status, 200);
  const adminList = await send("/api/admin/orders", { headers: { Authorization: "Bearer " + session.token } });
  assert.equal(adminList.status, 200);
  assert.equal((await adminList.json()).orders.some((order) => order.orderId === approvedCODOrder.orderId || order.orderId === rejectedOrder.orderId), false);
});
