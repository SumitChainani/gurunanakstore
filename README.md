# GurunanakStore

GurunanakStore is a simple online shop for motorcycle accessories. It is made with plain HTML, CSS, and JavaScript, so there is no software to install to preview it.

## Preview the website

Open index.html in a web browser. Use Shop to browse items, Add to put an item in your cart, and Continue to checkout to enter delivery details.

## PhonePe and UPI payments

Checkout creates a dynamic UPI QR for the current cart. It includes the configured UPI ID, payee name, a unique order reference, and the item total after the 10% PhonePe discount. The customer scans it with PhonePe or another UPI app and checks the payee and amount before approving. Delivery charges are confirmed separately.

The QR is generated in the browser using the pinned `qrcode-generator` library from jsDelivr ([upstream project and MIT license](https://github.com/kazuhikoarase/qrcode-generator)). Checkout needs an internet connection to load that library. The old fixed QR image is not used for cart payments because it cannot carry a changing amount.

This static site cannot verify UPI payments automatically. Check the transfer in PhonePe Business before marking the order paid; the WhatsApp order lets the customer include a transaction reference. A WhatsApp message alone is not proof of payment.

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

## Customer support chat

The site includes a support chat with basic answers and a WhatsApp handoff. AI-generated answers are optional and require the private `OPENAI_API_KEY` setting on the Railway backend. Customer chat messages are sent to the AI service only when that key is configured. See [server/README.md](server/README.md#optional-ai-support-chat) for setup, privacy, and usage-cost notes. Keep API keys out of frontend files and GitHub.

## Run the PhonePe API locally

Use Node.js 20 or newer. From the `server` folder, copy `.env.example` to `.env`, add PhonePe **test** credentials, then run `npm start`. Set the local API URL in `js/payment-config.js` and serve the static website over HTTP from an origin listed in `SITE_ORIGINS`. See [server/README.md](server/README.md) for details. Do not test a live payment until PhonePe has approved the production credentials and you have completed UAT.
