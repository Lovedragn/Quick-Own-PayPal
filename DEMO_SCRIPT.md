# Quick-Own — 2:45 Demo Video Script

- **Target length:** 2 minutes 45 seconds
- **Capture device:** The same desktop/browser environment used to run Quick-Own
**Demo environment:** PayPal Sandbox only

## Before recording

- Start the backend from `Backend` and verify `http://localhost:8080/api/health` returns `UP`.
- Start the frontend from `Frontend` and open `http://localhost:3000`.
- Confirm `GET /api/catalog/providers` reports Channel3 configured.
- Use the prompt **“Find me an iPhone 16 under $700 USD”**. This query was verified against the live Channel3 catalogue in the current environment.
- Confirm at least one result has a product image, product ID, merchant offer, price, currency and offer URL.
- Keep PayPal Developer credentials and Sandbox buyer credentials off-screen. Do not reveal secrets, OTPs or personal account data.
- Use a PayPal Personal Sandbox buyer account for the approval step.
- Do not use copyrighted music or unlicensed third-party content. A clean voice-over is enough.

## Timed storyboard and narration

### 0:00–0:15 — Problem and promise

**Screen:** Quick-Own home page.

**Say:**

“Shopping starts with a need, not a retailer's filters. Quick-Own is an AI shopping agent that turns a natural-language request into catalogue-backed recommendations and a PayPal checkout approval flow.”

### 0:15–0:45 — AI understands the request

**Screen:** Enter “Find me an iPhone 16 under $700 USD” and click **Find my best buy**. Show the parsed search intent and returned recommendation.

**Say:**

“Gemini, through Spring AI, interprets the request. The backend independently applies the budget and currency constraints. Channel3 supplies the product record and merchant offers. Product names, prices and URLs come from the catalogue—not from AI-generated guesses.”

### 0:45–1:15 — Compare and select an exact offer

**Screen:** Show the iPhone 16 card, source, merchant offer count, offer selector and selected USD price. Change offer only if a second real offer is available in the current response.

**Say:**

“The shopper can compare the offers actually returned by the catalogue and choose one. Quick-Own sends the exact product ID, merchant, offer URL and quantity to the backend. The browser never tells the server what price to charge.”

### 1:15–1:45 — Server-side validation and PayPal order

**Screen:** Click **Continue with PayPal**, then show the PayPal Sandbox approval page.

**Say:**

“The backend searches the catalogue again and checks that the selected product and offer are still valid. It calculates the total on the server, uses an idempotency key to protect retries, and creates a PayPal Orders v2 Sandbox order. The buyer is sent to PayPal to approve it.”

### 1:45–2:15 — Buyer approval and capture

**Screen:** Approve the Sandbox payment using the Personal Sandbox buyer account. Return to Quick-Own and show the capture confirmation with status, amount, currency and capture ID.

**Say:**

“After approval, Quick-Own verifies the PayPal order, amount and currency before capture. The confirmation shows PayPal's capture result. This is a Sandbox payment to the Quick-Own test merchant.”

### 2:15–2:40 — Engineering and honest limitation

**Screen:** Briefly show the architecture/README or endpoint list, then the final UI.

**Say:**

“The stack is Next.js, Java 21, Spring Boot, Gemini, Channel3 and PayPal. Our backend tests cover catalogue integration, offer revalidation, idempotency, capture recovery and webhooks. This prototype demonstrates discovery and PayPal Sandbox checkout; it does not place or fulfil an order with the external retailer.”

### 2:40–2:45 — Close

**Screen:** Quick-Own home page and project name.

**Say:**

“Quick-Own: tell us what you need. We’ll find your best buy.”

## Recording checklist

- [ ] Video is less than three minutes.
- [ ] Shows the project functioning on the actual device/browser.
- [ ] Shows a real live catalogue response, not only a static mock.
- [ ] Shows buyer approval and a completed Sandbox capture.
- [ ] Shows amount and currency clearly.
- [ ] No API keys, secrets, OTPs, personal buyer data or account dashboards visible.
- [ ] No unlicensed music or third-party copyrighted material.
- [ ] Publicly visible on YouTube.
- [ ] YouTube URL copied into the Devpost submission.
