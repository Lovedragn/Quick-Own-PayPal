# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are online shoppers who know what they want in everyday language (budget, features, use case) and want to find, compare, and buy across merchants without manually jumping between retailer tabs, setting repetitive filters, or deciphering inconsistent merchant pricing.

## Product Purpose

Quick-Own is an AI shopping agent prototype that transforms natural-language product requests into structured catalogue searches, retrieves live merchant offers, allows side-by-side offer evaluation, and facilitates secure PayPal Sandbox checkout. Success means a shopper can move from an unstructured query to an approved, verified test purchase in minutes with full price and merchant transparency.

## Positioning

Unlike typical conversational AI chatbots that hallucinate products and prices or link out blindly, Quick-Own separates intent extraction from catalog authority: Google Gemini (via Spring AI) parses semantic shopping intent, while the server enforces deterministic budget, stock, and currency constraints against real Channel3 catalogue offers. The exact offer and price are re-verified on the server before creating a PayPal Orders v2 transaction, ensuring no stale or fabricated data enters the transaction flow.

## Operating Context

- Used via modern web browsers on desktop and mobile devices.
- Integrates with live Channel3 catalogue API for real-time merchant offers and product media.
- Integrates with PayPal Sandbox REST APIs (Orders v2) for order creation, buyer redirection approval, and capture verification.
- Backend runs Java 21 with Spring Boot 4 and Spring AI; frontend runs Next.js (App Router), React 19, and Tailwind CSS.
- Evaluation occurs in hackathon demo environments and sandbox payment testing.

## Capabilities and Constraints

- **Capabilities:**
  - Natural-language shopping query extraction (category, budget, constraints, key features) via Gemini.
  - Multi-merchant offer discovery and comparison (Channel3).
  - Explicit merchant offer selection and quantity adjustments.
  - Server-side price recalculation, currency validation, and idempotency key protection (`POST /api/checkout/orders`).
  - PayPal Sandbox OAuth, order creation, buyer approval redirection, and server-side capture verification (`POST /api/checkout/orders/{orderId}/capture`).
  - Dedicated return/capture (`/checkout/success`) and cancellation (`/checkout/cancelled`) flows.
  - Support for dark/light theme switching.
- **Constraints:**
  - Hackathon prototype scope: captures test payments to a Sandbox merchant; does not fulfill live orders with Amazon, Flipkart, or third-party retailers.
  - Optional affiliate adapters (Amazon Creators, Flipkart Affiliate) require separate credentials and approval; currently inactive.
  - No silent currency conversion: fallback currencies (e.g. USD fallback if INR unbudgeted) must be explicitly disclosed.
  - Prices supplied by client are never trusted; backend revalidates live catalog offer before order creation.

## Brand Commitments

- Name: Quick-Own
- Voice: Transparent, capable, assistive, grounded, and clear.
- Core visual/interaction commitment: Clean merchant offer presentation, honest pricing disclosures, and unambiguous payment statuses.

## Evidence on Hand

- Verified backend test suite: 71 unit and integration tests passing (`mvn clean test`).
- Production build passing on frontend (Next.js 16 + React 19).
- Tested PayPal Sandbox transactions recorded (`COMPLETED` capture for test buyer orders).
- Sample product discovery demo flows documented in [DEMO_SCRIPT.md](file:///d:/Coding/React/Quick-Own-PayPal/DEMO_SCRIPT.md) and [README.md](file:///d:/Coding/React/Quick-Own-PayPal/README.md).
- Verified live Channel3 catalogue data and image endpoints.

## Product Principles

1. **AI Extracts, Server Enforces:** Language models structure natural-language intent; deterministic backend code validates prices, currency rules, availability, and merchant offers.
2. **Transparent Commerce:** Never disguise currencies or silently swap prices; present merchant offers, shipping notes, and stock states with full transparency.
3. **Buyer in Control:** AI never initiates autonomous transactions; buyer explicitly chooses exact merchant offer, reviews final amounts, and approves payment directly via PayPal.
4. **Resilient Checkout State:** Protect every transaction with idempotency, server re-pricing, and robust capture recovery against duplicate or interrupted web requests.

