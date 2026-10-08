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
    ordersContainer.innerHTML = '<div class="admin-empty"><span class="empty-icon" aria-hidden="true">GS</span><h2>No orders yet</h2><p>New website orders will appear here after order tracking is connected.</p></div>';
    return;
  }

  ordersContainer.innerHTML = orders.map((order) => {
    const itemRows = order.items.map((item) => '<li><span>' + escapeAdminHTML(item.name) + ' × ' + Number(item.quantity) + '</span><strong>' + adminPrice(Number(item.unitPrice) * Number(item.quantity)) + '</strong></li>').join("");
    const created = new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    const phoneDigits = String(order.customer.phone).replace(/\D/g, "");
    const isApproved = order.status === "APPROVED";
    const paymentReference = order.paymentReference
      ? '<p><span>Transaction reference</span><strong>' + escapeAdminHTML(order.paymentReference) + '</strong></p>'
      : '<p><span>Transaction reference</span><strong>Customer has not entered one</strong></p>';
    return '<article class="admin-order-card" data-order-card="' + escapeAdminHTML(order.orderId) + '">' +
      '<div class="admin-order-top"><div><p class="eyebrow eyebrow-dark">ORDER ' + escapeAdminHTML(order.orderId) + '</p><span class="admin-order-date">' + escapeAdminHTML(created) + '</span></div>' +
      '<span class="admin-order-state ' + (isApproved ? 'is-approved' : 'is-pending') + '">' + (isApproved ? 'Approved' : 'Needs review') + '</span></div>' +
      '<div class="admin-order-columns"><section><h2>Customer</h2><p><strong>' + escapeAdminHTML(order.customer.name) + '</strong></p><p><a href="tel:+91' + encodeURIComponent(phoneDigits) + '">' + escapeAdminHTML(order.customer.phone) + '</a></p><p class="admin-order-address">' + escapeAdminHTML(order.customer.address) + '</p>' + paymentReference + '<p><span>UPI QR reference</span><strong>' + escapeAdminHTML(order.checkoutReference) + '</strong></p></section>' +
      '<section><h2>Items</h2><ul class="admin-item-list">' + itemRows + '</ul><div class="admin-order-total"><span>Items total</span><strong>' + adminPrice(order.subtotalRupees) + '</strong></div><div class="admin-order-total"><span>PhonePe discount</span><strong>−' + adminPrice(order.discountRupees) + '</strong></div><div class="admin-order-total admin-order-payable"><span>QR amount</span><strong>' + adminPrice(order.amountRupees) + '</strong></div></section></div>' +
      (isApproved
        ? '<p class="admin-approved-note">Order approved on ' + escapeAdminHTML(new Date(order.confirmedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })) + '.</p>'
        : '<button class="button button-gold admin-approve-button" type="button" data-approve-order="' + escapeAdminHTML(order.orderId) + '" ' + (order.paymentReference ? '' : 'disabled title="Ask the customer for their transaction reference first."') + '>Confirm payment & approve order</button>' + (order.paymentReference ? '<p class="admin-order-reminder">Check this reference in PhonePe Business before approving. The website cannot verify QR transfers by reference alone.</p>' : '<p class="admin-order-reminder">Ask the customer for their PhonePe transaction reference before approving.</p>')) +
      '</article>';
  }).join("");

  ordersContainer.querySelectorAll("[data-approve-order]").forEach((button) => {
    button.addEventListener("click", approveOrder);
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
  if (!window.confirm("Have you checked that this payment reached your PhonePe Business account? Approving updates the customer's order page.")) return;
  button.disabled = true;
  button.textContent = "Saving approval…";
  try {
    await adminFetch("/api/admin/orders/" + encodeURIComponent(orderId) + "/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    dashboardNotice.textContent = "Order approved. The customer’s tracking page will update automatically.";
    await loadOrders();
  } catch (error) {
    dashboardNotice.textContent = error.message;
    button.disabled = false;
    button.textContent = "Confirm payment & approve order";
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
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

document.querySelector("[data-admin-refresh]").addEventListener("click", loadOrders);
document.querySelector("[data-admin-logout]").addEventListener("click", () => showLogin("You are signed out."));
