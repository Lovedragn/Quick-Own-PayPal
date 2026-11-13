# Quick-Own: Agentic AI Shopping Assistant with Real Catalogue Verification & PayPal Checkout

[![CI Pipeline](https://github.com/Lovedragn/Quick-Own-PayPal/actions/workflows/ci.yml/badge.svg?branch=Prapitesh)](https://github.com/Lovedragn/Quick-Own-PayPal/actions/workflows/ci.yml)
[![Java 21](https://img.shields.io/badge/Java-21-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1.2-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.3-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-blue.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![PayPal Orders v2](https://img.shields.io/badge/PayPal-Orders%20v2%20Sandbox-003087.svg)](https://developer.paypal.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini%20%7C%20Spring%20AI-4285F4.svg)](https://deepmind.google/technologies/gemini/)
[![Channel3](https://img.shields.io/badge/Catalog-Channel3%20API-6366f1.svg)](https://channel3.tv/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20Postgres-3ecf8e.svg)](https://supabase.com/)

---

## 📖 Executive Summary

**Quick-Own** is a production-grade Agentic AI Shopping platform that bridges natural-language product discovery with deterministic, fraud-resistant multi-merchant checkout.

In traditional e-commerce, shoppers spend excessive time juggling multiple retailer tabs, manually re-filtering by price and specifications, and navigating confusing merchant differences. Conversely, standard generative AI chatbots frequently hallucinate product specs, fabricate outdated prices, or link out blindly to dead pages.

Quick-Own solves this problem by strictly separating **intent comprehension** from **catalogue and transactional authority**:
1. **Google Gemini (via Spring AI)** interprets conversational shopper intent (extracting categories, constraints, budget, and desired features).
2. **Channel3 API** retrieves live catalogue data, real-time merchant offers, product images, and vendor URLs.
3. **Deterministic Spring Boot Backend** validates budget, currency, and stock constraints. Client prices are **never** trusted; the server re-fetches and locks in the exact merchant offer.
4. **PayPal Orders v2 Sandbox** coordinates secure customer approval, capture, and idempotent order finalization.
5. **Supabase & Channel3 Threads** preserve seamless conversation continuity, user wishlists, and capture-verified order records protected by Row Level Security (RLS).

> **Prototype Disclaimer:** Quick-Own is demonstrated in the PayPal Sandbox environment. Captures record test payments to the Quick-Own Sandbox merchant account. It does not place live fulfillment orders with Amazon, Flipkart, or third-party merchants.

---

## 🛠️ Complete Tools & Technology Stack

### 1. Backend & Server-Side Orchestration
| Tool / Library | Version | Role & Architectural Purpose |
| :--- | :--- | :--- |
| **Java** | `21 (LTS)` | Core runtime utilizing modern language features, record classes, and virtual thread readiness. |
| **Spring Boot** | `4.1.2` | Core backend framework handling REST endpoints, dependency injection, validation, and security configurations. |
| **Spring AI** | `2.0.2` | High-level abstraction integrating Google Gemini generative models with Spring Boot. |
| **Spring AI Google GenAI** | `spring-ai-starter-model-google-genai` | Native Google GenAI integration to extract structured JSON shopping intent from freeform user queries. |
| **Jakarta Bean Validation** | Starter Validation | Enforces strict API contracts, input constraints, and payload boundaries (`@Valid`, `@NotNull`). |
| **Lombok** | Latest | Eliminates boilerplate code for models, loggers (`@Slf4j`), and builder patterns. |
| **Maven & Wrapper** | `mvnw 3.9+` | Reproducible dependency management and automated testing harness. |

### 2. Frontend & User Interface
| Tool / Library | Version | Role & Architectural Purpose |
| :--- | :--- | :--- |
| **Next.js (App Router)** | `16.4.3` | React full-stack framework with React Server Components, server actions, and edge-ready API routes. |
| **React** | `19.3.0` | Declarative UI rendering, concurrent features, and modern React hooks. |
| **Tailwind CSS** | `^4.0` | Ultra-fast utility-first CSS styling engine with modernized theme tokens and dynamic properties. |
| **GSAP** | `3.15.1` | High-performance visual motion and page transition animations. |
| **Lenis** | `1.3.27` | Butter-smooth inertial scrolling throughout product lists and recommendations. |
| **TanStack React Query** | `^5.107.1` | Asynchronous state management, server cache synchronization, and background data fetching. |
| **Radix UI Primitives** | `^1.8.1` | Accessible, unstyled component primitives for dialogs, dropdowns, and overlays. |
| **Lucide React** | `^1.68.0` | Crisp, tree-shakable modern UI iconography. |
| **Recharts** | `^3.8.0` | Data visualization for budget allocation, merchant price histories, and offer comparisons. |

### 3. AI, Catalogue & Payment Providers
| Provider / SDK | Version / API | Role & Architectural Purpose |
| :--- | :--- | :--- |
| **Google Gemini** | Flash / Pro Models | Extracts shopping intent, categorizes requirements, parses negative constraints, and isolates target features. |
| **Channel3 API & SDK** | `@channel3/sdk 4.6.0` | Live multi-merchant product discovery, offer aggregation, product imagery, and conversational thread management. |
| **PayPal Developer** | `Orders v2 REST API` | Complete payment lifecycle: OAuth2 token generation, order creation, buyer approval redirection, capture, and idempotent reconciliation. |
| **Supabase** | `@supabase/supabase-js 2.119.0` | Cloud PostgreSQL with Row Level Security (RLS), persistent chat history, wishlists, and verified order storage. |
| **Retailer Adapters** | Architecture-ready | Pluggable adapters for Amazon.in Creators API and Flipkart Affiliate API (activated upon credentials provisioning). |

### 4. Quality Assurance, DevOps & CI/CD
| Tool / System | Purpose | Status / Metrics |
| :--- | :--- | :--- |
| **JUnit 5 / Spring Test** | Integration & unit testing for checkout, pricing rules, and mock payment services. | **71 Tests Passing (0 Failures, 0 Skips)** |
| **ESLint & React Compiler** | Static analysis, code styling, and React 19 compiler optimizations. | Clean build verification |
| **GitHub Actions** | Automated CI pipeline verifying Java 21 backend and Node 22 frontend on every commit/PR. | **Passing on branch `Prapitesh`** |

---

## 🏗️ System Architecture & Workflow

```text
                                 [ Shopper Browser ]
                                          |
                        Natural-Language Request / History / Cart
                                          |
                                          v
      +-----------------------------------------------------------------------+
      |                           Next.js 16 (Frontend)                       |
      |  - Natural language search input & prompt refining                    |
      |  - Product cards & merchant offer matrix                              |
      |  - Cart & quantity controls                                           |
      |  - Server route /api/conversations/turn (Channel3 Conversational SDK) |
      |  - Supabase client with RLS for wishlists and saved threads           |
      +-----------------------------------------------------------------------+
                     |                                         |
     POST /api/ai/recommendations                              |
     POST /api/checkout/orders (Idempotency-Key)               | Supabase Auth & DB
                     |                                         v
                     v                         +-------------------------------+
      +-------------------------------+        |       Supabase Postgres       |
      |   Spring Boot 4.1.2 Backend   |        |  - conversations              |
      |-------------------------------|        |  - conversation_turns         |
      | 1. Gemini / Spring AI:        |        |  - user_wishlist_items        |
      |    Structured intent extract  |        |  - user_orders (captured only)|
      |                               |        +-------------------------------+
      | 2. ProductCatalogService:     |                        ^
      |    Channel3 query & rank      |                        |
      |    Filter stock & accessories |                        | Thread Sync
      |                               |                        v
      | 3. Checkout Validation:       |        +-------------------------------+
      |    Re-fetch exact offer       |        |        Channel3 Cloud         |
      |    Verify availability & price|        |  - Live Merchant Offers       |
      |    Currency consistency check |        |  - Conversational Agent Thread|
      |                               |        +-------------------------------+
      | 4. PayPal Service:            |
      |    OAuth 2.0 client token     |
      |    Create Orders v2 Sandbox   |
      +-------------------------------+
                     |
                     v
      +-------------------------------+
      |     PayPal Sandbox API        |
      |  - Orders v2 Create           |
      |  - Buyer Approval URL         |
      +-------------------------------+
                     |
             Buyer Approves Order
                     |
                     v
      +-----------------------------------------------------------------------+
      |                         Frontend Return URL                           |
      |                      /checkout/success?token=...                      |
      +-----------------------------------------------------------------------+
                     |
         POST /api/checkout/orders/{orderId}/capture
                     |
                     v
      +-------------------------------+
      |   Spring Boot Backend Verify  |
      |  - Verify approved amount     |
      |  - Orders v2 Capture          |
      |  - Duplicate-capture recovery |
      |  - Save order in Supabase     |
      +-------------------------------+
```

---

## ⚡ Key Highlights & Engineering Design Principles

### 1. "AI Extracts, Server Enforces"
Language models should never be the source of truth for financial numbers, inventory quantities, or merchant URLs. 
- **Google Gemini** parses user text into structured query terms, category names, budget upper limits, and desired attributes.
- **Spring Boot Backend** queries the live Channel3 catalogue, discards out-of-stock items, enforces budget caps, and detects accessory noise.

### 2. Zero-Trust Client Pricing
The frontend client **never** specifies the price of an item during checkout.
- The client sends only: `productId`, `merchantDomain`, `offerUrl`, and `quantity`.
- The server re-fetches the live offer directly from the catalogue provider, recalculates totals server-side, validates currency consistency across multi-item carts, and sends the authoritative total to PayPal.

### 3. Idempotent Order Creation & Capture Recovery
- All checkout initiation requests require an `Idempotency-Key` header.
- Duplicate requests return the original order safely rather than double-billing.
- The capture route (`/api/checkout/orders/{orderId}/capture`) gracefully reconciles orders that have already reached `COMPLETED` status in PayPal, preventing failure states during temporary browser network interruptions.

### 4. Transparent Currency Handling
Quick-Own prohibits silent currency conversions. If a search is unbudgeted and primary market items are unavailable, fallback currencies (e.g., USD fallback for international merchants) are explicitly declared in the payload and surfaced transparently in the UI.

### 5. Multi-Turn Conversation Continuity
Quick-Own leverages Channel3’s native Conversational Agent API:
- The server initializes a Channel3 thread and stores the `channel3_conversation_id` in Supabase.
- Subsequent chat turns supply the existing `conversation_id`, allowing Channel3 to maintain full conversational memory without requiring fragile local memory summarization.

---

## 📡 API Endpoint Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Healthcheck returning backend uptime and service readiness. |
| `GET` | `/api/catalog/providers` | Lists active and optional catalogue providers without leaking credentials. |
| `GET` | `/api/products/search` | Direct structured search against catalogue providers. |
| `POST` | `/api/ai/recommendations` | Natural-language query entrypoint; returns AI analysis and ranked catalogue offers. |
| `POST` | `/api/checkout/orders` | Re-validates merchant offer and creates PayPal Sandbox Orders v2 order. |
| `GET` | `/api/checkout/orders/{orderId}/status` | Queries internal and PayPal status for an active order. |
| `POST` | `/api/checkout/orders/{orderId}/capture`| Verifies buyer approval and triggers/reconciles PayPal capture. |
| `POST` | `/api/paypal/webhooks` | Listens to and processes signed PayPal webhook events. |

### Sample Checkout Request (`POST /api/checkout/orders`)

```http
POST /api/checkout/orders
Idempotency-Key: quickown-req-9842fbc1
Content-Type: application/json
```

```json
{
  "items": [
    {
      "productId": "ch3_prod_99214a",
      "productName": "Sony WH-1000XM5 Wireless Headphones",
      "merchantDomain": "amazon.com",
      "quantity": 1,
      "offerUrl": "https://www.amazon.com/dp/B09XS7JWHH"
    }
  ]
}
```

---

## 🚀 Getting Started & Local Setup

### 1. Prerequisites
- **Java 21 (LTS)** SDK installed (`java -version`)
- **Node.js 20.9+** and **npm** (`node -v`)
- **Google Gemini API Key** ([Google AI Studio](https://aistudio.google.com/))
- **Channel3 API Key** ([Channel3 Developer Portal](https://channel3.tv/))
- **PayPal Developer Account** with a REST Sandbox App ([PayPal Developer](https://developer.paypal.com/))
- **Supabase Project** (URL and publishable key)

---

### 2. Backend Setup (Spring Boot)

1. Navigate to the `backend/` folder:
   ```powershell
   cd backend
   ```
2. Set the required environment variables in your terminal or IDE run configuration:
   ```powershell
   $env:GEMINI_API_KEY="your-gemini-api-key"
   $env:CHANNEL3_API_KEY="your-channel3-api-key"
   $env:PAYPAL_CLIENT_ID="your-paypal-sandbox-client-id"
   $env:PAYPAL_CLIENT_SECRET="your-paypal-sandbox-client-secret"
   $env:PAYPAL_BASE_URL="https://api-m.sandbox.paypal.com"
   $env:PAYPAL_RETURN_URL="http://localhost:3000/checkout/success"
   $env:PAYPAL_CANCEL_URL="http://localhost:3000/checkout/cancelled"
   $env:CATALOG_CURRENCY="INR"
   $env:CATALOG_FALLBACK_CURRENCY="USD"
   $env:FRONTEND_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
   ```
3. Run the backend application:
   ```powershell
   .\mvnw.cmd spring-boot:run
   ```
4. Verify backend is running:
   ```text
   http://localhost:8080/api/health
   ```

---

### 3. Frontend Setup (Next.js)

1. Navigate to the `frontend/` folder:
   ```powershell
   cd frontend
   ```
2. Create `frontend/.env.local` with the following configuration:
   ```env
   # Backend API
   API_BASE_URL=http://localhost:8080

   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key

   # Channel3 Secret (Server-side route only)
   CHANNEL3_API_KEY=your-channel3-api-key
   ```
3. Install dependencies and run development server:
   ```powershell
   npm ci
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 4. Database Setup (Supabase SQL)

In the Supabase SQL editor, execute the following script from `documentation/supabase_channel3_memory.sql` to initialize Row Level Security, conversation persistence, and order tables:
- `conversations` (stores local ID, title, and `channel3_conversation_id`)
- `conversation_turns` (stores chat turns, user messages, assistant replies, and product snapshots)
- `user_wishlist_items` (user-specific saved items)
- `user_orders` (captured PayPal orders)

---

## 🧪 Testing & Verification

### Run Backend Test Suite
The backend contains comprehensive automated unit and integration tests covering Gemini parsing, catalogue ranking, currency handling, idempotency checks, and PayPal order lifecycle:
```powershell
cd backend
.\mvnw.cmd clean test
```
*Current test metrics: **71 tests, 0 failures, 0 errors, 0 skipped**.*

### Run Frontend Lint & Build Checks
```powershell
cd frontend
npm run lint
npm run build
```

---

## 🛡️ Hackathon Compliance & Security Checklist

- [x] **No Real Payments Moved:** Only PayPal Sandbox credentials and test buyer accounts are utilized.
- [x] **No Hardcoded Secrets:** All credentials, tokens, and keys are strictly loaded via environment variables.
- [x] **Server-Grounded Data:** Product prices and links originate strictly from live Channel3 catalogue responses, never fabricated by AI.
- [x] **Idempotency Protected:** Prevents duplicate orders and charges through mandatory `Idempotency-Key` headers.
- [x] **Cross-Origin Security:** CORS restricted strictly to designated frontend origins.
- [x] **Row Level Security:** User data, wishlists, and orders in Supabase are isolated per authenticated user ID.

---

## 👥 Contributors & Acknowledgements

- **Quick-Own Team**
- Built with Google Gemini, Spring AI, Channel3 API, PayPal Developer Platform, Supabase, and Next.js.

