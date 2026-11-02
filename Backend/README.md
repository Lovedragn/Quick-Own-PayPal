# Quick-Own PayPal Backend

AI-powered PayPal shopping assistant using Java 21, Spring Boot 4, Spring AI, Gemini, Channel3 and PayPal Orders v2.

## Architecture

```text
com.quickown.backend
├── ai
│   └── tool                 # Spring AI function tools
├── catalog                  # Local mock catalogue and search
├── config                   # CORS and infrastructure configuration
├── controller               # Thin REST controllers
├── dto
│   ├── ai                   # AI request/response records
│   ├── checkout             # Checkout request/response records
│   └── product              # Normalized product and offer records
├── exception                # Typed exceptions + GlobalExceptionHandler
├── integration
│   ├── channel3             # Channel3 API client
│   └── paypal               # PayPal OAuth and Orders API clients
└── service
    ├── ai                   # AI shopping orchestration
    ├── catalog              # Catalogue provider selection
    └── payment              # Checkout and capture use case
```

### Layer rules

- Controllers bind and validate HTTP requests, delegate to services and return DTOs.
- Services implement application use cases and must not construct HTTP error responses.
- Integration clients own provider HTTP details and map external payloads to internal DTOs.
- AI tools delegate to application services; they should not contain catalogue or payment business logic.
- All API exception mapping belongs in `exception/GlobalExceptionHandler` (`@RestControllerAdvice`).
- API request and response models live in `dto`, never nested inside controllers or services.

See `CODING_STANDARDS.md` for the team's conventions.

## Environment configuration

Configure these variables in the IntelliJ `BackendApplication` run configuration. Do not put secrets in source files or commit them.

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Gemini shopping assistant |
| `CHANNEL3_API_KEY` | Yes for live catalogue | Channel3 product discovery |
| `PAYPAL_CLIENT_ID` | Yes for checkout | PayPal Sandbox REST app client ID |
| `PAYPAL_CLIENT_SECRET` | Yes for checkout | PayPal Sandbox REST app secret |
| `PAYPAL_BASE_URL` | No | Defaults to `https://api-m.sandbox.paypal.com` |
| `PAYPAL_RETURN_URL` | No | Defaults to `http://localhost:3000/checkout/success` |
| `PAYPAL_CANCEL_URL` | No | Defaults to `http://localhost:3000/checkout/cancel` |
| `FRONTEND_ORIGIN` | No | Defaults to `http://localhost:3000` for local Next.js CORS |

PayPal uses OAuth 2.0 client credentials. The backend obtains and caches access tokens. The client secret and access token are never returned to the frontend.

## Run and test

Run `BackendApplication` from IntelliJ on port 8080.

Run all tests:

```powershell
.\mvnw.cmd clean test
```

The tests use local HTTP test servers. They do not create real PayPal orders, move money, or consume Channel3 search quota.

Format Java sources and tests with Google Java Format 1.24.0.

## API endpoints

### 1. Structured product search

`GET /api/products/search?query=wireless%20earbuds&inStockOnly=true`

Returns structured product cards, product IDs, images and merchant offers for the frontend. `inStockOnly` is optional and defaults to `false`.

### 2. AI product discovery

`POST /api/ai/test`

Request:

```json
{
  "message": "Find wireless noise cancelling earbuds under $200."
}
```

### 3. Create a PayPal order

`POST /api/checkout/orders`

Send a unique `Idempotency-Key` header for each cart attempt. Reuse the same key only when retrying the exact same cart after a network failure.

`Idempotency-Key: quickown-demo-001`

Request body:

```json
{
  "items": [
    {
      "productId": "CHANNEL3_PRODUCT_ID",
      "productName": "Exact product title from search results",
      "merchantDomain": "merchant-value-from-selected-offer",
      "quantity": 1
    }
  ]
}
```

Use the exact `productId`, `productName`, and selected offer's `merchant` from the structured product-search response. The backend re-searches Channel3 and validates the exact product, selected merchant, current availability and current price. It does not accept a client-supplied price. All items in one PayPal order must use the same currency.

Successful response includes the PayPal `orderId`, buyer `approvalUrl`, server-calculated `currency` and `total`, and validated line items.

### 4. Capture an approved PayPal order

After the buyer approves the order at PayPal, PayPal redirects to the configured return URL. The `token` query parameter on that redirect is the PayPal order ID.

Call:

`POST /api/checkout/orders/{orderId}/capture`

The backend fetches the PayPal order, verifies that its status is `APPROVED`, checks the approved amount and currency against the server-calculated cart, captures the payment, and validates the completed capture amount and currency. Duplicate capture requests return the previously recorded result.

## Manual PayPal Sandbox test

1. In the PayPal Developer Dashboard, create or select a REST API app in the Sandbox environment.
2. Copy its Sandbox Client ID and Secret into `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in IntelliJ's run configuration.
3. Keep `PAYPAL_BASE_URL` set to `https://api-m.sandbox.paypal.com`.
4. Restart `BackendApplication`.
5. Call the structured product search endpoint and select an in-stock product and one of its offers.
6. Call `POST /api/checkout/orders` with that product ID, exact product name, selected offer merchant value, quantity and a unique `Idempotency-Key`.
7. Open the returned `approvalUrl` in a browser and sign in with a PayPal Personal Sandbox buyer account (not the business seller account). Approve the payment.
8. Read the `token` query parameter from the PayPal return URL and call `POST /api/checkout/orders/{token}/capture`.
9. Confirm the response reports `COMPLETED` and includes the capture ID.

Never use live PayPal credentials or a live account for this hackathon test.

## MVP limitations

- Checkout state and idempotency records are held in memory. Do not restart the backend between order creation and capture. A persistent database is needed for multi-instance or production deployment.
- The current MVP supports one currency per PayPal order.
- Product prices and stock are revalidated against Channel3 immediately before order creation. Offer expiry and fulfillment state need explicit production handling.
- Webhook signature verification and durable order reconciliation should be added before production use.
- Configure the frontend return/cancel URLs for the actual deployed frontend before deployment.
