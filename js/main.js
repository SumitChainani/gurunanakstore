/*
  GurunanakStore storefront
  -------------------------
  This file runs the product cards, filters, browser cart, UPI checkout, and menus.
  The cart stays on this device in localStorage; order details go to WhatsApp
  so the store can manually confirm delivery and any UPI payment.
*/

const STORE_NAME = "GurunanakStore";
const STORE_PHONE = "918815960890";
const PHONEPE_DISCOUNT_PERCENT = 10;
const CART_STORAGE_KEY = "gurunanakAccessoriesCart";
const PHONEPE_RETURN_STORAGE_KEY = "gurunanakPhonePePendingOrder";
const UPI_PENDING_ORDER_KEY = "gurunanakPendingUPIOrder";
const PHONEPE_API_BASE_URL = String(window.GURUNANAK_PHONEPE_API_URL || "").replace(/\/+$/, "");
const STORE_UPI_ID = String(window.GURUNANAK_UPI_ID || "").trim();
const STORE_UPI_PAYEE_NAME = String(window.GURUNANAK_UPI_PAYEE_NAME || STORE_NAME).trim();

function formatPrice(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function formatExactPrice(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

// Build a standard UPI payment link. The payee and amount are sent to the UPI
// app; this direct transfer does not provide automatic payment verification.
function buildUPIPaymentUri(upiId, payeeName, amountRupees, orderReference) {
  const parameters = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    tr: orderReference,
    tn: STORE_NAME + " order " + orderReference,
    am: Number(amountRupees).toFixed(2),
    cu: "INR"
  });
  return "upi://pay?" + parameters.toString();
}

function getPendingUPIOrder(amountRupees) {
  try {
    const pending = JSON.parse(sessionStorage.getItem(UPI_PENDING_ORDER_KEY) || "null");
    const age = pending && Date.now() - Number(pending.createdAt);
    const isRecent = pending && age >= 0 && age < 24 * 60 * 60 * 1000;
    if (isRecent && pending.amountRupees === amountRupees && /^GS\d{10}$/.test(pending.orderReference)) {
      return pending;
    }
    sessionStorage.removeItem(UPI_PENDING_ORDER_KEY);
  } catch (error) {
    // Browser storage is optional; a fresh order reference is enough.
  }
  return null;
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

// Keep regular cart prices unchanged; this breakdown is used only when paying
// through the PhonePe checkout option. Totals are calculated in paise.
function phonePePaymentTotal(items) {
  const subtotalPaise = items.reduce((total, item) => total + item.product.price * item.quantity * 100, 0);
  const payablePaise = Math.round(subtotalPaise * (100 - PHONEPE_DISCOUNT_PERCENT) / 100);
  return {
    subtotal: subtotalPaise / 100,
    discount: (subtotalPaise - payablePaise) / 100,
    payable: payablePaise / 100
  };
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

function productGalleryImages(product) {
  if (Array.isArray(product.gallery) && product.gallery.length) return product.gallery;
  return [{ src: product.image, alt: product.alt }];
}

function productCard(product) {
  const productName = escapeHTML(product.name);
  const cardImage = productGalleryImages(product)[0];
  return [
    '<article class="product-card">',
    '<a class="product-image-link" href="product.html?id=' + product.id + '" aria-label="View ' + productName + '">',
    '<div class="product-image-wrap"><img src="' + escapeHTML(cardImage.src) + '" alt="' + escapeHTML(cardImage.alt) + '" />',
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
  const galleryImages = productGalleryImages(product);
  const firstGalleryImage = galleryImages[0];
  document.title = productTitle;
  updateMeta('meta[name="description"]', productDescription);
  updateMeta('meta[property="og:title"]', productTitle);
  updateMeta('meta[property="og:description"]', productDescription);
  updateMeta('meta[property="og:image"]', firstGalleryImage.src);
  updateMeta('meta[property="og:image:alt"]', firstGalleryImage.alt);

  const galleryThumbnails = galleryImages.length > 1 ? [
    '<div class="product-gallery-thumbnails" role="group" aria-label="Product photos">',
    galleryImages.map((image, index) => [
      '<button class="product-gallery-thumbnail' + (index === 0 ? ' is-active' : '') + '" type="button" data-gallery-image="' + index + '" aria-label="Show photo ' + (index + 1) + ' of ' + escapeHTML(product.name) + '" aria-pressed="' + (index === 0) + '">',
      '<img src="' + escapeHTML(image.src) + '" alt="" />',
      '</button>'
    ].join("")).join(""),
    '</div>'
  ].join("") : '';

  target.innerHTML = [
    '<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">/</span><a href="shop.html">Shop</a><span aria-hidden="true">/</span><span>' + escapeHTML(product.name) + '</span></nav>',
    '<section class="product-detail">',
    '<div class="product-detail-media"><div class="product-detail-image"><img data-product-main-image src="' + escapeHTML(firstGalleryImage.src) + '" alt="' + escapeHTML(firstGalleryImage.alt) + '" /></div>' + galleryThumbnails + '</div>',
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
  target.querySelectorAll("[data-gallery-image]").forEach((button) => {
    button.addEventListener("click", () => {
      const selectedImage = galleryImages[Number(button.dataset.galleryImage)];
      const mainImage = target.querySelector("[data-product-main-image]");
      mainImage.src = selectedImage.src;
      mainImage.alt = selectedImage.alt;
      target.querySelectorAll("[data-gallery-image]").forEach((thumbnail) => {
        const isSelected = thumbnail === button;
        thumbnail.classList.toggle("is-active", isSelected);
        thumbnail.setAttribute("aria-pressed", String(isSelected));
      });
    });
  });
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
    '<article class="cart-item"><img src="' + escapeHTML(productGalleryImages(product)[0].src) + '" alt="' + escapeHTML(productGalleryImages(product)[0].alt) + '" />',
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

function renderCheckoutPage() {
  const target = document.querySelector("[data-checkout-page]");
  if (!target) return;
  if (renderPhonePeReturnPage(target)) return;
  const items = cartItems();

  if (!items.length) {
    target.innerHTML = '<section class="empty-cart section"><span class="empty-icon" aria-hidden="true">GS</span><p class="eyebrow eyebrow-dark">Checkout</p><h1>Your cart is empty.</h1><p>Add an accessory before continuing to checkout.</p><a class="button button-gold" href="shop.html">Explore accessories <span aria-hidden="true">→</span></a></section>';
    return;
  }

  const shortOrder = items.map((item) => item.quantity + " × " + item.product.name).join(", ");
  const paymentTotal = phonePePaymentTotal(items);
  const pendingUPIOrder = getPendingUPIOrder(paymentTotal.payable);
  const orderReference = pendingUPIOrder ? pendingUPIOrder.orderReference : "GS" + Date.now().toString().slice(-10);
  const summaryRows = items.map(({ product, quantity }) => '<div class="summary-line"><span>' + quantity + ' × ' + escapeHTML(product.name) + '</span><strong>' + formatPrice(product.price * quantity) + '</strong></div>').join("");
  target.innerHTML = [
    '<section class="checkout-page section"><div class="checkout-intro"><p class="eyebrow eyebrow-dark">Almost there</p><h1>Let’s get you<br />ready to ride.</h1>',
    '<p>Share your delivery details, then continue to PhonePe for secure payment. You can also send the order to us on WhatsApp.</p>',
    '<p><a class="text-link text-link-dark" href="cart.html">← Back to your cart</a></p>',
    '<aside class="order-summary checkout-summary"><p class="eyebrow eyebrow-dark">Your order</p>' + summaryRows,
    '<div class="summary-line"><span>Delivery</span><strong>Confirm with support first</strong></div>',
    '<div class="summary-total"><span>Items subtotal</span><strong>' + formatPrice(paymentTotal.subtotal) + '</strong></div>',
    '<p class="summary-note">WhatsApp orders use the regular price. Pay through the PhonePe button below to get 10% off every product.</p></aside></div>',
    '<form class="checkout-form" data-checkout-form>',
    '<div class="form-grid"><label>Full name<input name="name" autocomplete="name" placeholder="Your full name" required /></label>',
    '<label>Phone number<input name="phone" autocomplete="tel" inputmode="numeric" pattern="[0-9]{10}" maxlength="10" placeholder="10-digit mobile number" required /></label></div>',
    '<label>Delivery address<textarea name="address" autocomplete="street-address" placeholder="House number, street, area, city, state and PIN code" required></textarea></label>',
    '<section class="phonepe-payment-panel" aria-labelledby="phonepe-heading"><p class="eyebrow eyebrow-dark">UPI PAYMENT</p><h2 id="phonepe-heading"><span class="phonepe-mark" aria-hidden="true">पे</span> Pay with PhonePe</h2>',
    '<p>Get 10% off every product when you pay through this PhonePe button. On your phone, choose PhonePe if an app chooser appears, then check the payee and discounted amount before approving.</p>',
    '<div class="phonepe-discount-breakdown"><div><span>Items subtotal</span><strong>' + formatPrice(paymentTotal.subtotal) + '</strong></div><div><span>PhonePe discount (' + PHONEPE_DISCOUNT_PERCENT + '%)</span><strong>−' + formatExactPrice(paymentTotal.discount) + '</strong></div><div class="phonepe-payable"><span>Pay with PhonePe</span><strong>' + formatExactPrice(paymentTotal.payable) + '</strong></div></div>',
    '<input type="hidden" name="orderReference" value="' + orderReference + '" />',
    '<button class="button button-phonepe button-wide" type="button" data-upi-pay' + (STORE_UPI_ID ? '' : ' disabled') + '>Pay ' + formatExactPrice(paymentTotal.payable) + ' with PhonePe <span aria-hidden="true">↗</span></button>',
    '<p class="payment-status-note" data-upi-message role="status" aria-live="polite">Payee: ' + escapeHTML(STORE_UPI_PAYEE_NAME) + ' · UPI ID: ' + escapeHTML(STORE_UPI_ID || 'Not configured') + '</p>',
    '<div class="manual-qr-panel"><p class="eyebrow eyebrow-dark">SCAN FROM ANOTHER DEVICE</p><h3>PhonePe Business QR</h3>',
    '<img class="phonepe-merchant-qr" src="images/phonepe-merchant-qr.jpeg" alt="GurunanakStore PhonePe merchant QR code for manual UPI payment" width="853" height="1600" loading="lazy" />',
    '<p class="manual-qr-amount">PhonePe amount after 10% discount: <strong data-manual-qr-total>' + formatExactPrice(paymentTotal.payable) + '</strong></p>',
    '<p class="manual-qr-warning">This photo is a fixed QR, so it cannot fill in the amount automatically. Enter the discounted amount shown above when you scan it. The button above fills in the amount for you. Delivery is separate and must be confirmed. Direct UPI payments are checked manually.</p>',
    '<a class="text-link text-link-dark" href="images/phonepe-merchant-qr.jpeg" download="gurunanakstore-phonepe-qr.jpeg">Save QR image to another device</a></div></section>',
    '<label class="payment-reference-label">PhonePe transaction reference (optional, if you already paid)<input name="paymentReference" maxlength="50" placeholder="Enter the transaction ID shown in PhonePe" /></label>',
    '<button class="button button-outline button-wide whatsapp-order-button" type="submit">Send order by WhatsApp <span aria-hidden="true">↗</span></button>',
    '<p class="order-confirmation-note">WhatsApp orders are for manual confirmation and do not count as paid. Never share your UPI PIN or OTP with anyone.</p>',
    '<p class="order-confirmation-note">Order summary: ' + escapeHTML(shortOrder) + '</p></form></section>'
  ].join("");

  target.querySelector("[data-checkout-form]").addEventListener("submit", submitOrder);
  target.querySelector("[data-upi-pay]").addEventListener("click", startUPIPayment);
}

function startUPIPayment(event) {
  const button = event.currentTarget;
  const target = document.querySelector("[data-checkout-page]");
  const form = target && target.querySelector("[data-checkout-form]");
  if (!STORE_UPI_ID || !form || !form.reportValidity()) return;

  const items = cartItems();
  if (!items.length) {
    showToast("Your cart is empty.");
    renderCheckoutPage();
    return;
  }

  const formData = new FormData(form);
  const orderReference = String(formData.get("orderReference") || "GS" + Date.now().toString().slice(-10));
  const amount = phonePePaymentTotal(items).payable;
  const paymentUri = buildUPIPaymentUri(STORE_UPI_ID, STORE_UPI_PAYEE_NAME, amount, orderReference);
  const upiOrder = {
    orderReference,
    amountRupees: amount,
    createdAt: Date.now()
  };

  try {
    sessionStorage.setItem(UPI_PENDING_ORDER_KEY, JSON.stringify(upiOrder));
  } catch (error) {
    // Keep the payment option usable when browser storage is disabled.
  }

  const status = target.querySelector("[data-upi-message]");
  button.disabled = true;
  button.textContent = "Opening your UPI app…";
  status.textContent = "Order " + orderReference + " · Amount " + formatExactPrice(amount) + ". If prompted, select PhonePe. Check the payee name and amount in the app before paying.";
  window.location.assign(paymentUri);

  window.setTimeout(() => {
    button.disabled = false;
    button.innerHTML = 'Pay ' + formatExactPrice(amount) + ' with PhonePe <span aria-hidden="true">↗</span>';
    status.textContent = "If an app did not open, scan the QR image from another device and enter " + formatExactPrice(amount) + ". Send your order and UPI transaction reference to us on WhatsApp. UPI payments are checked manually.";
  }, 1800);
}

async function startPhonePeCheckout(event) {
  const button = event.currentTarget;
  const target = document.querySelector("[data-checkout-page]");
  const form = target && target.querySelector("[data-checkout-form]");
  if (!PHONEPE_API_BASE_URL || !form || !form.reportValidity()) return;

  const items = cartItems();
  if (!items.length) {
    showToast("Your cart is empty.");
    renderCheckoutPage();
    return;
  }

  const formData = Object.fromEntries(new FormData(form));
  const customer = {
    name: formData.name.trim(),
    phone: formData.phone.trim(),
    address: formData.address.trim()
  };
  button.disabled = true;
  button.textContent = "Connecting to PhonePe…";

  try {
    const response = await fetch(PHONEPE_API_BASE_URL + "/api/payments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map(({ product, quantity }) => ({ productId: product.id, quantity }))
      })
    });
    const result = await response.json();
    if (!response.ok || !result.redirectUrl || !result.merchantOrderId || !Number.isSafeInteger(Number(result.amount))) {
      throw new Error(result.error || "PhonePe could not start this payment. Please try again or contact us.");
    }

    const pendingOrder = {
      merchantOrderId: result.merchantOrderId,
      amountPaise: Number(result.amount),
      customer,
      items: items.map(({ product, quantity }) => ({
        name: product.name,
        price: product.price,
        quantity
      })),
      createdAt: Date.now()
    };
    sessionStorage.setItem(PHONEPE_RETURN_STORAGE_KEY, JSON.stringify(pendingOrder));
    window.location.assign(result.redirectUrl);
  } catch (error) {
    showToast(error.message || "Unable to connect to PhonePe. Please try again.");
    button.disabled = false;
    button.innerHTML = 'Continue to PhonePe <span aria-hidden="true">↗</span>';
  }
}

function renderPhonePeReturnPage(target) {
  const params = new URLSearchParams(window.location.search);
  const merchantOrderId = params.get("merchantOrderId");
  if (params.get("payment") !== "return" || !merchantOrderId) return false;

  target.innerHTML = [
    '<section class="payment-result section"><p class="eyebrow eyebrow-dark">PHONEPE CHECKOUT</p>',
    '<h1 data-phonepe-result-title>Checking your payment.</h1>',
    '<p class="payment-result-copy" data-phonepe-result-message>We’re asking PhonePe to confirm the latest status. Please keep this page open.</p>',
    '<p class="payment-reference">Order reference: <code>' + escapeHTML(merchantOrderId) + '</code></p>',
    '<button class="button button-phonepe" type="button" data-phonepe-check-status>Check payment status again</button>',
    '<a class="button button-gold" data-phonepe-whatsapp hidden target="_blank" rel="noopener noreferrer">Send delivery details on WhatsApp <span aria-hidden="true">↗</span></a>',
    '<a class="text-link text-link-dark" href="shop.html">Continue shopping <span aria-hidden="true">→</span></a>',
    '</section>'
  ].join("");

  const title = target.querySelector("[data-phonepe-result-title]");
  const message = target.querySelector("[data-phonepe-result-message]");
  const retryButton = target.querySelector("[data-phonepe-check-status]");
  const whatsappButton = target.querySelector("[data-phonepe-whatsapp]");
  let orderContext = null;
  try {
    orderContext = JSON.parse(sessionStorage.getItem(PHONEPE_RETURN_STORAGE_KEY) || "null");
  } catch (error) {
    orderContext = null;
  }

  async function checkStatus() {
    if (!PHONEPE_API_BASE_URL) {
      title.textContent = "Payment status needs checking.";
      message.textContent = "The PhonePe status service is not configured yet. Contact GurunanakStore and share the order reference above before paying again.";
      return;
    }

    retryButton.disabled = true;
    message.textContent = "Checking with PhonePe…";
    try {
      const response = await fetch(PHONEPE_API_BASE_URL + "/api/payments/status?merchantOrderId=" + encodeURIComponent(merchantOrderId));
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "PhonePe status could not be checked.");

      const matchingOrder = orderContext && orderContext.merchantOrderId === merchantOrderId;
      if (result.state === "COMPLETED" && matchingOrder && Number(result.amount) === Number(orderContext.amountPaise)) {
        title.textContent = "Payment confirmed.";
        message.textContent = "PhonePe confirmed this payment. Send the delivery details below so GurunanakStore can prepare your order.";
        const itemLines = orderContext.items.map((item) => "- " + item.name + " x " + item.quantity + " — " + formatPrice(item.price * item.quantity)).join("\n");
        const orderSubtotal = orderContext.items.reduce((total, item) => total + item.price * item.quantity, 0);
        const orderDiscount = orderSubtotal - orderContext.amountPaise / 100;
        const orderMessage = "Namaste " + STORE_NAME + ", my PhonePe payment is confirmed.\n\n" +
          "Order reference: " + merchantOrderId + "\n" + itemLines + "\n\n" +
          "Items subtotal: " + formatPrice(orderSubtotal) + "\n" +
          "PhonePe discount (10%): −" + formatExactPrice(orderDiscount) + "\n" +
          "Paid through PhonePe: " + formatExactPrice(orderContext.amountPaise / 100) + "\n" +
          "Name: " + orderContext.customer.name + "\n" +
          "Phone: " + orderContext.customer.phone + "\n" +
          "Delivery address: " + orderContext.customer.address + "\n\n" +
          "Please confirm delivery availability and timing.";
        whatsappButton.href = whatsappUrl(orderMessage);
        whatsappButton.hidden = false;
        localStorage.removeItem(CART_STORAGE_KEY);
        updateCartCount();
      } else if (result.state === "COMPLETED") {
        title.textContent = "PhonePe reports payment completed.";
        message.textContent = "This browser does not have the matching order details. Do not pay again. Contact GurunanakStore and share the reference above.";
      } else if (result.state === "PENDING") {
        title.textContent = "Payment is still pending.";
        message.textContent = "PhonePe has not confirmed completion yet. Wait a little, then check the status again. Do not pay twice while it is pending.";
      } else if (result.state === "FAILED") {
        title.textContent = "Payment was not completed.";
        message.textContent = "PhonePe reports this payment failed. Return to your cart to try again, or contact us on WhatsApp.";
      } else {
        title.textContent = "Payment status needs checking.";
        message.textContent = "PhonePe returned status “" + String(result.state || "unknown") + "”. Contact GurunanakStore before trying to pay again.";
      }
    } catch (error) {
      title.textContent = "We couldn’t check the payment yet.";
      message.textContent = (error.message || "Please wait a moment and try again.") + " Don’t retry payment until you know whether the first attempt completed.";
    } finally {
      retryButton.disabled = false;
    }
  }

  retryButton.addEventListener("click", checkStatus);
  checkStatus();
  return true;
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
  const orderNumber = String(details.orderReference || "GS" + Date.now().toString().slice(-10));
  const itemLines = items.map(({ product, quantity }) => "- " + product.name + " x " + quantity + " — " + formatPrice(product.price * quantity)).join("\n");
  const message = "Namaste " + STORE_NAME + ", I would like to place an order.\n\n" +
    "Order reference: " + orderNumber + "\n\n" + itemLines + "\n\n" +
    "Items total: " + formatPrice(cartTotal()) + "\n" +
    "PhonePe offer: 10% off every product when paid through the PhonePe button (discounted items total " + formatExactPrice(phonePePaymentTotal(items).payable) + "). It does not apply to a regular WhatsApp order.\n" +
    "Delivery: Please confirm the availability and charge for my address.\n" +
    "Payment: Please verify any PhonePe / UPI transfer manually before marking this order paid.\n" +
    "PhonePe transaction reference (if already paid): " + (details.paymentReference.trim() || "Not provided") + "\n\n" +
    "Name: " + details.name + "\n" +
    "Phone: " + details.phone + "\n" +
    "Delivery address: " + details.address + "\n\n" +
    "Please confirm stock, fit, delivery charge, and final total before payment.";
  try {
    sessionStorage.removeItem(UPI_PENDING_ORDER_KEY);
  } catch (error) {
    // The WhatsApp order still works when browser storage is unavailable.
  }
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
