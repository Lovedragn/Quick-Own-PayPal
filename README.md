# Quick-Own

**An AI shopping agent that turns a natural-language request into catalogue-backed product recommendations, offer comparison and PayPal Sandbox checkout.**

Quick-Own is built for shoppers who know what they need but do not want to repeat the same search across multiple retailer websites. Describe the product, budget and must-have features in plain language. The AI extracts the shopping intent, the catalogue layer returns real product and merchant-offer data, and the backend validates the exact offer again before creating a PayPal Sandbox order.

> **Demo/payment disclosure:** This is a hackathon prototype. PayPal Sandbox capture records a test payment to the Quick-Own Sandbox merchant. It does not place an order with Amazon, Flipkart or a Channel3 merchant, and does not guarantee retailer fulfilment. Product links are retailer/merchant links returned by the catalogue provider.

## What the prototype does

1. **Understand the request.** Gemini, through Spring AI, interprets a natural-language shopping request and extracts a catalogue query, category and requested features. The backend independently handles budget, currency and stock constraints.
2. **Discover catalogue-backed products.** Channel3 supplies product records, images and merchant offers. Optional Amazon.in Creators API and Flipkart Affiliate adapters can be enabled only after account approval and credentials are available.
3. **Filter and explain recommendations.** The backend ranks returned catalogue results using requested features and actual offer details. It avoids silently converting currencies, discloses a fallback currency when used, and filters obvious accessories from a primary-product search.
4. **Select an exact offer.** The shopper can choose a merchant offer and quantity. Checkout re-fetches catalogue data and validates the exact product ID, merchant, selected offer URL, availability, price and currency.
5. **Approve using PayPal.** The backend creates a PayPal Orders v2 Sandbox order. The buyer is redirected to PayPal to approve it. The frontend return page asks the backend to verify and capture the order, then displays the capture result. Cancellation has a separate non-capture page.

## Main technologies

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | Next.js, React, Tailwind CSS | Natural-language search, recommendations, offer selection and PayPal return/cancel UX |
| Backend | Java 21, Spring Boot 4, Spring AI | Shopping orchestration, server-side rules, checkout and API responses |
| AI | Google Gemini via Spring AI | Shopping-intent interpretation |
| Product data | Channel3 | Product catalogue and merchant-offer discovery |
| Payments | PayPal Orders v2 Sandbox | OAuth, order creation, buyer approval, capture and status |
| Optional retailer adapters | Flipkart Affiliate API, Amazon.in Creators API | Additional retailer catalogue offers when eligible credentials are configured |

## Architecture

```text
Browser (Next.js)
   |
   | POST /api/ai/recommendations
   v
Spring Boot AgenticShoppingService
   |-- Gemini / Spring AI: interpret intent
   |-- server-side budget, currency, stock and relevance rules
   v
ProductCatalogService
   |-- Channel3 (active provider)
   |-- Flipkart Affiliate (optional / account approval required)
   |-- Amazon.in Creators API (optional / eligibility required)
   v
Structured recommendations + merchant offers
   |
   | user selects exact product / merchant / offer URL
   v
POST /api/checkout/orders + Idempotency-Key
   |-- re-fetch and revalidate catalogue offer
   |-- calculate price and currency server-side
   |-- PayPal OAuth + Orders v2 Sandbox create
   v
PayPal approval URL
   |
   | buyer approves in PayPal Sandbox
   v
Frontend /checkout/success?token=...
   |
   | POST /api/checkout/orders/{orderId}/capture
   v
PayPal capture verification + persisted result
```

## Prerequisites

- Java 21
- Node.js 20.9 or later and npm
- A Google Gemini API key
- A Channel3 API key for live product search
- PayPal Developer account with a **Sandbox** REST app and a Personal Sandbox buyer account for end-to-end payment testing

Optional providers:
- Flipkart Affiliate registration and Affiliate API token
- Eligible Amazon Associates account with Amazon.in Creators API access, client credentials and Partner Tag

## Configure secrets locally

Do not commit API keys, PayPal client secrets, access tokens, private account data or local checkout-session files.

### Backend environment

Configure these variables in the IntelliJ `BackendApplication` run configuration (or the shell that starts Spring Boot):

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Gemini / Spring AI |
| `CHANNEL3_API_KEY` | Channel3 live catalogue |
| `PAYPAL_CLIENT_ID` | PayPal Sandbox REST app client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal Sandbox REST app secret |
| `PAYPAL_BASE_URL` | Keep at `https://api-m.sandbox.paypal.com` |
| `PAYPAL_RETURN_URL` | Defaults to `http://localhost:3000/checkout/success` |
| `PAYPAL_CANCEL_URL` | Defaults to `http://localhost:3000/checkout/cancelled` |
| `PAYPAL_WEBHOOK_ID` | Optional until signed webhooks are configured |
| `CATALOG_CURRENCY` | Defaults to `INR` |
| `CATALOG_FALLBACK_CURRENCY` | Defaults to `USD`; only used for unbudgeted searches with no preferred-market results |
| `FRONTEND_ORIGINS` | Exact browser origins allowed by CORS; defaults include localhost:3000 and 127.0.0.1:3000 |
| `FLIPKART_AFFILIATE_ID`, `FLIPKART_AFFILIATE_TOKEN` | Optional Flipkart credentials |
| `AMAZON_CREATORS_CLIENT_ID`, `AMAZON_CREATORS_CLIENT_SECRET`, `AMAZON_ASSOCIATES_PARTNER_TAG` | Optional Amazon.in credentials |

The backend includes `Backend/configure-retailer-credentials.ps1` for entering optional retailer credentials locally. It cannot create or approve affiliate accounts.

### Frontend environment

Create `Frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

This variable is a public API base URL, not a secret. Never put private API keys in `NEXT_PUBLIC_*` variables.

## Run locally

### 1. Start the backend

In IntelliJ, open the `Backend` directory and run `BackendApplication` with the environment variables above. Or use PowerShell:

```powershell
cd Backend
.\\mvnw.cmd spring-boot:run
```

Backend health check:

```text
http://localhost:8080/api/health
```

### 2. Start the frontend

In a second terminal:

```powershell
cd Frontend
npm ci
npm run dev
```

Open:

```text
http://localhost:3000
```

The PayPal order uses the local frontend success and cancellation URLs by default. Override `PAYPAL_RETURN_URL` and `PAYPAL_CANCEL_URL` when deploying.

## Run automated tests

Backend tests use local HTTP test servers and mocked provider responses. They do not create a real PayPal order or move money.

```powershell
cd Backend
.\\mvnw.cmd clean test
```

The current working-folder test reports show **71 tests, 0 failures, 0 errors, 0 skipped**. Re-run the command after any code change and before publishing.

Frontend checks:

```powershell
cd Frontend
npm ci
npm run lint
npm run build
```

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend health |
| GET | `/api/catalog/providers` | Provider configuration status, without exposing credentials |
| GET | `/api/products/search` | Structured catalogue search |
| POST | `/api/ai/recommendations` | AI-assisted shopping intent, ranked recommendations and offers |
| POST | `/api/checkout/orders` | Revalidate selected offer and create PayPal Sandbox order |
| GET | `/api/checkout/orders/{orderId}/status` | Read status for an order owned by this backend |
| POST | `/api/checkout/orders/{orderId}/capture` | Verify approval and capture/reconcile the PayPal order |
| POST | `/api/paypal/webhooks` | Verify and process supported PayPal webhook events |

### Checkout request

The browser must send a unique `Idempotency-Key` for every new cart attempt. Reuse the key only for a retry of the exact same cart. The backend rejects missing keys and rejects reuse with a changed cart.

```http
POST /api/checkout/orders
Idempotency-Key: quickown-demo-001
Content-Type: application/json
```

```json
{
  "items": [
    {
      "productId": "PRODUCT_ID_FROM_RECOMMENDATION",
      "productName": "Exact catalogue product title",
      "merchantDomain": "merchant-from-selected-offer",
      "quantity": 1,
      "offerUrl": "exact-productUrl-from-selected-offer"
    }
  ]
}
```

The client does not set the price. The backend calculates it from the current catalogue response. `offerUrl` identifies the exact selected offer when one merchant has multiple offers for the same product. All items in one PayPal order must use the same currency.

## Important prototype limitations

- Checkout state is stored in a local JSON file for a single-instance hackathon prototype. Use a transactional shared database before multi-instance or production deployment.
- Channel3 is the currently configured live catalogue source. Flipkart and Amazon.in remain optional until the required account approvals and API credentials exist.
- The AI interprets intent; product names, prices, stock and merchant URLs come from catalogue providers, not model-generated product facts.
- PayPal capture is a Sandbox payment to the Quick-Own Sandbox merchant. It does **not** purchase the product from the external retailer or guarantee delivery.
- No live payment credentials should be used for the hackathon demo.

## Hackathon submission materials

- [Devpost submission draft](DEVPOST_SUBMISSION.md)
- [Under-three-minute demo script](DEMO_SCRIPT.md)
- [Release and compliance checklist](HACKATHON_RELEASE_CHECKLIST.md)

## Hackathon submission checklist

- [ ] Add a root-level open-source license after all contributors confirm they have the rights to license their contributions.
- [ ] Publish this complete source tree, assets and run instructions to a public GitHub repository.
- [ ] Verify the repository About section displays the chosen license.
- [ ] Run backend tests and frontend lint/build on the final commit.
- [ ] Test the user journey on the same browser/device used in the demo.
- [ ] Record a public YouTube demo under three minutes, without unlicensed music or third-party copyrighted material.
- [ ] Complete the Devpost text description, tools explanation, public repository URL, demo URL/instructions and YouTube link.
