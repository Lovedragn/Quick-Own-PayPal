# Quick-Own Frontend

Next.js customer experience for the Quick-Own AI shopping agent.

## Features

- Natural-language shopping request form connected to `POST /api/ai/recommendations`.
- AI intent summary, catalogue-backed recommendations and matched-feature explanations.
- Product cards with merchant-offer selection and quantity.
- PayPal Sandbox order creation using the required `Idempotency-Key`.
- Exact offer URL passed to the backend for server-side revalidation.
- PayPal success page that calls the backend capture endpoint and displays the capture result.
- PayPal cancellation page that clearly states no capture was requested.

## Requirements

- Node.js 20.9 or later
- npm
- Quick-Own Spring Boot backend running at `http://localhost:8080`

## Configure

Create `.env.local` in this directory:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

This value is a public backend URL, not a secret. Never expose Gemini, Channel3 or PayPal secrets through `NEXT_PUBLIC_*` variables.

## Run

```powershell
npm ci
npm run dev
```

Open http://localhost:3000.

## Quality checks

```powershell
npm run lint
npm run build
```

## PayPal return URLs

The backend defaults to:

- Success: `http://localhost:3000/checkout/success`
- Cancellation: `http://localhost:3000/checkout/cancelled`

The success page receives PayPal's `token` query parameter and calls:

`POST /api/checkout/orders/{orderId}/capture`

The backend verifies the order approval, amount and currency before capture. Capture is idempotent and reconciles an already-completed PayPal order.

## Demo disclosure

This is a PayPal Sandbox prototype. A successful capture is a test payment to the Quick-Own Sandbox merchant; it is not a completed purchase from the external retailer.
