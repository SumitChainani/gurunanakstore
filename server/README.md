# Order approval and PhonePe API setup

This Node service stores customer orders, provides a password-protected owner approval desk, and can optionally start/verify PhonePe Standard Checkout payments. The static storefront continues to be hosted by GitHub Pages; this service must be hosted separately on a Node host with HTTPS, private environment variables, and persistent storage.

## What you need from PhonePe

1. A **PhonePe Payment Gateway** merchant account with Standard Checkout enabled. A regular PhonePe consumer account or merchant QR code alone is not enough for this API integration.
2. For testing, open **PhonePe Business Dashboard → Developer Settings** and get the UAT **Client ID**, **Client Secret**, and **Client Version**.
3. After you have tested successfully in UAT and PhonePe has signed it off, obtain production credentials from PhonePe. Do not switch to production before that approval.

Never send the Client Secret in chat or put credentials in website JavaScript, `js/payment-config.js`, or a committed file. Enter secrets directly in your server host's private Environment settings. PhonePe's current API uses a server-generated OAuth token, a server-created checkout order, and a server-to-server Order Status check.

The API requests the UPI app and UPI QR options for PhonePe's hosted checkout. Ask PhonePe to enable UPI QR for the Payment Gateway account and test the QR option in UAT. PhonePe's hosted checkout QR is created for the server-calculated cart amount. The separate image at `../images/phonepe-merchant-qr.jpeg` is an old fixed merchant QR; it does not change to a cart amount and is not used by the current checkout.

## Deploy the API service

Create a Node.js web service from this repository with:

- **Root directory:** `server`
- **Build command:** `npm install` (there are no third-party packages)
- **Start command:** `npm start`
- **Node version:** 20 or newer

For a beginner, Railway can connect directly to this GitHub repository. Create a service from the repo, set its root directory to `server`, use `npm start`, and add a volume mounted at `/data`. Then add the environment values below and generate an HTTPS public URL for the service. Railway's free tier has a limited monthly usage credit, so check its current usage before relying on it for a live shop.

For the merchant-QR approval dashboard, set these values in your host's private environment settings. PhonePe Gateway credentials below are only needed if you later add hosted Gateway checkout:

| Variable | Value |
|---|---|
| `SITE_URL` | `https://gurunanakstore.shop` |
| `SITE_ORIGINS` | `https://gurunanakstore.shop,https://www.gurunanakstore.shop` |
| `ADMIN_PASSWORD` | A unique private password, at least 20 characters |
| `ORDERS_FILE` | A path on the host's persistent disk, e.g. `/data/orders.json` |

For optional PhonePe Gateway checkout, also set `PHONEPE_ENV=sandbox`, `PHONEPE_CLIENT_ID`, `PHONEPE_CLIENT_SECRET`, and `PHONEPE_CLIENT_VERSION` from PhonePe's UAT dashboard. These are not needed to approve manual QR orders.

Your host supplies `PORT`. The service exposes order and admin routes, plus `GET /health`, `POST /api/payments/create`, and `GET /api/payments/status`. Copy the service's public HTTPS URL, for example `https://your-service.example`, into `window.GURUNANAK_API_URL` in `js/payment-config.js` (without a trailing slash). That URL is public; the admin password and payment credentials stay on the server.

Set the admin password in the host's **private** environment settings only. Do not send it in chat or put it in website JavaScript. Mount a persistent disk and set `ORDERS_FILE` to a path on that disk. The order file contains customer names, phone numbers, addresses, and payment references; keep that disk private and restrict access to the service. If the hosting platform cannot provide persistent disk storage, do not use this JSON file store for live orders; configure a managed database before launch. Keep the service to one running instance when using the JSON file store.

When connected, customers submit their checkout details to the order service and receive a tracking link. Open `https://gurunanakstore.shop/admin.html` and sign in with the private password to see orders. The page exchanges that password for a random, expiring session token kept only in that browser tab. Check the transaction reference in PhonePe Business, then choose **Confirm payment & approve order**. The customer's tracking page checks every 10 seconds and shows the approval animation. The admin page is not linked in public navigation; its API still requires owner authentication. Public tracking responses do not include customer contact or address details.

This approval is your review in PhonePe Business. It does not automatically validate a customer-entered transaction reference. The existing PhonePe Gateway order-status flow is separate and requires Gateway credentials. Incoming orders appear in the dashboard after customers submit checkout; the dashboard can be refreshed to load them. It does not send push notifications to the owner.

If you also use the `github.io` address to open the shop, add its web origin to `SITE_ORIGINS`. The `SITE_URL` must still be the public website address customers should return to after payment.

## Test and go live

First, use sandbox credentials and PhonePe's UAT test flows for UPI QR, success, failure, and pending payments. Confirm that only a status of `COMPLETED` with the matching order amount produces the paid confirmation. The browser return page asks the backend to verify the order with PhonePe; it does not trust the browser redirect by itself.

After UAT and PhonePe's production approval, replace the three PhonePe values with the production Client ID, Client Secret, and Client Version, and set `PHONEPE_ENV=production`. Keep testing and live credentials in the host's secret settings, never in this repository.

## Important behavior and maintenance

- Product names and prices are checked again on the server in `catalog.js`. Whenever a product changes in `../js/products.js`, update its entry in `catalog.js` too. The server ignores any total or product name sent by the browser.
- After a verified PhonePe Gateway payment, the customer is offered a WhatsApp message with the delivery details. If they close the page before sending it, use the payment reference in PhonePe's Business Dashboard to identify the payment and contact the customer.
- A customer should not pay again while PhonePe reports a pending status. Check the payment in PhonePe's dashboard if the status remains unclear.
- Both the checkout QR and PhonePe Gateway amount include the 10% discount on the product subtotal. Delivery is confirmed separately. The old uploaded fixed merchant QR is not used by the current checkout.
- This service does not implement webhook notifications, inventory management, refunds, or automatic shipping. Manual merchant-QR payments still need the owner to check them in PhonePe Business and approve the saved order.

PhonePe reference: [Standard Checkout integration steps](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/integration-steps), [authorization](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/authorization), [create payment](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment), and [order status](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/order-status).
