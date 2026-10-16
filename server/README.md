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

## Optional AI support chat

The public storefront can answer common questions locally and show the WhatsApp handoff even before AI is connected. To enable AI-generated replies, add these values in the Railway service's **private Variables**:

| Variable | Value |
|---|---|
| `OPENAI_API_KEY` | Your private API key from the OpenAI API platform (never paste it into chat, GitHub, or frontend files) |
| `OPENAI_MODEL` | `gpt-4.1-mini` (optional; this is the default) |

The backend sends a customer's chat messages to the OpenAI Responses API to generate replies. The chat panel tells customers not to share OTPs, UPI PINs, passwords, or card details; the server also redacts common phone, email, tracking-code, and payment-reference patterns. Do not use the assistant for order lookups or payment approval. Chats are not saved by this website, and the API request uses `store: false`; configure an API usage budget/alerts in the provider dashboard because API usage can incur charges. The backend applies short-lived in-memory request limits; they reset when the service restarts. If the key is missing or the AI service fails, the site falls back to basic store answers and the WhatsApp contact.

After adding the private key, redeploy the Railway service. The frontend can stay on GitHub Pages; it calls `POST /api/support/chat` on the existing Railway API. Never add `OPENAI_API_KEY` to `js/payment-config.js` or any other public file.

## WhatsApp alerts for new orders

The backend sends a WhatsApp Cloud API template notification only to `WHATSAPP_OWNER_NUMBER`. It includes only the order ID, amount, and order time in India Standard Time; it does not include customer name, phone, address, or payment reference. The recipient is always the configured owner number, never a number supplied by checkout. Duplicate checkout retries and repeated approvals do not send duplicate alerts, and a notification failure never blocks order placement or approval.

The checkout stores PhonePe QR orders as pending with a customer-entered transaction reference; that reference is not proof of payment. The owner alert for those orders is sent only after the owner checks the transfer and approves the order, which marks it `MANUALLY_VERIFIED`. Rejected, pending, and unverified UPI orders do not trigger an alert. COD orders do not require payment before placement, so their alert is sent once the COD order is saved; cash remains due on delivery.

Because this is a business-initiated notification, use a Meta-approved Utility template. In Meta's WhatsApp Manager, create and get approval for a Utility template named `new_order_details` in `en_US`, with this exact body and three body variables in order:

`New GurunanakStore order received.\nOrder ID: {{1}}\nAmount: {{2}}\nOrder time: {{3}}`

Provide sample values when Meta asks for them, for example `GS_order_example`, `₹479.00`, and `16 Oct 2026, 15:45 IST`. Do not use the old static `new_order_notice` template: it has no variables and will not match this payload.

Add these values to the backend host's private Variables, then redeploy the API service:

| Variable | Value |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | A private Meta Cloud API access token with `whatsapp_business_messaging` permission |
| `WHATSAPP_PHONE_NUMBER_ID` | The sending number's Phone Number ID from the WhatsApp Business Platform |
| `WHATSAPP_OWNER_NUMBER` | Your WhatsApp number with country code, such as `919876543210` |
| `WHATSAPP_GRAPH_API_VERSION` | `v26.0` (current Graph API version as of October 2026; use a currently supported version) |
| `WHATSAPP_TEMPLATE_NAME` | `new_order_details` (default; must match the approved Meta template) |
| `WHATSAPP_TEMPLATE_LANGUAGE` | `en_US` (default) |

Do not paste tokens into chat or add them to this repository or any storefront file. `GET /health` reports `whatsappAlertsConfigured: true` when the access token, sender Phone Number ID, and owner recipient number are present; this confirms only that settings exist, not that Meta has approved the template or that messages are delivered. A successful API request means Meta accepted the template message; delivery still depends on the WhatsApp account, approved template, recipient eligibility, and Meta's delivery status. Replace any Railway `WHATSAPP_TEMPLATE_NAME` value of `new_order_notice` with `new_order_details` after the new variable-bearing template is approved. The notification error is logged server-side and does not change the successful order response.

Meta reference: [WhatsApp Cloud API](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api).

## WhatsApp Cloud API webhook

The backend webhook endpoint is `GET` and `POST /webhooks/whatsapp`. The GET route handles Meta's `hub.mode=subscribe`, `hub.verify_token`, and `hub.challenge` handshake. The POST route checks Meta's `X-Hub-Signature-256` HMAC using the app secret before accepting WhatsApp message/status events. It logs only event counts and does not save incoming message contents or send automatic replies. Invalid signatures are rejected, and malformed or oversized payloads receive an error response.

The storefront currently configures `https://gurunanakstore-production.up.railway.app` as its backend base in `../js/payment-config.js`, so the callback URL for that configured domain is `https://gurunanakstore-production.up.railway.app/webhooks/whatsapp`. Confirm that this generated domain is still the active public domain in Railway before entering it in Meta. If Railway shows a different public domain, use that domain with `/webhooks/whatsapp` instead.

In the Meta app's WhatsApp webhook configuration, enter the callback URL and the same private verify-token value as `WHATSAPP_VERIFY_TOKEN`. Subscribe the WhatsApp Business Account to the app and enable the `messages` webhook field; this field carries both inbound messages and outgoing-message status updates. Copy the app's App Secret from Meta App Settings → Basic into Railway's private Variables as `WHATSAPP_APP_SECRET`. Generate a unique random verify token of at least 32 characters and set it only in Railway's private Variables and Meta's Verify Token field. Never put either value in website code or commit real secrets.

The webhook-specific Railway variables are:

| Variable | Purpose |
|---|---|
| `WHATSAPP_VERIFY_TOKEN` | Secret chosen by the owner and shared with Meta's Verify Token field; minimum 32 characters |
| `WHATSAPP_APP_SECRET` | Meta app secret used to verify signed POST requests |

No additional package or deployment manifest is needed. Railway's existing setup uses this repository's `server` directory as the service root and `npm start`; commit and push the updated backend source files so Railway can deploy them. Do not treat the callback URL as active until the new code is deployed and the Meta GET verification succeeds.

Your host supplies `PORT`. The service exposes order and admin routes, plus `GET /health`, `POST /api/payments/create`, and `GET /api/payments/status`. Copy the service's public HTTPS URL, for example `https://your-service.example`, into `window.GURUNANAK_API_URL` in `js/payment-config.js` (without a trailing slash). That URL is public; the admin password and payment credentials stay on the server.

Set the admin password in the host's **private** environment settings only. Do not send it in chat or put it in website JavaScript. Mount a persistent disk and set `ORDERS_FILE` to a path on that disk. The order file contains customer names, phone numbers, addresses, and payment references; keep that disk private and restrict access to the service. If the hosting platform cannot provide persistent disk storage, do not use this JSON file store for live orders; configure a managed database before launch. Keep the service to one running instance when using the JSON file store.

When connected, customers submit their checkout details to the order service and receive a tracking link. Open `https://gurunanakstore.shop/admin.html` and sign in with the private password to see orders. The page exchanges that password for a random, expiring session token kept only in that browser tab. Check the transaction reference in PhonePe Business, then approve the order. You can reject an order awaiting review; the customer's tracking page will show that status. You can also permanently delete an order from the admin history; deleting it removes its tracking record too. The admin page is not linked in public navigation; its API still requires owner authentication. Public tracking responses do not include customer contact or address details.

This approval is your review in PhonePe Business. It does not automatically validate a customer-entered transaction reference. The existing PhonePe Gateway order-status flow is separate and requires Gateway credentials. Incoming orders appear in the dashboard after customers submit checkout; the dashboard can be refreshed to load them. Optional WhatsApp alerts are sent only when the Cloud API settings and approved template are configured.

If you also use the `github.io` address to open the shop, add its web origin to `SITE_ORIGINS`. The `SITE_URL` must still be the public website address customers should return to after payment.

## Test and go live

First, use sandbox credentials and PhonePe's UAT test flows for UPI QR, success, failure, and pending payments. Confirm that only a status of `COMPLETED` with the matching order amount produces the paid confirmation. The browser return page asks the backend to verify the order with PhonePe; it does not trust the browser redirect by itself.

After UAT and PhonePe's production approval, replace the three PhonePe values with the production Client ID, Client Secret, and Client Version, and set `PHONEPE_ENV=production`. Keep testing and live credentials in the host's secret settings, never in this repository.

## Important behavior and maintenance

- Product names and prices are checked again on the server in `catalog.js`. Whenever a product changes in `../js/products.js`, update its entry in `catalog.js` too. The server ignores any total or product name sent by the browser.
- After a verified PhonePe Gateway payment, the customer is offered a WhatsApp message with the delivery details. If they close the page before sending it, use the payment reference in PhonePe's Business Dashboard to identify the payment and contact the customer.
- A customer should not pay again while PhonePe reports a pending status. Check the payment in PhonePe's dashboard if the status remains unclear.
- Both the checkout QR and PhonePe Gateway amount include the 12% discount on the product subtotal. Delivery is confirmed separately. The old uploaded fixed merchant QR is not used by the current checkout.
- This service does not implement inventory management, refunds, or automatic shipping. Manual merchant-QR payments still need the owner to check them in PhonePe Business and approve the saved order.

PhonePe reference: [Standard Checkout integration steps](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/integration-steps), [authorization](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/authorization), [create payment](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment), and [order status](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/order-status).
