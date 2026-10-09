/* Public order page. It only receives status and amount, never customer details. */
"use strict";

const ORDER_API_URL = String(window.GURUNANAK_API_URL || window.GURUNANAK_PHONEPE_API_URL || "").replace(/\/+$/, "");
const orderParams = new URLSearchParams(window.location.search);
const trackingCode = String(orderParams.get("trackingCode") || "").trim().toUpperCase();
const orderId = orderParams.get("orderId") || "";
const orderReferenceValue = trackingCode || orderId;
const lookupParameter = trackingCode ? "trackingCode" : "orderId";
const validTrackingCode = /^GS-[A-HJ-NP-Z2-9]{16}$/.test(trackingCode);
const validOrderId = /^[A-Za-z0-9_-]{24}$/.test(orderId);
const orderTitle = document.querySelector("[data-order-title]");
const orderMessage = document.querySelector("[data-order-message]");
const orderIcon = document.querySelector("[data-order-icon]");
const orderReference = document.querySelector("[data-order-reference]");
const orderAmount = document.querySelector("[data-order-amount]");
const refreshButton = document.querySelector("[data-order-refresh]");
const saveToOrdersLink = document.querySelector("[data-save-to-orders]");
let pollTimer = 0;
let requestInFlight = false;

orderReference.textContent = orderReferenceValue || "Not provided";
if (saveToOrdersLink && (validTrackingCode || validOrderId)) {
  saveToOrdersLink.href = "orders.html?" + lookupParameter + "=" + encodeURIComponent(orderReferenceValue);
}

function setOrderState(state, title, message, amountText) {
  orderIcon.dataset.state = state;
  orderIcon.innerHTML = state === "confirmed" ? "<span>✓</span>" : state === "failed" ? "<span>×</span>" : "<span>…</span>";
  orderTitle.textContent = title;
  orderMessage.textContent = message;
  orderAmount.textContent = amountText || "";
}

async function checkOrder() {
  if (!ORDER_API_URL) {
    setOrderState("pending", "Tracking is not connected yet.", "Contact GurunanakStore on WhatsApp and share the order reference above. Online tracking will work after the store connects its order server.");
    return;
  }
  if (!(validTrackingCode || validOrderId)) {
    setOrderState("failed", "This order link is incomplete.", "Open the tracking link from your order message, or enter the reference code on the My Orders page.");
    return;
  }
  if (requestInFlight) return;
  requestInFlight = true;
  refreshButton.disabled = true;
  try {
    const response = await fetch(ORDER_API_URL + "/api/orders/status?" + lookupParameter + "=" + encodeURIComponent(orderReferenceValue), { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "We could not check your order right now.");

    if (result.status === "APPROVED") {
      const codOrder = result.paymentMethod === "COD";
      setOrderState("confirmed", codOrder ? "Your COD order is approved!" : "Your order is approved!", codOrder
        ? "GurunanakStore accepted your cash-on-delivery order. Please pay in cash when it is delivered."
        : "GurunanakStore has reviewed your order and confirmed your payment. We’ll contact you using the details you sent with the order.", (codOrder ? "Cash due on delivery: ₹" : "Order amount: ₹") + Number(result.amountRupees).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      window.clearInterval(pollTimer);
    } else {
      const codOrder = result.paymentMethod === "COD";
      setOrderState("pending", codOrder ? "Your COD request is waiting for approval." : "Your order is waiting for approval.", codOrder
        ? "The store will review your order. No advance UPI payment is needed; pay cash if the store accepts your order and delivers it."
        : "The store will check your order and payment. This page checks for an update automatically every 10 seconds. Please do not pay again while you wait.", (codOrder ? "Cash due on delivery: ₹" : "Order amount: ₹") + Number(result.amountRupees).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
  } catch (error) {
    setOrderState("pending", "We couldn’t check the latest status yet.", (error.message || "Please try again in a moment.") + " You can use the button below to check again.");
  } finally {
    requestInFlight = false;
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", checkOrder);
if (ORDER_API_URL && (validTrackingCode || validOrderId)) {
  checkOrder();
  pollTimer = window.setInterval(checkOrder, 10000);
} else {
  checkOrder();
}
