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
const PRODUCT_REVIEWS_STORAGE_KEY = "gurunanakProductReviews";
const ORDER_HISTORY_STORAGE_KEY = "gurunanakCustomerOrderHistory";
const API_BASE_URL = String(window.GURUNANAK_API_URL || window.GURUNANAK_PHONEPE_API_URL || "").replace(/\/+$/, "");
const PHONEPE_API_BASE_URL = String(window.GURUNANAK_PHONEPE_API_URL || API_BASE_URL).replace(/\/+$/, "");
const STORE_UPI_ID = String(window.GURUNANAK_UPI_ID || "").trim();
const STORE_UPI_PAYEE_NAME = String(window.GURUNANAK_UPI_PAYEE_NAME || STORE_NAME).trim();
const MOTION_REVEAL_SELECTOR = ".section-heading, .product-card, .brand-promise, .benefits-section article, .service-strip > *, .reviews-section > div, .about-copy > div, .values-section article, .about-cta, .contact-card, .contact-form, .product-detail-media, .product-detail-content, .product-reviews-header, .product-review-card, .review-form, .cart-item, .order-summary, .checkout-intro, .checkout-form, .payment-result";
let motionRevealObserver = null;

function formatPrice(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function formatExactPrice(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function createCheckoutReference() {
  const randomBytes = new Uint8Array(5);
  if (window.crypto && typeof window.crypto.getRandomValues === "function") {
    window.crypto.getRandomValues(randomBytes);
  } else {
    randomBytes.forEach((value, index) => { randomBytes[index] = Math.floor(Math.random() * 256); });
  }
  const suffix = Array.from(randomBytes, (value) => value.toString(36).padStart(2, "0")).join("").slice(0, 8).toUpperCase();
  return "GS" + Date.now().toString() + suffix;
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

// A UPI QR is a UPI payment URI encoded as a QR image. The QR code library
// runs in the browser; no cart details are sent to a QR image service.
function buildUPIPaymentUri(amountRupees, orderReference) {
  const parameters = new URLSearchParams({
    pa: STORE_UPI_ID,
    pn: STORE_UPI_PAYEE_NAME,
    tr: orderReference,
    tn: STORE_NAME + " order " + orderReference,
    am: Number(amountRupees).toFixed(2),
    cu: "INR"
  });
  return "upi://pay?" + parameters.toString();
}

function renderDynamicUPIQRCode(target, paymentUri, amountRupees) {
  const qrContainer = target.querySelector("[data-upi-qr]");
  if (!qrContainer) return;
  if (!STORE_UPI_ID || typeof window.qrcode !== "function") {
    qrContainer.dataset.error = "true";
    qrContainer.setAttribute("role", "status");
    qrContainer.textContent = "Dynamic QR unavailable. Check your internet connection and reload before paying.";
    return;
  }

  try {
    const qr = window.qrcode(0, "M");
    qr.addData(paymentUri);
    qr.make();
    qrContainer.innerHTML = qr.createSvgTag({
      cellSize: 6,
      margin: 4,
      scalable: true,
      title: "PhonePe UPI payment for " + formatExactPrice(amountRupees),
      alt: "Dynamic UPI payment QR. The payee and discounted cart amount are prefilled."
    });
  } catch (error) {
    qrContainer.dataset.error = "true";
    qrContainer.setAttribute("role", "status");
    qrContainer.textContent = "Dynamic QR could not be created. Reload this page before paying.";
  }
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

function saveCart(cart, animateCount) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    showToast("Your browser could not save this cart. You can still send your order on WhatsApp.");
  }
  updateCartCount(animateCount);
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

function updateCartCount(animate) {
  const count = cartItems().reduce((total, item) => total + item.quantity, 0);
  document.querySelectorAll("[data-cart-count]").forEach((element) => {
    element.textContent = count;
    element.hidden = count === 0;
    if (animate) {
      window.clearTimeout(element.cartPopTimer);
      element.classList.remove("cart-count-pop");
      void element.offsetWidth;
      element.classList.add("cart-count-pop");
      element.cartPopTimer = window.setTimeout(() => element.classList.remove("cart-count-pop"), 500);
    }
  });
}

function addToCart(productId, quantity, button) {
  const product = findProduct(productId);
  if (!product) return;
  const cart = getCart();
  const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
  cart[product.id] = (Number(cart[product.id]) || 0) + safeQuantity;
  saveCart(cart, true);
  showAddedButtonFeedback(button);
  const shortName = product.name.length > 42 ? product.name.slice(0, 39).trimEnd() + "…" : product.name;
  showToast(shortName + " added to your cart.");
}

function showAddedButtonFeedback(button) {
  if (!button) return;
  if (!button.dataset.defaultMarkup) button.dataset.defaultMarkup = button.innerHTML;
  window.clearTimeout(button.addedFeedbackTimer);
  button.classList.remove("add-confirmed");
  void button.offsetWidth;
  button.classList.add("add-confirmed");
  button.textContent = button.hasAttribute("data-add-detail") ? "Added to cart ✓" : "Added ✓";
  button.addedFeedbackTimer = window.setTimeout(() => {
    button.classList.remove("add-confirmed");
    button.innerHTML = button.dataset.defaultMarkup;
  }, 1200);
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

// Reviews added on this static site stay in the visitor's browser. To publish
// reviews for everyone, add verified reviews to the product data or connect a
// shared review service.
function readProductReviews() {
  try {
    const saved = JSON.parse(localStorage.getItem(PRODUCT_REVIEWS_STORAGE_KEY) || "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch (error) {
    return {};
  }
}

function getProductReviews(product) {
  const savedReviews = readProductReviews()[product.id];
  const reviews = (Array.isArray(product.reviews) ? product.reviews : []).concat(Array.isArray(savedReviews) ? savedReviews : []);
  return reviews.map((review) => ({
    name: String(review.name || "Rider").trim().slice(0, 60),
    rating: Math.max(1, Math.min(5, Math.floor(Number(review.rating) || 5))),
    comment: String(review.comment || "").trim().slice(0, 1000),
    date: String(review.date || "")
  })).filter((review) => review.name && review.comment).reverse();
}

function reviewStarsMarkup(rating) {
  const safeRating = Math.max(1, Math.min(5, Math.floor(Number(rating) || 0)));
  return '<span class="review-stars" role="img" aria-label="' + safeRating + ' out of 5 stars">' + "★".repeat(safeRating) + "☆".repeat(5 - safeRating) + '</span>';
}

function productReviewSummaryMarkup(reviews) {
  const count = reviews.length;
  const average = count ? (reviews.reduce((sum, review) => sum + review.rating, 0) / count).toFixed(1) : "—";
  return [
    '<div class="product-review-summary" data-review-summary>',
    '<strong>' + average + '</strong>',
    count ? reviewStarsMarkup(Math.round(Number(average))) : '<span class="review-stars review-stars-empty" aria-hidden="true">☆☆☆☆☆</span>',
    '<span>' + (count ? count + (count === 1 ? ' customer review' : ' customer reviews') : 'No customer reviews yet') + '</span>',
    '</div>'
  ].join("");
}

function productReviewListMarkup(reviews) {
  if (!reviews.length) {
    return '<p class="product-review-empty">No reviews yet. If you have this product, share your experience with other riders.</p>';
  }
  return reviews.map((review) => {
    const parsedDate = review.date ? new Date(review.date) : null;
    const dateLabel = parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "";
    return [
      '<article class="product-review-card">',
      '<div class="product-review-meta"><strong>' + escapeHTML(review.name) + '</strong>' + (dateLabel ? '<time>' + escapeHTML(dateLabel) + '</time>' : '') + '</div>',
      reviewStarsMarkup(review.rating),
      '<p>' + escapeHTML(review.comment) + '</p>',
      '</article>'
    ].join("");
  }).join("");
}

function productReviewsMarkup(product) {
  const reviews = getProductReviews(product);
  return [
    '<section class="product-reviews section" aria-labelledby="product-reviews-title">',
    '<div class="product-reviews-header"><p class="eyebrow eyebrow-dark">Rider feedback</p><h2 id="product-reviews-title">Reviews for<br /><em>this product.</em></h2>',
    productReviewSummaryMarkup(reviews),
    '<p class="review-transparency-note">Customer feedback only. We do not add sample reviews.</p></div>',
    '<div class="product-reviews-body">',
    '<div class="product-review-list" data-product-review-list>' + productReviewListMarkup(reviews) + '</div>',
    '<form class="review-form" data-review-form data-review-product="' + product.id + '">',
    '<p class="eyebrow eyebrow-dark">Have this accessory?</p><h3>Share your experience</h3>',
    '<div class="review-form-row"><label>Your name<input name="review-name" type="text" maxlength="60" autocomplete="name" required /></label>',
    '<fieldset class="rating-input"><legend>Your rating</legend><div class="rating-options">',
    [1, 2, 3, 4, 5].map((rating) => '<label><input type="radio" name="review-rating" value="' + rating + '"' + (rating === 5 ? ' required' : '') + ' /><span>' + rating + ' ★</span></label>').join(""),
    '</div></fieldset></div>',
    '<label>Your comment<textarea name="review-comment" rows="4" maxlength="1000" placeholder="What should another rider know?" required></textarea></label>',
    '<button class="button button-gold" type="submit">Post review <span aria-hidden="true">→</span></button>',
    '<p class="review-privacy-note">Reviews are saved in this browser only. To share yours with the store, use the WhatsApp link shown after posting.</p>',
    '<p class="review-form-status" data-review-status role="status" aria-live="polite"></p>',
    '</form></div></section>'
  ].join("");
}

function submitProductReview(event, product) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const review = {
    name: String(formData.get("review-name") || "").trim(),
    rating: Number(formData.get("review-rating")),
    comment: String(formData.get("review-comment") || "").trim(),
    date: new Date().toISOString()
  };
  const status = form.querySelector("[data-review-status]");
  const savedReviews = readProductReviews();
  const productReviews = Array.isArray(savedReviews[product.id]) ? savedReviews[product.id] : [];
  productReviews.push(review);
  savedReviews[product.id] = productReviews;

  try {
    localStorage.setItem(PRODUCT_REVIEWS_STORAGE_KEY, JSON.stringify(savedReviews));
  } catch (error) {
    status.textContent = "Your browser could not save this review. Please share it with us on WhatsApp instead.";
    return;
  }

  const section = form.closest(".product-reviews");
  const reviews = getProductReviews(product);
  section.querySelector("[data-review-summary]").outerHTML = productReviewSummaryMarkup(reviews);
  section.querySelector("[data-product-review-list]").innerHTML = productReviewListMarkup(reviews);
  observeMotionTargets(section);
  form.reset();
  const message = "Hi GurunanakStore, I would like to share a review for " + product.name + ". Rating: " + review.rating + "/5. Review: " + review.comment;
  const whatsappUrl = "https://wa.me/" + STORE_PHONE + "?text=" + encodeURIComponent(message);
  status.innerHTML = 'Your review is saved on this device. It is not visible to other visitors yet. <a href="' + escapeHTML(whatsappUrl) + '" target="_blank" rel="noopener noreferrer">Send it to the store on WhatsApp</a>.';
}

function initHomeProducts() {
  const featuredGrid = document.querySelector("[data-featured-products]");
  if (featuredGrid) {
    featuredGrid.innerHTML = PRODUCTS.slice(0, 4).map(productCard).join("");
    observeMotionTargets(featuredGrid);
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
    observeMotionTargets(grid);
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
    '</div></section>',
    productReviewsMarkup(product),
    '<section class="related-section section"><div class="section-heading"><div><p class="eyebrow eyebrow-dark">Keep exploring</p><h2>More for your<br /><em>next ride.</em></h2></div><a class="text-link text-link-dark" href="shop.html">All accessories <span aria-hidden="true">→</span></a></div><div class="product-grid" data-related-products></div></section>'
  ].join("");

  const relatedProducts = PRODUCTS.filter((item) => item.id !== product.id).slice(0, 4);
  target.querySelector("[data-related-products]").innerHTML = relatedProducts.map(productCard).join("");
  observeMotionTargets(target);
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
  target.querySelector("[data-add-detail]").addEventListener("click", (event) => {
    addToCart(product.id, target.querySelector("[data-detail-quantity-value]").textContent, event.currentTarget);
  });
  target.querySelector("[data-review-form]").addEventListener("submit", (event) => submitProductReview(event, product));
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

  observeMotionTargets(target);

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
  const orderReference = createCheckoutReference();
  const paymentUri = buildUPIPaymentUri(paymentTotal.payable, orderReference);
  const summaryRows = items.map(({ product, quantity }) => '<div class="summary-line"><span>' + quantity + ' × ' + escapeHTML(product.name) + '</span><strong>' + formatPrice(product.price * quantity) + '</strong></div>').join("");
  target.innerHTML = [
    '<section class="checkout-page section"><div class="checkout-intro"><p class="eyebrow eyebrow-dark">Almost there</p><h1>Let’s get you<br />ready to ride.</h1>',
    '<p>Share your delivery details and choose PhonePe UPI or cash on delivery. Then send your order on WhatsApp. Once it is saved, your tracking code appears on screen and in the message so you can check its approval status.</p>',
    '<p><a class="text-link text-link-dark" href="cart.html">← Back to your cart</a></p>',
    '<aside class="order-summary checkout-summary"><p class="eyebrow eyebrow-dark">Your order</p>' + summaryRows,
    '<div class="summary-line"><span>Delivery</span><strong>Confirm with support first</strong></div>',
    '<div class="summary-total"><span data-checkout-total-label>PhonePe total after 10% discount</span><strong data-checkout-total>' + formatExactPrice(paymentTotal.payable) + '</strong></div>',
    '<p class="summary-note">PhonePe UPI gets 10% off. Cash on delivery has no PhonePe discount. Delivery charges are confirmed separately.</p></aside></div>',
    '<form class="checkout-form" data-checkout-form>',
    '<div class="form-grid"><label>Full name<input name="name" autocomplete="name" placeholder="Your full name" required /></label>',
    '<label>Phone number<input name="phone" autocomplete="tel" inputmode="numeric" pattern="[0-9]{10}" maxlength="10" placeholder="10-digit mobile number" required /></label></div>',
    '<label>Delivery address<textarea name="address" autocomplete="street-address" placeholder="House number, street, area, city, state and PIN code" required></textarea></label>',
    '<fieldset class="payment-method-options"><legend>Choose a payment method</legend>',
    '<label class="payment-method-option"><input type="radio" name="paymentMethod" value="PHONEPE_UPI" checked /><span><strong>PhonePe / UPI</strong><small>Pay now by QR and get 10% off.</small></span></label>',
    '<label class="payment-method-option"><input type="radio" name="paymentMethod" value="COD" /><span><strong>Cash on delivery</strong><small>Pay cash when the order arrives. No advance payment.</small></span></label></fieldset>',
    '<div data-upi-payment-details><section class="phonepe-payment-panel" aria-labelledby="phonepe-heading"><p class="eyebrow eyebrow-dark">UPI PAYMENT</p><h2 id="phonepe-heading"><span class="phonepe-mark" aria-hidden="true">पे</span> PhonePe QR</h2>',
    '<p>The QR includes your cart amount after the 10% PhonePe discount. Scan it and check the payee and amount in your UPI app before confirming.</p>',
    '<input type="hidden" name="orderReference" value="' + orderReference + '" />',
    '<div class="dynamic-qr-panel"><p class="eyebrow eyebrow-dark">SCAN WITH PHONEPE OR ANY UPI APP</p><h3>Payment QR</h3>',
    '<div class="dynamic-upi-qr" data-upi-qr aria-live="polite">Creating your payment QR…</div>',
    '<p class="dynamic-qr-amount">Amount in QR (10% discount included): <strong>' + formatExactPrice(paymentTotal.payable) + '</strong></p>',
    '<p class="dynamic-qr-note">After paying, enter the PhonePe transaction ID shown in your payment app before sending your order for approval. The store checks QR payments manually before approval.</p></div></section>',
    '<label class="payment-reference-label">PhonePe transaction ID (required for PhonePe orders)<input name="paymentReference" maxlength="50" placeholder="Enter the transaction ID shown in PhonePe" required /></label></div>',
    '<div class="cod-payment-note" data-cod-payment-note hidden><strong>Cash on delivery selected</strong><span>You will pay the order amount when it is delivered. Your request will be sent to GurunanakStore on WhatsApp for approval.</span></div>',
    '<button class="button button-outline button-wide whatsapp-order-button" type="submit"><span data-checkout-submit-label>Send for Order Approval</span> <span aria-hidden="true">↗</span></button>',
    '<p class="order-confirmation-note" data-payment-method-note>PhonePe QR payments are checked manually and stay pending until the store approves them. Never share your UPI PIN or OTP with anyone.</p>',
    '<p class="order-confirmation-note">Order summary: ' + escapeHTML(shortOrder) + '</p></form></section>'
  ].join("");

  renderDynamicUPIQRCode(target, paymentUri, paymentTotal.payable);
  observeMotionTargets(target);

  target.querySelector("[data-checkout-form]").addEventListener("submit", submitOrder);
  const checkoutForm = target.querySelector("[data-checkout-form]");
  checkoutForm.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
    input.addEventListener("change", () => updateCheckoutPaymentMethod(checkoutForm, paymentTotal));
  });
  updateCheckoutPaymentMethod(checkoutForm, paymentTotal);
}

function updateCheckoutPaymentMethod(form, paymentTotal) {
  const isCOD = form.elements.paymentMethod.value === "COD";
  const upiDetails = form.querySelector("[data-upi-payment-details]");
  const codNote = form.querySelector("[data-cod-payment-note]");
  const totalLabel = form.closest(".checkout-page").querySelector("[data-checkout-total-label]");
  const totalValue = form.closest(".checkout-page").querySelector("[data-checkout-total]");
  const methodNote = form.querySelector("[data-payment-method-note]");
  const submitLabel = form.querySelector("[data-checkout-submit-label]");
  const paymentReference = form.elements.paymentReference;
  if (upiDetails) upiDetails.hidden = isCOD;
  if (codNote) codNote.hidden = !isCOD;
  if (submitLabel) submitLabel.textContent = isCOD ? "Send Order to WhatsApp" : "Send for Order Approval";
  if (paymentReference) {
    paymentReference.required = !isCOD;
    if (isCOD) paymentReference.value = "";
  }
  if (totalLabel) totalLabel.textContent = isCOD ? "Cash due on delivery" : "PhonePe total after 10% discount";
  if (totalValue) totalValue.textContent = isCOD ? formatPrice(paymentTotal.subtotal) : formatExactPrice(paymentTotal.payable);
  if (methodNote) {
    methodNote.textContent = isCOD
      ? "Cash will be collected on delivery after the store approves your order. Do not send advance UPI payment for a COD order."
      : "PhonePe QR payments are checked manually and stay pending until the store approves them. Never share your UPI PIN or OTP with anyone.";
  }
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
    '<div class="payment-result-icon" data-phonepe-result-icon data-state="checking" aria-hidden="true"><span>…</span></div>',
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
  const statusIcon = target.querySelector("[data-phonepe-result-icon]");
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
      statusIcon.dataset.state = "pending";
      statusIcon.innerHTML = "<span>…</span>";
      title.textContent = "Payment status needs checking.";
      message.textContent = "The PhonePe status service is not configured yet. Contact GurunanakStore and share the order reference above before paying again.";
      return;
    }

    retryButton.disabled = true;
    statusIcon.dataset.state = "checking";
    statusIcon.innerHTML = "<span>…</span>";
    message.textContent = "Checking with PhonePe…";
    try {
      const response = await fetch(PHONEPE_API_BASE_URL + "/api/payments/status?merchantOrderId=" + encodeURIComponent(merchantOrderId));
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "PhonePe status could not be checked.");

      const matchingOrder = orderContext && orderContext.merchantOrderId === merchantOrderId;
      if (result.state === "COMPLETED" && matchingOrder && Number(result.amount) === Number(orderContext.amountPaise)) {
        statusIcon.dataset.state = "confirmed";
        statusIcon.innerHTML = "<span>✓</span>";
        title.textContent = "Payment confirmed!";
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
        statusIcon.dataset.state = "pending";
        statusIcon.innerHTML = "<span>…</span>";
        title.textContent = "PhonePe reports payment completed.";
        message.textContent = "This browser does not have the matching order details. Do not pay again. Contact GurunanakStore and share the reference above.";
      } else if (result.state === "PENDING") {
        statusIcon.dataset.state = "pending";
        statusIcon.innerHTML = "<span>…</span>";
        title.textContent = "Payment is still pending.";
        message.textContent = "PhonePe has not confirmed completion yet. Wait a little, then check the status again. Do not pay twice while it is pending.";
      } else if (result.state === "FAILED") {
        statusIcon.dataset.state = "failed";
        statusIcon.innerHTML = "<span>×</span>";
        title.textContent = "Payment was not completed.";
        message.textContent = "PhonePe reports this payment failed. Return to your cart to try again, or contact us on WhatsApp.";
      } else {
        statusIcon.dataset.state = "pending";
        statusIcon.innerHTML = "<span>…</span>";
        title.textContent = "Payment status needs checking.";
        message.textContent = "PhonePe returned status “" + String(result.state || "unknown") + "”. Contact GurunanakStore before trying to pay again.";
      }
    } catch (error) {
      statusIcon.dataset.state = "pending";
      statusIcon.innerHTML = "<span>…</span>";
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

function codWhatsAppUrl(message) {
  return whatsappUrl(message);
}

function openWhatsApp(message) {
  const newWindow = window.open(whatsappUrl(message), "_blank");
  if (newWindow) {
    newWindow.opener = null;
    return true;
  } else {
    showToast("Allow pop-ups to open WhatsApp, then try again.");
    return false;
  }
}

function renderManualOrderStatus(target, orderNumber, amount, paymentReference, whatsappOpened, message, savedOrder) {
  const referenceWasEntered = Boolean(paymentReference.trim());
  const isCOD = Boolean(savedOrder && savedOrder.paymentMethod === "COD");
  const referenceLabel = savedOrder ? "Your order tracking code" : "Order reference";
  const trackingLink = savedOrder
    ? (savedOrder.trackingCode
      ? 'order.html?trackingCode=' + encodeURIComponent(savedOrder.trackingCode)
      : 'order.html?orderId=' + encodeURIComponent(savedOrder.orderId))
    : "";
  target.innerHTML = [
    '<section class="payment-result section payment-result--manual" aria-live="polite">',
    '<p class="eyebrow eyebrow-dark">ORDER DETAILS</p>',
    '<div class="payment-result-icon" data-state="prepared" aria-hidden="true"><span>✓</span></div>',
    '<h1>' + (savedOrder ? 'Your order is saved.' : referenceWasEntered ? 'Order details are ready.' : 'Finish placing your order.') + '</h1>',
    '<p class="payment-result-copy">' + (savedOrder
      ? isCOD
        ? 'Keep this code and enter it on My Orders to check the approval status. Cash is due only when the order is delivered.'
        : 'Keep this code and enter it on My Orders to check the latest status. PhonePe QR payments remain pending until the store reviews the transaction.'
      : referenceWasEntered
        ? 'Your transaction reference is included in the prepared WhatsApp message. Send that message so we can check the payment in PhonePe Business.'
        : 'Your order details are ready in WhatsApp. Send the message to place the order, then complete payment and share its transaction reference.') + '</p>',
    '<p class="payment-reference">' + referenceLabel + ': <code>' + escapeHTML(orderNumber) + '</code></p>',
    '<div class="manual-payment-status"><strong>' + (savedOrder ? 'Order status: awaiting your review' : 'Online order tracking is not connected yet') + '</strong><span>' + (savedOrder
      ? isCOD
        ? 'This is a cash-on-delivery request. No online payment has been collected; cash is due at delivery after the store accepts the order.'
        : 'The order is saved securely. A transaction reference is only a clue; the store must check the PhonePe Business account before approving payment.'
      : 'Send the prepared WhatsApp message to place this order. Website status tracking will start after the store’s order server is connected.') + '</span></div>',
    '<p class="payment-result-copy payment-result-amount">' + (isCOD ? 'Cash due on delivery: ' : 'PhonePe QR amount after 10% discount: ') + '<strong>' + (isCOD ? formatPrice(amount) : formatExactPrice(amount)) + '</strong></p>',
    '<p class="payment-result-copy">' + (savedOrder
      ? 'Your order is saved. Open the prepared WhatsApp message below and tap Send so the store receives your details.'
      : whatsappOpened
        ? 'WhatsApp opened in another tab. Review the details and tap Send there to share your order.'
        : 'WhatsApp did not open automatically. Use the button below to send your order details.') + '</p>',
    '<a class="button button-gold" href="' + whatsappUrl(message) + '" target="_blank" rel="noopener noreferrer">' + (savedOrder ? 'Send order message in WhatsApp' : 'Open order message in WhatsApp') + ' <span aria-hidden="true">↗</span></a>',
    savedOrder ? '<a class="button button-outline" href="' + trackingLink + '">Track order approval <span aria-hidden="true">→</span></a>' : '',
    '<a class="text-link text-link-dark" href="shop.html">Continue shopping <span aria-hidden="true">→</span></a>',
    '</section>'
  ].join("");
  observeMotionTargets(target);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Customer history stays in this browser. A hard-to-guess reference code lets
// customers look up one order on another device without exposing contact data.
function normalizeOrderTrackingCode(value) {
  return String(value || "").trim().toUpperCase();
}

function isOrderTrackingCode(value) {
  return /^GS-[A-HJ-NP-Z2-9]{16}$/.test(normalizeOrderTrackingCode(value));
}

function readCustomerOrderHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(ORDER_HISTORY_STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter((order) => order && /^[A-Za-z0-9_-]{24}$/.test(String(order.orderId || "")))
      .map((order) => ({
        orderId: String(order.orderId),
        trackingCode: isOrderTrackingCode(order.trackingCode) ? normalizeOrderTrackingCode(order.trackingCode) : "",
        paymentMethod: order.paymentMethod === "COD" ? "COD" : "PHONEPE_UPI",
        createdAt: String(order.createdAt || ""),
        amountRupees: Number(order.amountRupees) || 0,
        status: String(order.status || "PENDING"),
        items: Array.isArray(order.items) ? order.items.map((item) => ({
          productId: Number(item.productId),
          name: String(item.name || "Bike accessory").slice(0, 160),
          price: Number(item.price) || 0,
          quantity: Math.max(1, Math.min(20, Math.floor(Number(item.quantity) || 1)))
        })).filter((item) => Number.isInteger(item.productId) && item.price >= 0) : []
      }));
  } catch (error) {
    return [];
  }
}

function saveCustomerOrderHistory(order, items) {
  const orderId = String(order && order.orderId || "");
  if (!/^[A-Za-z0-9_-]{24}$/.test(orderId)) return false;
  const history = readCustomerOrderHistory();
  const previous = history.find((entry) => entry.orderId === orderId);
  const itemSnapshot = Array.isArray(items) && items.length
    ? items.map(({ product, quantity }) => ({
      productId: Number(product.id),
      name: product.name,
      price: Number(product.price),
      quantity: Number(quantity)
    }))
    : (previous ? previous.items : []);
  const amountRupees = Number(order.amountRupees);
  const savedOrder = {
    orderId,
    trackingCode: isOrderTrackingCode(order.trackingCode)
      ? normalizeOrderTrackingCode(order.trackingCode)
      : (previous ? previous.trackingCode : ""),
    paymentMethod: order.paymentMethod === "COD" || (previous && previous.paymentMethod === "COD") ? "COD" : "PHONEPE_UPI",
    createdAt: String(order.createdAt || (previous && previous.createdAt) || new Date().toISOString()),
    amountRupees: Number.isFinite(amountRupees) && amountRupees >= 0 ? amountRupees : (previous ? previous.amountRupees : 0),
    status: String(order.status || (previous && previous.status) || "PENDING"),
    items: itemSnapshot
  };
  try {
    localStorage.setItem(ORDER_HISTORY_STORAGE_KEY, JSON.stringify([savedOrder, ...history.filter((entry) => entry.orderId !== orderId)].slice(0, 30)));
    return true;
  } catch (error) {
    return false;
  }
}

function orderDateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function renderCustomerOrderCards(container) {
  const history = readCustomerOrderHistory();
  if (!history.length) {
    container.innerHTML = '<div class="orders-empty"><span class="empty-icon" aria-hidden="true">GS</span><h2>No saved orders yet</h2><p>Orders you place in this browser will appear here. Enter the unique tracking code from your order message to add an order from any device.</p><a class="button button-gold" href="shop.html">Explore the shop <span aria-hidden="true">→</span></a></div>';
    return;
  }

  container.innerHTML = history.map((order) => {
    const itemMarkup = order.items.length
      ? '<ul class="customer-order-items">' + order.items.map((item) => '<li><span>' + escapeHTML(item.name) + ' × ' + item.quantity + '</span><strong>' + formatPrice(item.price * item.quantity) + '</strong></li>').join("") + '</ul>'
      : '<p class="customer-order-note">Items are not saved on this device for this older order.</p>';
    const trackUrl = order.trackingCode
      ? "order.html?trackingCode=" + encodeURIComponent(order.trackingCode)
      : "order.html?orderId=" + encodeURIComponent(order.orderId);
    const reorderButton = order.items.length
      ? '<button class="button button-outline button-small" type="button" data-reorder-order="' + escapeHTML(order.orderId) + '">Buy again</button>'
      : '';
    return '<article class="customer-order-card" data-customer-order="' + escapeHTML(order.orderId) + '">' +
      '<div class="customer-order-heading"><div><p class="eyebrow eyebrow-dark">REFERENCE ' + escapeHTML(order.trackingCode || order.orderId.slice(0, 8).toUpperCase()) + '</p><time>' + escapeHTML(orderDateLabel(order.createdAt)) + '</time></div><span class="order-status-badge is-pending" data-order-status>Checking status…</span></div>' +
      itemMarkup +
      '<div class="customer-order-footer"><div><span>Order total</span><strong data-order-total>' + formatPrice(order.amountRupees) + '</strong></div><div class="customer-order-actions"><a class="button button-gold button-small" href="' + trackUrl + '">Track order</a>' + reorderButton + '</div></div>' +
      '<p class="customer-order-note" data-order-note>Checking for the latest approval update…</p></article>';
  }).join("");
}

async function refreshCustomerOrderStatuses(container, notice) {
  const cards = Array.from(container.querySelectorAll("[data-customer-order]"));
  if (!API_BASE_URL) {
    notice.textContent = "Order tracking is not connected right now. Your saved orders remain on this device.";
    return;
  }
  if (!cards.length) return;

  await Promise.all(cards.map(async (card) => {
    const statusBadge = card.querySelector("[data-order-status]");
    const note = card.querySelector("[data-order-note]");
    try {
      const response = await fetch(API_BASE_URL + "/api/orders/status?orderId=" + encodeURIComponent(card.dataset.customerOrder), { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Status is temporarily unavailable.");
      statusBadge.classList.toggle("is-approved", result.status === "APPROVED");
      statusBadge.classList.toggle("is-pending", result.status !== "APPROVED");
      statusBadge.textContent = result.status === "APPROVED" ? "Approved" : "Waiting for approval";
      note.textContent = result.paymentMethod === "COD"
        ? result.status === "APPROVED"
          ? "Your COD order is accepted. Pay cash when it is delivered."
          : "Your COD request is waiting for store approval. No advance UPI payment is needed."
        : result.status === "APPROVED"
          ? "The store has checked this order. Use the tracking page for the latest details."
          : result.paymentStatus === "REFERENCE_PROVIDED"
            ? "Payment reference received. The store will update this order after reviewing it."
            : "The store has this order and will update its approval status here.";
      const total = card.querySelector("[data-order-total]");
      if (total && Number.isFinite(Number(result.amountRupees))) total.textContent = formatPrice(result.amountRupees);
    } catch (error) {
      statusBadge.classList.remove("is-approved");
      statusBadge.classList.add("is-pending");
      statusBadge.textContent = "Status unavailable";
      note.textContent = error.message || "We could not refresh this order yet. Try again shortly.";
    }
  }));
  notice.textContent = "Showing orders saved in this browser. Status refreshes automatically while this page is open.";
}

function initOrderHistoryPage() {
  const container = document.querySelector("[data-customer-orders]");
  if (!container) return;
  const notice = document.querySelector("[data-orders-notice]");
  const lookupForm = document.querySelector("[data-order-lookup]");

  function renderAndRefresh() {
    renderCustomerOrderCards(container);
    refreshCustomerOrderStatuses(container, notice);
  }

  lookupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = lookupForm.elements.orderReference;
    const rawReference = input.value.trim();
    let trackingCode = normalizeOrderTrackingCode(rawReference);
    let orderId = rawReference;
    try {
      const parsedUrl = new URL(rawReference, window.location.href);
      const linkedTrackingCode = parsedUrl.searchParams.get("trackingCode");
      const linkedOrderId = parsedUrl.searchParams.get("orderId");
      if (linkedTrackingCode || linkedOrderId) {
        trackingCode = normalizeOrderTrackingCode(linkedTrackingCode || "");
        orderId = linkedOrderId || "";
      }
    } catch (error) {
      // The customer may have entered the code itself instead of a full link.
    }
    const useTrackingCode = isOrderTrackingCode(trackingCode);
    if (!useTrackingCode && !/^[A-Za-z0-9_-]{24}$/.test(orderId)) {
      notice.textContent = "Enter the unique code from your order message, or paste an older order tracking link.";
      return;
    }
    if (!API_BASE_URL) {
      notice.textContent = "Order lookup is not connected right now. Please try again later.";
      return;
    }
    const button = lookupForm.querySelector("button[type=submit]");
    button.disabled = true;
    notice.textContent = "Looking up this order…";
    try {
      const lookupKey = useTrackingCode ? "trackingCode" : "orderId";
      const lookupValue = useTrackingCode ? trackingCode : orderId;
      const response = await fetch(API_BASE_URL + "/api/orders/status?" + lookupKey + "=" + encodeURIComponent(lookupValue), { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We could not find that order.");
      saveCustomerOrderHistory(result, []);
      input.value = "";
      renderAndRefresh();
      notice.textContent = "Order found. Its latest status is shown below.";
    } catch (error) {
      notice.textContent = error.message || "We could not find that order.";
    } finally {
      button.disabled = false;
    }
  });

  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-reorder-order]");
    if (!button) return;
    const order = readCustomerOrderHistory().find((entry) => entry.orderId === button.dataset.reorderOrder);
    if (!order || !order.items.length) return;
    const cart = getCart();
    order.items.forEach((item) => {
      const product = findProduct(item.productId);
      if (product) cart[product.id] = (Number(cart[product.id]) || 0) + item.quantity;
    });
    saveCart(cart, true);
    showToast("Items added to your cart.");
  });

  renderAndRefresh();
  const linkedParams = new URLSearchParams(window.location.search);
  const linkedOrderReference = linkedParams.get("trackingCode") || linkedParams.get("orderId") || "";
  if (isOrderTrackingCode(linkedOrderReference) || /^[A-Za-z0-9_-]{24}$/.test(linkedOrderReference)) {
    lookupForm.elements.orderReference.value = linkedOrderReference;
    lookupForm.requestSubmit();
  }
  window.setInterval(() => refreshCustomerOrderStatuses(container, notice), 20000);
}

async function submitOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const target = document.querySelector("[data-checkout-page]");
  if (!form.reportValidity()) return;
  const items = cartItems();
  if (!items.length) {
    renderCheckoutPage();
    showToast("Your cart is empty.");
    return;
  }
  const details = Object.fromEntries(new FormData(form));
  const paymentMethod = String(details.paymentMethod || "PHONEPE_UPI").toUpperCase() === "COD" ? "COD" : "PHONEPE_UPI";
  const paymentReference = paymentMethod === "COD" ? "" : String(details.paymentReference || "").trim();
  if (paymentMethod === "PHONEPE_UPI" && !paymentReference) {
    const referenceField = form.elements.paymentReference;
    if (referenceField) {
      referenceField.required = true;
      referenceField.focus();
      referenceField.reportValidity();
    }
    return;
  }
  const submitButton = form.querySelector('button[type="submit"]');
  const initialButtonText = submitButton ? submitButton.innerHTML : "";
  let savedOrder = null;

  if (paymentMethod === "COD" && window.location.protocol === "file:") {
    showToast("COD orders must be saved securely first. Open checkout at https://gurunanakstore.shop/checkout.html; this local file cannot connect to the order service.");
    return;
  }

  if (paymentMethod === "COD" && !API_BASE_URL) {
    showToast("The order service is not connected, so we cannot safely place this COD order yet.");
    return;
  }

  if (API_BASE_URL) {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Saving your order…";
    }
    try {
      const response = await fetch(API_BASE_URL + "/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(({ product, quantity }) => ({ productId: product.id, quantity })),
          customer: { name: details.name, phone: details.phone, address: details.address },
          paymentMethod,
          checkoutReference: details.orderReference,
          paymentReference
        })
      });
      const result = await response.json();
      if (!response.ok || !result.orderId || !Number.isFinite(Number(result.amountRupees))) {
        throw new Error(result.error || "We could not save the order. Please try again or contact us.");
      }
      if (paymentMethod === "COD" && (result.paymentMethod !== "COD" || !isOrderTrackingCode(result.trackingCode))) {
        throw new Error("The order server did not confirm COD support. Please contact the store before placing this order again.");
      }
      savedOrder = result;
      if (!saveCustomerOrderHistory(savedOrder, items)) {
        showToast("Your order was saved, but this browser could not save its order history.");
      }
    } catch (error) {
      const isNetworkFailure = error && error.name === "TypeError";
      const customerMessage = isNetworkFailure
        ? "We could not connect to the order service. Check your internet connection or try again shortly. No order was confirmed."
        : (error.message || "We could not save the order. Please try again.");
      console.error("[GurunanakStore checkout] Order request failed", {
        endpoint: API_BASE_URL + "/api/orders",
        pageOrigin: window.location.origin,
        paymentMethod,
        errorType: error && error.name ? error.name : "Error"
      });
      showToast(customerMessage);
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = initialButtonText;
      }
      return;
    }
  }

  const isCOD = paymentMethod === "COD";
  const orderNumber = String(savedOrder ? (savedOrder.trackingCode || savedOrder.orderId) : details.orderReference || "GS" + Date.now().toString().slice(-10));
  const finalAmount = savedOrder ? Number(savedOrder.amountRupees) : isCOD ? cartTotal() : phonePePaymentTotal(items).payable;
  const itemLines = items.map(({ product, quantity }) => "- " + product.name + " x " + quantity + " — " + formatPrice(product.price * quantity)).join("\n");
  const message = "Namaste " + STORE_NAME + ", I would like to place an order.\n\n" +
    (savedOrder ? "Order tracking code: " : "Order reference: ") + orderNumber + "\n\n" + itemLines + "\n\n" +
    (savedOrder ? (savedOrder.checkoutReference ? "UPI QR reference: " + savedOrder.checkoutReference + "\n" : "") + "Order status page: " + new URL(savedOrder.trackingCode ? "order.html?trackingCode=" + encodeURIComponent(savedOrder.trackingCode) : "order.html?orderId=" + encodeURIComponent(savedOrder.orderId), window.location.href).toString() + "\n\n" : "") +
    (isCOD
      ? "Payment method: Cash on Delivery\nCash due at delivery: " + formatPrice(finalAmount) + "\nPayment: I will pay in cash when the order is delivered. Please approve my COD order.\n\n"
      : "Payment method: PhonePe / UPI\nItems total before PhonePe discount: " + formatPrice(cartTotal()) + "\nPhonePe QR amount after 10% discount: " + formatExactPrice(phonePePaymentTotal(items).payable) + "\n" +
        "PhonePe transaction ID: " + paymentReference + "\n\n") +
    "Delivery: Please confirm the availability and charge for my address.\n" +
    "Name: " + details.name + "\n" +
    "Phone: " + details.phone + "\n" +
    "Delivery address: " + details.address + "\n\n" +
    "Please confirm stock, fit, delivery charge, and final total before payment.";
  // When an API request was needed, offer a normal user-clickable WhatsApp link
  // after the save completes so popup blockers do not swallow the message.
  if (savedOrder && isCOD) {
    // The customer still reviews and sends the pre-filled order message in WhatsApp.
    window.location.assign(codWhatsAppUrl(message));
    return;
  }
  const whatsappOpened = savedOrder ? false : openWhatsApp(message);
  renderManualOrderStatus(target, orderNumber, finalAmount, paymentReference, whatsappOpened, message, savedOrder);
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

function observeMotionTargets(root) {
  if (!motionRevealObserver || !root || typeof root.querySelectorAll !== "function") return;
  root.querySelectorAll(MOTION_REVEAL_SELECTOR).forEach((element) => {
    if (element.classList.contains("motion-reveal")) return;
    element.classList.add("motion-reveal");
    motionRevealObserver.observe(element);
  });
}

function initPremiumMotion() {
  const prefersReducedMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion || typeof window.IntersectionObserver !== "function") return;

  motionRevealObserver = new window.IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      motionRevealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

  document.documentElement.classList.add("motion-ready");
  observeMotionTargets(document);
}

// A small pointer tilt adds depth on laptops and desktops; touch and
// reduced-motion users keep the steady, unanimated layout.
function initThreeDTilt() {
  const prefersReducedMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const supportsFinePointer = typeof window.matchMedia === "function" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (prefersReducedMotion || !supportsFinePointer) return;

  let activeSurface = null;
  const surfaceSelector = ".product-card, .product-detail-image";

  function resetTilt(surface) {
    surface.style.removeProperty("--tilt-x");
    surface.style.removeProperty("--tilt-y");
    surface.classList.remove("is-tilting");
  }

  document.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || !(event.target instanceof Element)) return;
    const surface = event.target.closest(surfaceSelector);
    if (activeSurface && surface !== activeSurface) resetTilt(activeSurface);
    if (!surface) {
      activeSurface = null;
      return;
    }

    const bounds = surface.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const pointerX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const pointerY = (event.clientY - bounds.top) / bounds.height - 0.5;
    const tiltStrength = surface.matches(".product-card") ? 5 : 3;
    surface.style.setProperty("--tilt-x", `${(-pointerY * tiltStrength).toFixed(2)}deg`);
    surface.style.setProperty("--tilt-y", `${(pointerX * tiltStrength).toFixed(2)}deg`);
    surface.classList.add("is-tilting");
    activeSurface = surface;
  }, { passive: true });

  document.addEventListener("pointerout", (event) => {
    if (!(event.target instanceof Element)) return;
    const surface = event.target.closest(surfaceSelector);
    if (!surface || (event.relatedTarget instanceof Node && surface.contains(event.relatedTarget))) return;
    resetTilt(surface);
    if (activeSurface === surface) activeSurface = null;
  });
}

document.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-product]");
  if (addButton) addToCart(addButton.dataset.addProduct, 1, addButton);
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
  initOrderHistoryPage();
  updateCartCount();
  document.querySelectorAll("[data-year]").forEach((element) => {
    element.textContent = new Date().getFullYear();
  });
  initThreeDTilt();
  initPremiumMotion();
});
