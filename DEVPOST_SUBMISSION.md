# Devpost Submission Draft — Quick-Own

> Review every statement against the final demo before submitting. This draft deliberately describes the product as a PayPal Sandbox prototype, not a completed retailer-purchase or fulfilment system.

## Project title

**Quick-Own — An AI Shopping Agent with Transparent Offers and PayPal Checkout**

## One-line description

Tell Quick-Own what you need. Its AI interprets your shopping intent, finds catalogue-backed products and merchant offers, and prepares a PayPal Sandbox checkout for your approval.

## Inspiration

Online shopping often makes people translate the same need into multiple searches, manually repeat budget and feature filters, and compare offers that may differ by seller, price or availability. We wanted to explore a more natural shopping experience: explain the outcome you want in ordinary language, let an AI agent structure the request, and keep the final product and payment decisions grounded in real catalogue and payment responses.

## What it does

Quick-Own is an AI-assisted shopping discovery and checkout prototype.

1. **Understand intent:** A shopper describes a product, budget, must-have features and preferences in natural language. Google Gemini, through Spring AI, extracts a structured shopping query, product category and requested features.
2. **Find catalogue-backed products:** The backend queries Channel3 and receives product records, images and merchant offers. The backend—not the language model—applies budget, currency and stock constraints.
3. **Explain and compare:** Quick-Own displays ranked product recommendations, matched requested features and the merchant offers returned by the catalogue. Currency fallbacks are disclosed; prices are never silently converted.
4. **Select the exact offer:** The shopper chooses a merchant offer and quantity. The backend fetches the catalogue again and validates the exact product, merchant, offer identity, availability, current price and currency. It does not trust a price supplied by the browser.
5. **Approve with PayPal:** The backend creates a PayPal Orders v2 Sandbox order. The shopper is redirected to PayPal to approve the order. Quick-Own then verifies the approved amount and currency and requests or reconciles the capture. A separate page handles cancellation without requesting capture.

Optional Amazon.in Creators API and Flipkart Affiliate adapters are implemented, but they are disabled until their respective account approvals and API credentials are available. Channel3 is the live configured catalogue source in the current demo.

## How we built it

- **Frontend:** Next.js and React provide the natural-language search, recommendation cards, merchant-offer selection, quantity controls, checkout action and PayPal return/cancel screens.
- **Backend:** Java 21 and Spring Boot expose the shopping and checkout APIs.
- **AI:** Google Gemini through Spring AI interprets the customer's natural-language shopping request. The backend independently validates the budget, currency, availability and returned product data.
- **Product discovery:** Channel3 supplies catalogue products and merchant offers.
- **Payments:** PayPal OAuth 2.0 and the PayPal Orders v2 API are used in the Sandbox environment for order creation, approval, capture, status and recovery.
- **Reliability:** Checkout uses a required idempotency key, server-side repricing, exact offer revalidation, currency checks, persisted order state and duplicate-capture recovery.

## Verified implementation evidence

- Backend Maven verification: 71 tests passed with zero failures, errors or skips.
- Frontend ESLint and optimized production build passed locally and in GitHub Actions.
- GitHub Actions run #1 passed both Java 21 and Node 22 jobs on the public Prapitesh branch.
- A live Gemini + Channel3 iPhone 16 recommendation returned catalogue-backed product and offer data.
- PayPal Sandbox order creation, buyer approval and order-status verification completed for USD 565.00; backend status was `COMPLETED`.

## What is meaningful about the PayPal integration?

PayPal is part of the actual checkout journey, not a decorative link. After a shopper chooses an offer, the backend independently recalculates the cart and creates a PayPal Sandbox order. The buyer must approve the order with PayPal. Quick-Own then checks PayPal's approved amount and currency against its server-calculated total before capture. Capture retries reconcile an already-completed PayPal order instead of blindly charging again.

## What is meaningful about the AI?

Gemini converts natural language into a structured shopping intent. This lets people express needs such as category, budget and features without first knowing the retailer's search filters. The model helps interpret intent; the backend uses catalogue-returned data for product names, offers, prices, availability and merchant URLs.

## Built with

- Java 21
- Spring Boot 4
- Spring AI
- Google Gemini
- Channel3
- PayPal Orders v2 Sandbox
- Next.js
- React
- Tailwind CSS

## Impact

Quick-Own is designed for shoppers who want to start with the need they are trying to satisfy, rather than repeatedly translating it into retailer-specific filters. It brings natural-language intent, catalogue-backed comparisons and payment approval into one demonstrable flow. The prototype also illustrates a safety principle for agentic commerce: an AI may help interpret the request, but the server revalidates the actual selected offer and the buyer still approves the PayPal payment.

## Important demo and payment disclosure

This is a **PayPal Sandbox prototype**. A successful capture is a test payment to the Quick-Own Sandbox merchant. It does **not** place an order with Amazon, Flipkart or a Channel3 merchant and does not guarantee retailer fulfilment. Product links are the merchant URLs returned by the catalogue provider. The demo must not be described as a completed Amazon or Flipkart purchase.

## Tools and how they were used

| Tool | Use |
|---|---|
| Google Gemini | Interprets natural-language shopping intent |
| Spring AI | Integrates Gemini into the Java backend |
| Channel3 | Supplies catalogue products, images and merchant offers |
| PayPal Developer Platform | Sandbox OAuth, Orders v2 creation, approval and capture |
| Next.js / React | Shopper-facing experience and PayPal return/cancel screens |
| Java 21 / Spring Boot | Backend orchestration, validation, integrations and checkout logic |

## Running the project

See the root [README](README.md) for complete local setup, environment variables, test commands, endpoints and the PayPal Sandbox test flow.

## Demo video

Add the publicly accessible YouTube URL here only after recording and checking the final video:

**YouTube demo:** _to be added_

## Public source repository

The complete working source has been synchronized to the public Prapitesh branch. The root-level license is still pending contributor approval and must be resolved before final submission:

**Public repository:** https://github.com/Lovedragn/Quick-Own-PayPal/tree/Prapitesh

## Final submission checks

- [ ] Confirm all contributors agree to the selected open-source license.
- [ ] Add the license at repository root and make sure the repository About section shows it.
- [ ] Synchronize this exact working folder to the public GitHub repository.
- [ ] Verify a clean checkout can install and run both applications.
- [ ] Complete a fresh PayPal Sandbox buyer approval and capture during the final demo rehearsal.
- [ ] Record a public YouTube video under three minutes.
- [ ] Replace all draft placeholders and test every URL on the Devpost form.
