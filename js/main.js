/*
  GurunanakStore storefront
  -------------------------
  This file runs the product cards, filters, browser cart, checkout, and menus.
  The cart stays on this device in localStorage; orders are sent to WhatsApp.
*/

const STORE_NAME = "GurunanakStore";
const STORE_PHONE = "918815960890";
const CART_STORAGE_KEY = "gurunanakAccessoriesCart";
const STORE_UPI_ID = "ADD-UPI-ID-HERE";
const STORE_UPI_QR_IMAGE = "images/upi-qr-placeholder.svg";

function formatPrice(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function getCart() {
  try {
    const savedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || {};
    const cleanCart = {};
    Object.entries(savedCart).forEach(([id, quantity]) => {
      const product = findProduct(id);
      const safeQuantity = Math.floor(Number(quantity));
      if (product && Number.isFinite(safeQuantity) && safeQuantity > 0) {
        cleanCart[product.id] = safeQuantity;
      }
    });
    return cleanCart;
  } catch (error) {
    return {};
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    showToast("Your browser could not save this cart. You can still send your order on WhatsApp.");
  }
  updateCartCount();
}

function cartItems() {
  const cart = getCart();
  return Object.entries(cart).map(([id, quantity]) => ({
    product: findProduct(id),
    quantity: quantity
  })).filter((item) => item.product);
}

function cartTotal() {
  return cartItems().reduce((total, item) => total + item.product.price * item.quantity, 0);
}

function updateCartCount() {
  const count = cartItems().reduce((total, item) => total + item.quantity, 0);
  document.querySelectorAll("[data-cart-count]").forEach((element) => {
    element.textContent = count;
    element.hidden = count === 0;
  });
}

function addToCart(productId, quantity) {
  const product = findProduct(productId);
  if (!product) return;
  const cart = getCart();
  const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
  cart[product.id] = (Number(cart[product.id]) || 0) + safeQuantity;
  saveCart(cart);
  showToast(product.name + " added to your cart.");
}

function changeQuantity(productId, change) {
  const product = findProduct(productId);
  if (!product) return;
  const cart = getCart();
  const nextQuantity = (Number(cart[product.id]) || 0) + Number(change);
  if (nextQuantity <= 0) {
    delete cart[product.id];
  } else {
    cart[product.id] = nextQuantity;
  }
  saveCart(cart);
}

function removeFromCart(productId) {
  const cart = getCart();
  delete cart[productId];
  saveCart(cart);
}

function productCard(product) {
  const productName = escapeHTML(product.name);
  return [
    '<article class="product-card">',
    '<a class="product-image-link" href="product.html?id=' + product.id + '" aria-label="View ' + productName + '">',
    '<div class="product-image-wrap"><img src="' + escapeHTML(product.image) + '" alt="' + escapeHTML(product.alt) + '" />',
    '<span class="product-badge">' + escapeHTML(product.badge) + '</span></div></a>',
    '<div class="product-card-body"><p class="product-category">' + escapeHTML(product.category) + '</p>',
    '<h3><a href="product.html?id=' + product.id + '">' + productName + '</a></h3>',
    '<p class="product-card-copy">' + escapeHTML(product.shortDescription) + '</p>',
    '<div class="product-card-bottom"><strong>' + formatPrice(product.price) + '</strong>',
    '<button class="button button-small button-outline" type="button" data-add-product="' + product.id + '">Add</button>',
    '</div></div></article>'
  ].join("");
}

function initHomeProducts() {
  const featuredGrid = document.querySelector("[data-featured-products]");
  if (featuredGrid) {
    featuredGrid.innerHTML = PRODUCTS.slice(0, 4).map(productCard).join("");
  }
}

function initShop() {
  const grid = document.querySelector("[data-shop-products]");
  if (!grid) return;
  const search = document.querySelector("[data-product-search]");
  const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
  const noProducts = document.querySelector("[data-no-products]");
  const requestedCategory = new URLSearchParams(window.location.search).get("category");
  let activeFilter = filterButtons.some((button) => button.dataset.filter === requestedCategory) ? requestedCategory : "All";
  let searchTerm = "";

  function render() {
    const visibleProducts = PRODUCTS.filter((product) => {
      const categoryMatches = activeFilter === "All" || product.category === activeFilter;
      const searchContent = (product.name + " " + product.category + " " + product.shortDescription).toLowerCase();
      return categoryMatches && searchContent.includes(searchTerm);
    });
    grid.innerHTML = visibleProducts.map(productCard).join("");
    noProducts.hidden = visibleProducts.length > 0;
  }

  filterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === activeFilter);
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      render();
    });
  });

  search.addEventListener("input", (event) => {
    searchTerm = event.target.value.trim().toLowerCase();
    render();
  });
  render();
}

function updateMeta(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.setAttribute("content", value);
}

function initProductPage() {
  const target = document.querySelector("[data-product-detail]");
  if (!target) return;
  const id = new URLSearchParams(window.location.search).get("id");
  const product = findProduct(id);

  if (!product) {
    target.innerHTML = '<section class="not-found section"><p class="eyebrow eyebrow-dark">Product not found</p><h1>That accessory is not in the collection.</h1><p>Browse the shop to see the products currently listed.</p><a class="button button-gold" href="shop.html">Explore the shop <span aria-hidden="true">→</span></a></section>';
    return;
  }

  const productTitle = product.name + " | GurunanakStore";
  const productDescription = product.name + ": " + product.shortDescription + " Ask GurunanakStore to confirm fit and product details.";
  document.title = productTitle;
  updateMeta('meta[name="description"]', productDescription);
  updateMeta('meta[property="og:title"]', productTitle);
  updateMeta('meta[property="og:description"]', productDescription);
  updateMeta('meta[property="og:image"]', product.image);
  updateMeta('meta[property="og:image:alt"]', product.alt);

  target.innerHTML = [
    '<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">/</span><a href="shop.html">Shop</a><span aria-hidden="true">/</span><span>' + escapeHTML(product.name) + '</span></nav>',
    '<section class="product-detail">',
    '<div class="product-detail-image"><img src="' + escapeHTML(product.image) + '" alt="' + escapeHTML(product.alt) + '" /></div>',
    '<div class="product-detail-content"><p class="eyebrow eyebrow-dark">' + escapeHTML(product.category) + ' <span aria-hidden="true">·</span> ' + escapeHTML(product.badge) + '</p>',
    '<h1>' + escapeHTML(product.name) + '</h1><p class="detail-price">' + formatPrice(product.price) + '</p>',
    '<p class="detail-description">' + escapeHTML(product.description) + '</p>',
    '<dl class="product-specs"><div><dt>Fit and details</dt><dd>' + escapeHTML(product.fitment) + '</dd></div>',
    '<div><dt>Delivery</dt><dd>Charges and availability confirmed before payment</dd></div></dl>',
    '<div class="product-buy-row"><div class="quantity-control" aria-label="Product quantity">',
    '<button type="button" data-detail-quantity="-1" aria-label="Decrease quantity">−</button><span data-detail-quantity-value>1</span>',
    '<button type="button" data-detail-quantity="1" aria-label="Increase quantity">+</button></div>',
    '<button class="button button-gold" type="button" data-add-detail="' + product.id + '">Add to cart <span aria-hidden="true">→</span></button></div>',
    '<p class="fitment-note">Not sure this is the right fit? <a href="#" data-whatsapp-link data-wa-message="Hi GurunanakStore, can you help me check ' + escapeHTML(product.name) + ' for my bike?">Ask us on WhatsApp</a>.</p>',
    '</div></section><section class="related-section section"><div class="section-heading"><div><p class="eyebrow eyebrow-dark">Keep exploring</p><h2>More for your<br /><em>next ride.</em></h2></div><a class="text-link text-link-dark" href="shop.html">All accessories <span aria-hidden="true">→</span></a></div><div class="product-grid" data-related-products></div></section>'
  ].join("");

  const relatedProducts = PRODUCTS.filter((item) => item.id !== product.id).slice(0, 4);
  target.querySelector("[data-related-products]").innerHTML = relatedProducts.map(productCard).join("");
  target.querySelectorAll("[data-detail-quantity]").forEach((button) => {
    button.addEventListener("click", () => {
      const count = target.querySelector("[data-detail-quantity-value]");
      count.textContent = Math.max(1, Number(count.textContent) + Number(button.dataset.detailQuantity));
    });
  });
  target.querySelector("[data-add-detail]").addEventListener("click", () => {
    addToCart(product.id, target.querySelector("[data-detail-quantity-value]").textContent);
  });
  initWhatsAppLinks();
}

function renderCartPage() {
  const target = document.querySelector("[data-cart-page]");
  if (!target) return;
  const items = cartItems();

  if (!items.length) {
    target.innerHTML = '<section class="empty-cart section"><span class="empty-icon" aria-hidden="true">GS</span><p class="eyebrow eyebrow-dark">Your selection</p><h1>Your cart is waiting.</h1><p>Explore the collection and add the accessories you need for your next ride.</p><a class="button button-gold" href="shop.html">Explore accessories <span aria-hidden="true">→</span></a></section>';
    return;
  }

  const itemRows = items.map(({ product, quantity }) => [
    '<article class="cart-item"><img src="' + escapeHTML(product.image) + '" alt="' + escapeHTML(product.alt) + '" />',
    '<div class="cart-item-info"><p class="product-category">' + escapeHTML(product.category) + '</p><h3>' + escapeHTML(product.name) + '</h3><strong>' + formatPrice(product.price) + ' each</strong></div>',
    '<div class="cart-item-actions"><div class="quantity-control" aria-label="' + escapeHTML(product.name) + ' quantity">',
    '<button type="button" data-cart-change="' + product.id + '" data-change="-1" aria-label="Decrease ' + escapeHTML(product.name) + ' quantity">−</button><span>' + quantity + '</span>',
    '<button type="button" data-cart-change="' + product.id + '" data-change="1" aria-label="Increase ' + escapeHTML(product.name) + ' quantity">+</button></div>',
    '<button class="remove-button" type="button" data-remove-product="' + product.id + '">Remove</button></div>',
    '<strong class="cart-line-total">' + formatPrice(product.price * quantity) + '</strong></article>'
  ].join("")).join("");

  target.innerHTML = [
    '<section class="cart-page section"><div class="page-heading"><p class="eyebrow eyebrow-dark">Your selection</p><h1>Your cart.</h1></div>',
    '<div class="cart-layout"><div class="cart-list">' + itemRows + '</div>',
    '<aside class="order-summary"><p class="eyebrow eyebrow-dark">Order summary</p>',
    '<div class="summary-line"><span>Items (' + items.reduce((total, item) => total + item.quantity, 0) + ')</span><strong>' + formatPrice(cartTotal()) + '</strong></div>',
    '<div class="summary-line"><span>Delivery</span><strong>Confirm on WhatsApp</strong></div>',
    '<div class="summary-total"><span>Items total</span><strong>' + formatPrice(cartTotal()) + '</strong></div>',
    '<p class="summary-note">We’ll confirm stock, fit, delivery availability, and any delivery charge before payment.</p>',
    '<a class="button button-gold button-wide" href="checkout.html">Continue to checkout <span aria-hidden="true">→</span></a></aside></div></section>'
  ].join("");

  target.querySelectorAll("[data-cart-change]").forEach((button) => {
    button.addEventListener("click", () => {
      changeQuantity(button.dataset.cartChange, button.dataset.change);
      renderCartPage();
    });
  });
  target.querySelectorAll("[data-remove-product]").forEach((button) => {
    button.addEventListener("click", () => {
      removeFromCart(button.dataset.removeProduct);
      renderCartPage();
    });
  });
}

function isUpiIdConfigured() {
  return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(STORE_UPI_ID) && STORE_UPI_ID !== "ADD-UPI-ID-HERE";
}

function renderCheckoutPage() {
  const target = document.querySelector("[data-checkout-page]");
  if (!target) return;
  const items = cartItems();

  if (!items.length) {
    target.innerHTML = '<section class="empty-cart section"><span class="empty-icon" aria-hidden="true">GS</span><p class="eyebrow eyebrow-dark">Checkout</p><h1>Your cart is empty.</h1><p>Add an accessory before continuing to checkout.</p><a class="button button-gold" href="shop.html">Explore accessories <span aria-hidden="true">→</span></a></section>';
    return;
  }

  const shortOrder = items.map((item) => item.quantity + " × " + item.product.name).join(", ");
  const summaryRows = items.map(({ product, quantity }) => '<div class="summary-line"><span>' + quantity + ' × ' + escapeHTML(product.name) + '</span><strong>' + formatPrice(product.price * quantity) + '</strong></div>').join("");
  target.innerHTML = [
    '<section class="checkout-page section"><div class="checkout-intro"><p class="eyebrow eyebrow-dark">Almost there</p><h1>Let’s get you<br />ready to ride.</h1>',
    '<p>Share your delivery details. Your order and selected payment method will open in a message to our WhatsApp team.</p>',
    '<p><a class="text-link text-link-dark" href="cart.html">← Back to your cart</a></p>',
    '<aside class="order-summary checkout-summary"><p class="eyebrow eyebrow-dark">Your order</p>' + summaryRows,
    '<div class="summary-line"><span>Delivery</span><strong>Confirm on WhatsApp</strong></div>',
    '<div class="summary-total"><span>Items total</span><strong>' + formatPrice(cartTotal()) + '</strong></div>',
    '<p class="summary-note">Delivery charges are confirmed before payment.</p></aside></div>',
    '<form class="checkout-form" data-checkout-form>',
    '<div class="form-grid"><label>Full name<input name="name" autocomplete="name" placeholder="Your full name" required /></label>',
    '<label>Phone number<input name="phone" autocomplete="tel" inputmode="numeric" pattern="[0-9]{10}" maxlength="10" placeholder="10-digit mobile number" required /></label></div>',
    '<label>Delivery address<textarea name="address" autocomplete="street-address" placeholder="House number, street, area, city, state and PIN code" required></textarea></label>',
    '<fieldset class="payment-methods"><legend>How would you like to pay?</legend>',
    '<label class="payment-option"><input type="radio" name="payment" value="UPI" checked /><span><strong>UPI</strong><small>Pay from your UPI app after we confirm the order.</small></span><b>UPI</b></label>',
    '<label class="payment-option"><input type="radio" name="payment" value="Confirm payment details on WhatsApp" /><span><strong>I need help with payment</strong><small>We’ll discuss the payment options on WhatsApp.</small></span><b>HELP</b></label></fieldset>',
    '<div class="upi-box" data-upi-box><img src="' + escapeHTML(STORE_UPI_QR_IMAGE) + '" alt="Placeholder showing where the GurunanakStore UPI QR code will appear" />',
    '<div><strong>UPI payment details</strong><p>UPI ID: <code>' + escapeHTML(STORE_UPI_ID) + '</code></p>',
    '<small>Add your real UPI ID and its matching QR code before accepting payments.</small></div></div>',
    '<button class="button button-outline upi-pay-button" type="button" data-upi-pay>Open UPI app</button>',
    '<p class="order-confirmation-note">The UPI button works after a real UPI ID is added. No payment gateway is connected yet. Sending the WhatsApp order does not confirm that payment has been received.</p>',
    '<button class="button button-gold button-wide" type="submit">Send order on WhatsApp <span aria-hidden="true">↗</span></button>',
    '<p class="order-confirmation-note">Order summary: ' + escapeHTML(shortOrder) + '</p></form></section>'
  ].join("");

  target.querySelector("[data-checkout-form]").addEventListener("submit", submitOrder);
  target.querySelectorAll('input[name="payment"]').forEach((option) => {
    option.addEventListener("change", () => {
      target.querySelector("[data-upi-box]").hidden = option.value !== "UPI" || !option.checked;
      target.querySelector("[data-upi-pay]").hidden = option.value !== "UPI" || !option.checked;
    });
  });
  target.querySelector("[data-upi-pay]").addEventListener("click", () => {
    if (!isUpiIdConfigured()) {
      showToast("Add your real UPI ID in js/main.js before using UPI payment.");
      return;
    }
    const paymentUrl = "upi://pay?pa=" + encodeURIComponent(STORE_UPI_ID) +
      "&pn=" + encodeURIComponent(STORE_NAME) +
      "&am=" + encodeURIComponent(cartTotal()) +
      "&cu=INR&tn=" + encodeURIComponent("GurunanakStore bike accessories");
    window.location.href = paymentUrl;
  });
}

function whatsappUrl(message) {
  return "https://wa.me/" + STORE_PHONE + "?text=" + encodeURIComponent(message);
}

function openWhatsApp(message) {
  const newWindow = window.open(whatsappUrl(message), "_blank");
  if (newWindow) {
    newWindow.opener = null;
  } else {
    showToast("Allow pop-ups to open WhatsApp, then try again.");
  }
}

function submitOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const items = cartItems();
  if (!items.length) {
    renderCheckoutPage();
    showToast("Your cart is empty.");
    return;
  }
  const details = Object.fromEntries(new FormData(form));
  const orderNumber = "GS" + Date.now().toString().slice(-6);
  const itemLines = items.map(({ product, quantity }) => "- " + product.name + " x " + quantity + " — " + formatPrice(product.price * quantity)).join("\n");
  const message = "Namaste " + STORE_NAME + ", I would like to place an order.\n\n" +
    "Order reference: " + orderNumber + "\n\n" + itemLines + "\n\n" +
    "Items total: " + formatPrice(cartTotal()) + "\n" +
    "Delivery: Please confirm the availability and charge for my address.\n" +
    "Payment preference: " + details.payment + "\n\n" +
    "Name: " + details.name + "\n" +
    "Phone: " + details.phone + "\n" +
    "Delivery address: " + details.address + "\n\n" +
    "Please confirm stock, fit, delivery charge, and final total before payment.";
  openWhatsApp(message);
}

function initContactForm() {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const details = Object.fromEntries(new FormData(form));
    const message = "Hi " + STORE_NAME + ",\n\nName: " + details.name +
      "\nPhone: " + details.phone + "\nMessage: " + details.message;
    openWhatsApp(message);
  });
}

function initWhatsAppLinks() {
  document.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
    const message = link.dataset.waMessage || "Hi " + STORE_NAME + ", I have a question about bike accessories.";
    link.href = whatsappUrl(message);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });
}

function showToast(message) {
  const toast = document.querySelector("[data-toast]");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3000);
}

function initNavigation() {
  const button = document.querySelector("[data-menu-button]");
  const nav = document.querySelector("[data-site-nav]");
  if (!button || !nav) return;
  button.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    button.setAttribute("aria-expanded", String(isOpen));
    button.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    nav.classList.remove("open");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Open menu");
  }));
}

document.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-product]");
  if (addButton) addToCart(addButton.dataset.addProduct, 1);
});

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initWhatsAppLinks();
  initHomeProducts();
  initShop();
  initProductPage();
  renderCartPage();
  renderCheckoutPage();
  initContactForm();
  updateCartCount();
  document.querySelectorAll("[data-year]").forEach((element) => {
    element.textContent = new Date().getFullYear();
  });
});
