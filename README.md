# GurunanakStore

GurunanakStore is a simple online shop for motorcycle accessories. It is made with plain HTML, CSS, and JavaScript, so there is no software to install to preview it.

## Preview the website

Open index.html in a web browser. Use Shop to browse items, Add to put an item in your cart, and Continue to checkout to enter delivery details.

## PhonePe and UPI payments

The checkout applies a 10% discount to every product when the customer pays using the PhonePe button. It opens a standard UPI payment link with the discounted item total filled in. On a phone, the link opens an available UPI app or app chooser; choose PhonePe and check the payee and amount before approving. WhatsApp orders stay at the regular listed prices.

The image at `images/phonepe-merchant-qr.jpeg` is also shown as a manual scan option. It is a fixed QR, so it cannot fill in the cart amount; enter the discounted amount displayed at checkout. The payment button fills in the amount for the customer. Delivery charges are separate and must be confirmed before payment.

Direct UPI payments do not notify this static website when payment completes. Check the transfer in PhonePe Business before marking the order paid; the WhatsApp form lets the customer include the UPI transaction reference. A WhatsApp message alone is not proof of payment.

For automatic server verification, the optional PhonePe Payment Gateway service in `server/` needs a separate PhonePe Gateway account and server credentials. See [server/README.md](server/README.md). Never add Gateway secrets to `js/payment-config.js`, any other public website file, or Git.

The regular cart and manual WhatsApp order option remain available. A WhatsApp message alone is not proof of payment.

## Update the products

Edit the product list in js/products.js. The current products, prices, and pictures are examples. Replace them with your actual stock and product photos before publishing.

## Website pages

- index.html — home page
- shop.html — product list and filters
- product.html — product details, selected with an id in the web address
- cart.html — cart and quantity controls
- checkout.html — delivery details, PhonePe checkout and QR options, and WhatsApp order
- about.html and contact.html — store information and customer support

The site uses images/ for pictures and placeholders, css/style.css for design, and js/main.js for shopping features.

## Run the PhonePe API locally

Use Node.js 20 or newer. From the `server` folder, copy `.env.example` to `.env`, add PhonePe **test** credentials, then run `npm start`. Set the local API URL in `js/payment-config.js` and serve the static website over HTTP from an origin listed in `SITE_ORIGINS`. See [server/README.md](server/README.md) for details. Do not test a live payment until PhonePe has approved the production credentials and you have completed UAT.
