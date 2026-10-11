/* Private owner page. The password is exchanged for an expiring token kept only in memory. */
"use strict";

const ADMIN_API_URL = String(window.GURUNANAK_API_URL || window.GURUNANAK_PHONEPE_API_URL || "").replace(/\/+$/, "");
const loginPanel = document.querySelector("[data-admin-login-panel]");
const dashboard = document.querySelector("[data-admin-dashboard]");
const loginForm = document.querySelector("[data-admin-login-form]");
const loginNotice = document.querySelector("[data-admin-login-notice]");
const dashboardNotice = document.querySelector("[data-admin-notice]");
const ordersContainer = document.querySelector("[data-admin-orders]");
let ownerSessionToken = "";
let orderRefreshTimer = 0;

function escapeAdminHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
}

function adminPrice(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function adminFetch(path, options) {
  const requestOptions = Object.assign({ cache: "no-store" }, options || {});
  requestOptions.headers = Object.assign({}, requestOptions.headers || {});
  if (ownerSessionToken) requestOptions.headers.Authorization = "Bearer " + ownerSessionToken;
  const response = await fetch(ADMIN_API_URL + path, requestOptions);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && ownerSessionToken) showLogin("Please sign in again to protect customer information.");
    throw new Error(result.error || "The order service could not complete that request.");
  }
  return result;
}

function showLogin(message) {
  window.clearInterval(orderRefreshTimer);
  orderRefreshTimer = 0;
  ownerSessionToken = "";
  dashboard.hidden = true;
  loginPanel.hidden = false;
  loginNotice.textContent = message || "";
}

function renderOrders(orders) {
  if (!orders.length) {
    ordersContainer.innerHTML = '<div class="admin-empty"><span class="empty-icon" aria-hidden="true">GS</span><h2>No orders yet</h2><p>Orders appear here after the customer finishes checkout and submits the order. Scanning or paying the PhonePe QR by itself does not send the order to the store.</p></div>';
    return;
  }

  ordersContainer.innerHTML = orders.map((order) => {
    const itemRows = order.items.map((item) => '<li><span>' + escapeAdminHTML(item.name) + ' × ' + Number(item.quantity) + '</span><strong>' + adminPrice(Number(item.unitPrice) * Number(item.quantity)) + '</strong></li>').join("");
    const created = new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    const phoneDigits = String(order.customer.phone).replace(/\D/g, "");
    const isApproved = order.status === "APPROVED";
    const isRejected = order.status === "REJECTED";
    const isPending = !isApproved && !isRejected;
    const isCOD = order.paymentMethod === "COD";
    const stateClass = isApproved ? "is-approved" : isRejected ? "is-rejected" : "is-pending";
    const stateLabel = isApproved ? "Approved" : isRejected ? "Rejected" : "Needs review";
    const paymentMethod = isCOD ? "Cash on delivery" : "PhonePe / UPI";
    const paymentReference = isCOD
      ? '<p><span>Transaction reference</span><strong>Not needed for COD</strong></p>'
      : order.paymentReference
        ? '<p><span>Transaction reference</span><strong>' + escapeAdminHTML(order.paymentReference) + '</strong></p>'
        : '<p><span>Transaction reference</span><strong>Customer has not entered one</strong></p>';
    const trackingCode = order.trackingCode
      ? '<p><span>Customer tracking code</span><strong><code>' + escapeAdminHTML(order.trackingCode) + '</code></strong></p>'
      : '<p><span>Customer tracking code</span><strong>Older order; use its existing reference</strong></p>';
    const actionButtons = (isPending
      ? '<button class="button button-gold admin-approve-button" type="button" data-approve-order="' + escapeAdminHTML(order.orderId) + '" data-payment-method="' + (isCOD ? 'COD' : 'PHONEPE_UPI') + '" ' + (!isCOD && !order.paymentReference ? 'disabled title="Ask the customer for their transaction reference first."' : '') + '>' + (isCOD ? 'Approve COD order' : 'Confirm payment &amp; approve order') + '</button>' +
        '<button class="button button-outline admin-reject-button" type="button" data-reject-order="' + escapeAdminHTML(order.orderId) + '">Reject order</button>'
      : '') +
      '<button class="button button-outline admin-delete-button" type="button" data-delete-order="' + escapeAdminHTML(order.orderId) + '">Delete order</button>';
    const statusNote = isApproved
      ? '<p class="admin-approved-note">' + (isCOD ? 'COD order accepted; payment is due at delivery. ' : 'Order approved and PhonePe payment manually reviewed. ') + escapeAdminHTML(new Date(order.confirmedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })) + '.</p>'
      : isRejected
        ? '<p class="admin-rejected-note">Order rejected' + (order.rejectedAt ? ' on ' + escapeAdminHTML(new Date(order.rejectedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })) : '') + '. PhonePe payment status is unchanged; no refund is initiated here.</p>'
        : isCOD
          ? '<p class="admin-order-reminder">Approve the order details and availability. Collect cash on delivery; this does not mark an online payment as paid.</p>'
          : order.paymentReference
            ? '<p class="admin-order-reminder">Check this reference in PhonePe Business before approving. The website cannot verify QR transfers by reference alone.</p>'
            : '<p class="admin-order-reminder">Ask the customer for their PhonePe transaction reference before approving.</p>';

    return '<article class="admin-order-card" data-order-card="' + escapeAdminHTML(order.orderId) + '">' +
      '<div class="admin-order-top"><div><p class="eyebrow eyebrow-dark">ORDER ' + escapeAdminHTML(order.orderId) + '</p><span class="admin-order-date">' + escapeAdminHTML(created) + '</span></div>' +
      '<span class="admin-order-state ' + stateClass + '">' + stateLabel + '</span></div>' +
      '<div class="admin-order-columns"><section><h2>Customer</h2><p><strong>' + escapeAdminHTML(order.customer.name) + '</strong></p><p><a href="tel:+91' + encodeURIComponent(phoneDigits) + '">' + escapeAdminHTML(order.customer.phone) + '</a></p><p class="admin-order-address">' + escapeAdminHTML(order.customer.address) + '</p><p><span>Payment method</span><strong>' + paymentMethod + '</strong></p>' + trackingCode + paymentReference + (isCOD ? '' : '<p><span>UPI QR reference</span><strong>' + escapeAdminHTML(order.checkoutReference) + '</strong></p>') + '</section>' +
      '<section><h2>Items</h2><ul class="admin-item-list">' + itemRows + '</ul><div class="admin-order-total"><span>Items total</span><strong>' + adminPrice(order.subtotalRupees) + '</strong></div>' + (isCOD ? '' : '<div class="admin-order-total"><span>PhonePe discount</span><strong>−' + adminPrice(order.discountRupees) + '</strong></div>') + '<div class="admin-order-total admin-order-payable"><span>' + (isCOD ? 'Cash due on delivery' : 'QR amount') + '</span><strong>' + adminPrice(order.amountRupees) + '</strong></div></section></div>' +
      '<div class="admin-order-actions">' + actionButtons + '</div>' + statusNote +
      '</article>';
  }).join("");

  ordersContainer.querySelectorAll("[data-approve-order]").forEach((button) => {
    button.addEventListener("click", approveOrder);
  });
  ordersContainer.querySelectorAll("[data-reject-order]").forEach((button) => {
    button.addEventListener("click", rejectOrder);
  });
  ordersContainer.querySelectorAll("[data-delete-order]").forEach((button) => {
    button.addEventListener("click", deleteOrder);
  });
}

async function loadOrders() {
  dashboardNotice.textContent = "Loading your orders…";
  try {
    const result = await adminFetch("/api/admin/orders");
    renderOrders(result.orders || []);
    dashboardNotice.textContent = (result.orders || []).length + " order" + ((result.orders || []).length === 1 ? "" : "s") + " saved on the order server.";
  } catch (error) {
    dashboardNotice.textContent = error.message;
  }
}

async function approveOrder(event) {
  const button = event.currentTarget;
  const orderId = button.dataset.approveOrder;
  const isCOD = button.dataset.paymentMethod === "COD";
  const confirmation = isCOD
    ? "Approve this cash-on-delivery order? This accepts the order but does not mark it paid; collect cash when it is delivered."
    : "Have you checked that this payment reached your PhonePe Business account? Approving updates the customer's order page.";
  if (!window.confirm(confirmation)) return;
  button.disabled = true;
  button.textContent = isCOD ? "Approving COD order…" : "Saving approval…";
  try {
    await adminFetch("/api/admin/orders/" + encodeURIComponent(orderId) + "/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    dashboardNotice.textContent = isCOD
      ? "COD order approved. Payment remains due at delivery; the customer’s tracking page will update automatically."
      : "Order approved. The customer’s tracking page will update automatically.";
    await loadOrders();
  } catch (error) {
    dashboardNotice.textContent = error.message;
    button.disabled = false;
    button.textContent = isCOD ? "Approve COD order" : "Confirm payment & approve order";
  }
}

async function rejectOrder(event) {
  const button = event.currentTarget;
  const orderId = button.dataset.rejectOrder;
  if (!window.confirm("Reject this order? The customer’s tracking page will show that it was not approved. This does not verify or refund a PhonePe payment.")) return;
  button.disabled = true;
  button.textContent = "Rejecting order…";
  try {
    await adminFetch("/api/admin/orders/" + encodeURIComponent(orderId) + "/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    dashboardNotice.textContent = "Order rejected. The customer’s tracking page will update automatically.";
    await loadOrders();
  } catch (error) {
    dashboardNotice.textContent = error.message;
    button.disabled = false;
    button.textContent = "Reject order";
  }
}

async function deleteOrder(event) {
  const button = event.currentTarget;
  const orderId = button.dataset.deleteOrder;
  const orderCard = button.closest("[data-order-card]");
  const trackingCode = orderCard && orderCard.querySelector(".admin-order-top .eyebrow")?.textContent.replace(/^ORDER\s+/i, "");
  if (!window.confirm("Permanently delete order " + (trackingCode || orderId) + "? It will disappear from the admin history and its customer tracking link will no longer work.")) return;
  button.disabled = true;
  button.textContent = "Deleting…";
  try {
    await adminFetch("/api/admin/orders/" + encodeURIComponent(orderId) + "/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    dashboardNotice.textContent = "Order deleted from the store history.";
    await loadOrders();
  } catch (error) {
    dashboardNotice.textContent = error.message;
    button.disabled = false;
    button.textContent = "Delete order";
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (window.location.protocol === "file:") {
    loginNotice.textContent = "This page is opened as a local file, so the secure order server cannot connect. Open https://gurunanakstore.shop/admin.html to view live orders.";
    return;
  }
  if (!ADMIN_API_URL) {
    loginNotice.textContent = "Order server is not connected yet. Deploy the server, then add its HTTPS address to js/payment-config.js.";
    return;
  }
  const passwordInput = loginForm.elements.password;
  const password = passwordInput.value;
  const button = loginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = "Checking password…";
  loginNotice.textContent = "";
  try {
    const response = await fetch(ADMIN_API_URL + "/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.authenticated || !result.token) throw new Error(result.error || "Could not sign in.");
    ownerSessionToken = result.token;
    passwordInput.value = "";
    loginPanel.hidden = true;
    dashboard.hidden = false;
    await loadOrders();
    orderRefreshTimer = window.setInterval(loadOrders, 30000);
  } catch (error) {
    loginNotice.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Open my orders";
  }
});

if (window.location.protocol === "file:") {
  loginNotice.textContent = "For live orders, open this admin page from https://gurunanakstore.shop/admin.html, not from a local file.";
}

document.querySelector("[data-admin-refresh]").addEventListener("click", loadOrders);
document.querySelector("[data-admin-logout]").addEventListener("click", () => showLogin("You are signed out."));
