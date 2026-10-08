const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const OWNER_PASSWORD = "test-owner-password-that-is-long-enough-2026";
let server;
let apiUrl;
let ordersFile;
let temporaryDirectory;
let createdOrder;

test.before(async () => {
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "gurunanak-orders-test-"));
  ordersFile = path.join(temporaryDirectory, "orders.json");
  process.env.ADMIN_PASSWORD = OWNER_PASSWORD;
  process.env.ORDERS_FILE = ordersFile;
  const app = require("./index");
  server = app.server;
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  apiUrl = "http://127.0.0.1:" + server.address().port;
});

test.after(async () => {
  if (server && server.listening) await new Promise((resolve) => server.close(resolve));
  if (temporaryDirectory) await fs.rm(temporaryDirectory, { recursive: true, force: true });
});

async function send(pathname, options) {
  const requestOptions = Object.assign({}, options || {});
  requestOptions.headers = Object.assign({ Origin: "https://gurunanakstore.shop" }, requestOptions.headers || {});
  return fetch(apiUrl + pathname, requestOptions);
}

test("saves an order and exposes only its public status", async () => {
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
  assert.equal(createdOrder.amountRupees, 809.1);
  assert.equal(createdOrder.status, "PENDING");
  assert.equal(createdOrder.checkoutReference, "GS1234567890123AB12CD34");

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
  assert.equal((await repeatedSubmission.json()).orderId, createdOrder.orderId);

  const publicResponse = await send("/api/orders/status?orderId=" + encodeURIComponent(createdOrder.orderId));
  assert.equal(publicResponse.status, 200);
  const publicStatus = await publicResponse.json();
  assert.equal(publicStatus.status, "PENDING");
  assert.equal("customer" in publicStatus, false);
  assert.equal("paymentReference" in publicStatus, false);

  const savedOrders = JSON.parse(await fs.readFile(ordersFile, "utf8"));
  assert.equal(savedOrders.length, 1);
  assert.equal(savedOrders[0].customer.address, "12 Test Road, Pune 411001");
});

test("keeps order details private until the owner signs in", async () => {
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
  assert.equal(list.orders[0].customer.name, "Sumit Test");
  assert.equal(list.orders[0].paymentReference, "UPI-TEST-123");
});

test("does not allow payment approval without a customer transaction reference", async () => {
  const created = await send("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId: 1, quantity: 1 }],
      customer: { name: "No Reference", phone: "8815960891", address: "44 Market Road, Pune 411001" },
      checkoutReference: "GS1234567890124AB12CD34",
      paymentReference: ""
    })
  });
  const orderWithoutReference = await created.json();
  const login = await send("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: OWNER_PASSWORD })
  });
  const session = await login.json();
  const response = await send("/api/admin/orders/" + orderWithoutReference.orderId + "/approve", {
    method: "POST",
    headers: { Authorization: "Bearer " + session.token, "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  assert.equal(response.status, 400);
});

test("owner approval updates the public customer status", async () => {
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
  assert.equal(approval.paymentStatus, "MANUALLY_VERIFIED");
  assert.ok(approval.confirmedAt);

  const customerStatus = await send("/api/orders/status?orderId=" + encodeURIComponent(createdOrder.orderId));
  assert.equal(customerStatus.status, 200);
  assert.equal((await customerStatus.json()).status, "APPROVED");
});
