# Quick-Own Backend

Spring Boot backend for Quick-Own, an AI-assisted agentic shopping prototype using Java 21, Spring AI, Google Gemini, Channel3 and PayPal Orders v2 Sandbox.

For the full product overview and local run instructions, see the root [README](../README.md).

## Architecture

- `controller`: REST endpoints and request validation.
- `service/ai`: Gemini shopping-intent interpretation and catalogue-backed recommendation orchestration.
- `service/catalog`: provider orchestration, currency selection and product-offer aggregation.
- `service/payment`: server-side cart repricing, PayPal order creation, capture, state persistence and recovery.
- `integration/channel3`: Channel3 product catalogue client.
- `integration/retailer`: optional Flipkart Affiliate and Amazon.in Creators API clients.
- `integration/paypal`: OAuth 2.0, PayPal Orders v2 and webhook-signature verification clients.
- `dto`: API request and response records.
- `exception`: typed integration errors and centralized REST error mapping.

## Environment variables

Configure these values in the IntelliJ `BackendApplication` run configuration or in the process that starts Spring Boot. Never put secret values in source files or commit them.

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Yes for AI recommendations | Gemini API key used by Spring AI |
| `CHANNEL3_API_KEY` | Yes for live product discovery | Channel3 catalogue API key |
| `PAYPAL_CLIENT_ID` | Yes for checkout | PayPal Sandbox REST app client ID |
| `PAYPAL_CLIENT_SECRET` | Yes for checkout | PayPal Sandbox REST app secret |
| `PAYPAL_BASE_URL` | No | Defaults to `https://api-m.sandbox.paypal.com` |
| `PAYPAL_RETURN_URL` | No | Defaults to `http://localhost:3000/checkout/success` |
| `PAYPAL_CANCEL_URL` | No | Defaults to `http://localhost:3000/checkout/cancelled` |
| `PAYPAL_WEBHOOK_ID` | Optional | Webhook ID from the same Sandbox REST app |
| `FRONTEND_ORIGINS` | No | Exact comma-separated CORS origins; localhost:3000 and 127.0.0.1:3000 are allowed by default |
| `CATALOG_CURRENCY` | No | Defaults to INR |
| `CATALOG_FALLBACK_CURRENCY` | No | Defaults to USD; only used for unbudgeted searches when the preferred market returns no products |
| `FLIPKART_AFFILIATE_ID` | Optional | Flipkart Affiliate tracking ID |
| `FLIPKART_AFFILIATE_TOKEN` | Optional | Flipkart Affiliate API token |
| `AMAZON_CREATORS_CLIENT_ID` | Optional | Amazon.in Creators API client ID |
| `AMAZON_CREATORS_CLIENT_SECRET` | Optional | Amazon.in Creators API client secret |
| `AMAZON_ASSOCIATES_PARTNER_TAG` | Optional | Amazon.in Associates Partner Tag |

The Windows helper `configure-retailer-credentials.ps1` prompts for optional Affiliate/Creators credentials locally. It cannot create or approve affiliate accounts. Leave credentials blank for providers that are not yet available.

## Run

From IntelliJ, run `BackendApplication` on port 8080.

Or use PowerShell:

```powershell
.\mvnw.cmd spring-boot:run
```

Run the automated regression suite:

```powershell
.\mvnw.cmd clean test
```

The tests use local HTTP test servers and mocked provider responses. They do not create real PayPal orders, move money or consume live Channel3 quota.

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/catalog/providers` | Shows whether catalogue providers are configured, without returning credentials |
| GET | `/api/products/search` | Structured catalogue search |
| POST | `/api/ai/recommendations` | Natural-language intent interpretation and ranked product recommendations |
| POST | `/api/checkout/orders` | Revalidate exact offer and create PayPal Sandbox order |
| GET | `/api/checkout/orders/{orderId}/status` | Read status for a locally owned order |
| POST | `/api/checkout/orders/{orderId}/capture` | Verify approval, capture or reconcile the order |
| POST | `/api/paypal/webhooks` | Verify and process supported PayPal webhook events |

### AI recommendations

`POST /api/ai/recommendations`

```json
{
  "message": "Find wireless noise-cancelling headphones under ₹6000 with long battery life"
}
```

Gemini interprets the shopping request. The backend independently applies budget/currency/stock constraints, searches configured catalogue providers, filters offers and ranks catalogue-backed products. Product facts, stock, prices and merchant URLs are not invented by the model.

### PayPal checkout

`POST /api/checkout/orders` requires a unique `Idempotency-Key` header for every new cart. Reuse that key only for a retry of the identical cart. Reusing a key with a changed cart is rejected.

```http
Idempotency-Key: quickown-demo-001
Content-Type: application/json
```

```json
{
  "items": [
    {
      "productId": "PRODUCT_ID_FROM_SEARCH",
      "productName": "Exact catalogue product title",
      "merchantDomain": "merchant-from-selected-offer",
      "quantity": 1,
      "offerUrl": "exact-productUrl-from-selected-offer"
    }
  ]
}
```

The client does not provide a price. The backend re-fetches the configured catalogue, validates the product ID and selected merchant, checks stock and current price, then calculates the PayPal total. It uses the exact selected offer URL when it is still current. If Channel3 refreshes that URL and exactly one eligible live offer remains for the selected merchant and product, the backend uses that live offer and its current price. When multiple eligible offers remain for that merchant, an exact `offerUrl` match is required; ambiguous or stale selections are rejected and must be selected again. All items in one PayPal order must use the same currency.

The backend returns the PayPal order ID and approval URL. The browser redirects the buyer to PayPal Sandbox. PayPal returns to the frontend success page, which calls `POST /api/checkout/orders/{orderId}/capture`. The backend verifies that the order is approved and that PayPal's amount and currency match the server-calculated total before capture.

Capture is idempotent. If PayPal completed a capture immediately before a backend restart, the service reconciles the completed PayPal order instead of attempting another capture.

## Catalogue providers

- **Channel3** is the currently active live catalogue provider.
- **Flipkart Affiliate** is optional and requires an Affiliate account plus API credentials.
- **Amazon.in Creators API** is optional and requires an eligible Associates account plus approved API access and credentials.

Providers fail independently so one unavailable retailer does not prevent successful providers from returning results. INR is the default market. No currency conversion is performed. An unbudgeted search may retry using the configured fallback currency only when the preferred market has no results, and the response discloses that fallback. An explicit INR budget never falls back to USD.

Channel3 merchant offers must be displayed as Channel3-returned offers; they must not be represented as Amazon or Flipkart offers unless those providers actually returned them.

## PayPal webhooks

`POST /api/paypal/webhooks` verifies the PayPal transmission signature before processing any event. Configure `PAYPAL_WEBHOOK_ID` and register the endpoint over public HTTPS. Supported events include:

- `CHECKOUT.ORDER.APPROVED`: attempts server-side capture for a locally created order.
- `PAYMENT.CAPTURE.COMPLETED`: reconciles capture ID, amount and currency.
- `CHECKOUT.ORDER.COMPLETED`: reconciles the completed order capture.

A local `localhost` listener is not reachable by PayPal. Use an HTTPS tunnel for local webhook testing.

## MVP limitations and payment disclosure

- Checkout state and idempotency records are persisted to a local JSON file for a single-instance hackathon MVP. Use a transactional shared database before multi-instance or production deployment.
- PayPal capture is a Sandbox payment to the Quick-Own Sandbox merchant. It does not place an order with Amazon, Flipkart or a Channel3 merchant, and does not guarantee retailer fulfilment.
- Product prices and stock are revalidated before order creation, but production systems need explicit offer-expiry and retailer-fulfilment handling.
- Use only PayPal Sandbox credentials for this hackathon demonstration.
