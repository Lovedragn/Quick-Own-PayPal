# Frontend / Backend API Integration Test Report

**Test date:** 2 November 2026
**Frontend origin:** `http://localhost:3000`
**Backend base URL:** `http://localhost:8080`
**Test browser:** Chrome headless, using the actual frontend origin
**Source folder:** `Downloads/Quick-Own-PayPal-main/Quick-Own-PayPal-main`

## Executive result

The frontend is integrated with the Spring Boot backend. The browser-origin API smoke test passed **6/6 checks**. The actual PayPal success and cancellation routes were also opened in Chrome and displayed the expected UI states.

No new PayPal order was created during this integration test. The completed Sandbox order was reused only to verify order-status retrieval and the success-page capture-response handling. An invalid empty cart was used to exercise checkout validation and was rejected before PayPal order creation.

## 1. Frontend-to-backend wiring

The frontend uses:

`API_BASE_URL` or the local fallback `http://localhost:8080`.

| Frontend file / action                             | HTTP request                                  | Backend controller          |
| -------------------------------------------------- | --------------------------------------------- | --------------------------- |
| `src/app/page.js` — natural-language search        | `POST /api/ai/recommendations`                | `AgenticShoppingController` |
| `src/app/page.js` — selected offer checkout        | `POST /api/checkout/orders`                   | `CheckoutController`        |
| `src/app/checkout/success/page.js` — PayPal return | `POST /api/checkout/orders/{orderId}/capture` | `CheckoutController`        |
| `src/app/checkout/cancelled/page.js`               | No API call; renders cancellation state       | Frontend-only route         |

The recommendation response contract expected by the frontend matches the backend DTOs:

- `intent`: search query, category, feature, budget/currency, stock preference and notice.
- `resultCount` and `recommendations[]`.
- `recommendations[].product`: product ID, title/name, source, image and offers.
- `recommendations[].selectedOffer`: merchant, price, currency, availability and product URL.
- `matchedFeatures` and `explanation`.

For checkout, the browser sends product ID, product name, merchant, quantity, exact offer URL and an `Idempotency-Key`. It does not send a price. The backend re-fetches the catalogue offer and calculates the PayPal amount server-side.

The frontend does not directly call `GET /api/products/search` or `GET /api/catalog/providers` today. The main discovery flow calls the AI recommendation endpoint, which orchestrates the catalogue service internally. The two GET endpoints remain available for direct catalogue lookup and provider diagnostics.

## 2. Browser-origin API test results

A temporary smoke page was served by the running Next.js application at `http://localhost:3000`. Chrome executed these requests to `http://localhost:8080`, so the test exercised browser CORS policy and JSON parsing rather than only server-side HTTP calls.

| Test                                                                                    | Actual result                                                                                             | Status   |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------- |
| `GET /api/health`                                                                       | HTTP 200, `status=UP`                                                                                     | **PASS** |
| `GET /api/catalog/providers`                                                            | HTTP 200, market INR; Channel3 configured; Flipkart and Amazon.in not configured                          | **PASS** |
| `GET /api/products/search?query=iPhone%2016&currency=USD`                               | HTTP 200, 7 catalogue results                                                                             | **PASS** |
| `POST /api/ai/recommendations` with `{"message":"Find me an iPhone 16 under $700 USD"}` | HTTP 200, one recommendation; product ID, product name, selected merchant, currency and offer URL present | **PASS** |
| `GET /api/checkout/orders/{id}/status` for the existing Sandbox order                   | HTTP 200, `COMPLETED`, `buyerApproved=true`, USD 565.00                                                   | **PASS** |
| `POST /api/checkout/orders` with an empty cart and an idempotency key                   | HTTP 400, `VALIDATION_ERROR`; no PayPal order created                                                     | **PASS** |

The browser was able to POST JSON from the frontend origin to the backend, which confirms the required CORS preflight and actual cross-origin request succeeded.

**Browser API smoke result: 6/6 passed.**

## 3. Actual frontend route checks

### Home page

- `GET http://localhost:3000/` returned HTTP 200.
- Document title: `Quick-Own | AI Shopping Agent`.
- The frontend JavaScript contains the expected API base URL fallback and API request paths.

### PayPal success page

Chrome opened:

`/checkout/success?token=7PE942427M2325211`

The page called the backend capture endpoint for the existing, already-completed Sandbox order and rendered:

- Payment status: `COMPLETED`
- Total: `565.00 USD`
- PayPal order ID: `7PE942427M2325211`
- Capture ID: `8A7749460E795391X`

This verified the success page's response parsing and receipt fields. It did not create a new Sandbox order.

### PayPal cancellation page

Chrome opened:

`/checkout/cancelled?token=CANCEL-SMOKE-ONLY`

The rendered page contained:

- `Checkout cancelled`
- `Not captured`
- `You can continue shopping`
- `Quick-Own did not request a capture`

This is a frontend-only cancellation state and does not call the capture endpoint.

## 4. Backend test and build evidence

- Maven `clean verify`: **71 tests passed, 0 failures, 0 errors, 0 skipped**.
- Frontend `npm run lint`: passed.
- Frontend `npm run build`: passed.
- Latest GitHub Actions checks for the reviewed source passed the Java 21 backend and Node 22 frontend jobs.

## 5. Existing PayPal Sandbox evidence

The previously created iPhone 16 Sandbox order reached `COMPLETED` after buyer approval.

- Order ID: `7PE942427M2325211`
- Amount: USD 565.00
- Backend status: `COMPLETED`
- Buyer approved: `true`
- Capture ID present in the success response and local order state.

This is a test payment to the Quick-Own Sandbox merchant. It is not an order placed with the external catalogue merchant and does not guarantee retailer fulfilment.

## 6. What was not tested

- The UI's checkout button was not clicked in this test, because doing so with a new cart would create another PayPal Sandbox order. The same cart request shape had already been exercised successfully in the earlier order-creation test.
- A fresh PayPal buyer approval was not repeated; the existing completed order was used for status and success-route verification.
- A live inbound PayPal webhook delivery was not replayed in this browser test. Webhook signature verification and event handling have backend tests; live external webhook delivery requires a configured Sandbox webhook endpoint reachable by PayPal over HTTPS.
- No hosted/deployed frontend or backend environment was tested. All browser tests used localhost.
- Automated frontend unit/E2E tests are not yet part of the project test suite. This report records the one-off Chrome smoke test; it is not a replacement for a maintained Playwright/Cypress suite.

## Conclusion

The frontend is connected to the backend on the intended API base URL. The main recommendation, checkout, and PayPal capture endpoints use matching request/response contracts. Browser CORS, catalogue search, live AI recommendation data, order-status retrieval, invalid-cart validation, success receipt rendering and cancellation rendering all passed the checks recorded above.
