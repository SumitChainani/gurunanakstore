# PhonePe checkout setup

This optional Node service keeps PhonePe Gateway credentials private and starts/verifies Standard Checkout payments. The current checkout also has a direct UPI app link that uses the public UPI ID in `js/payment-config.js`; this service is only needed for Gateway-based automatic payment verification. The static storefront continues to be hosted by GitHub Pages, while this service must be hosted separately on a Node host that supports HTTPS and private environment variables.

## What you need from PhonePe

1. A **PhonePe Payment Gateway** merchant account with Standard Checkout enabled. A regular PhonePe consumer account or merchant QR code alone is not enough for this API integration.
2. For testing, open **PhonePe Business Dashboard → Developer Settings** and get the UAT **Client ID**, **Client Secret**, and **Client Version**.
3. After you have tested successfully in UAT and PhonePe has signed it off, obtain production credentials from PhonePe. Do not switch to production before that approval.

Never send the Client Secret in chat or put credentials in website JavaScript, `js/payment-config.js`, or a committed file. Enter secrets directly in your server host's private Environment settings. PhonePe's current API uses a server-generated OAuth token, a server-created checkout order, and a server-to-server Order Status check.

The API requests the UPI app and UPI QR options for PhonePe's hosted checkout. Ask PhonePe to enable UPI QR for the Payment Gateway account and test the QR option in UAT. PhonePe's hosted checkout QR is created for the server-calculated cart amount. The separate image at `../images/phonepe-merchant-qr.jpeg` is a fixed manual merchant QR; it does not change to a cart amount and payments made with it are not automatically verified by this service.

## Deploy the API service

Create a Node.js web service from this repository with:

- **Root directory:** `server`
- **Build command:** `npm install` (there are no third-party packages)
- **Start command:** `npm start`
- **Node version:** 20 or newer

Add these private environment values in the host dashboard. Start in sandbox mode:

| Variable | Value |
|---|---|
| `PHONEPE_ENV` | `sandbox` |
| `PHONEPE_CLIENT_ID` | UAT Client ID from PhonePe |
| `PHONEPE_CLIENT_SECRET` | UAT Client Secret from PhonePe |
| `PHONEPE_CLIENT_VERSION` | UAT Client Version from PhonePe |
| `SITE_URL` | `https://gurunanakstore.shop` |
| `SITE_ORIGINS` | `https://gurunanakstore.shop,https://www.gurunanakstore.shop` |

Your host supplies `PORT`. The service exposes `GET /health`, `POST /api/payments/create`, and `GET /api/payments/status`. Copy the service's public HTTPS URL, for example `https://your-service.example`, into `window.GURUNANAK_PHONEPE_API_URL` in `js/payment-config.js` (without a trailing slash). That URL is public; the credentials stay on the server.

If you also use the `github.io` address to open the shop, add its web origin to `SITE_ORIGINS`. The `SITE_URL` must still be the public website address customers should return to after payment.

## Test and go live

First, use sandbox credentials and PhonePe's UAT test flows for UPI QR, success, failure, and pending payments. Confirm that only a status of `COMPLETED` with the matching order amount produces the paid confirmation. The browser return page asks the backend to verify the order with PhonePe; it does not trust the browser redirect by itself.

After UAT and PhonePe's production approval, replace the three PhonePe values with the production Client ID, Client Secret, and Client Version, and set `PHONEPE_ENV=production`. Keep testing and live credentials in the host's secret settings, never in this repository.

## Important behavior and maintenance

- Product prices are checked again on the server in `catalog.js`. Whenever a price changes in `../js/products.js`, update the corresponding value in `catalog.js` too. The server ignores any total sent by the browser.
- The service does not store order or shipping records. After a verified payment, the customer is offered a WhatsApp message with the delivery details. If they close the page before sending it, use the payment reference in PhonePe's Business Dashboard to identify the payment and contact the customer.
- A customer should not pay again while PhonePe reports a pending status. Check the payment in PhonePe's dashboard if the status remains unclear.
- PhonePe Gateway totals include the 10% PhonePe discount on the product subtotal. The manual merchant QR on the static checkout page cannot prefill an amount; customers should enter the discounted total shown at checkout. Delivery is confirmed separately.
- This service does not implement webhook notifications, inventory management, refunds, automatic shipping, or an order database.

PhonePe reference: [Standard Checkout integration steps](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/integration-steps), [authorization](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/authorization), [create payment](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment), and [order status](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/order-status).
