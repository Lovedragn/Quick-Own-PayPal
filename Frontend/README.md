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
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_COMPLETE_KEY
API_BASE_URL=http://localhost:8080
```

Use the complete Supabase Publishable key from **Project Settings → API Keys** (or the legacy anon JWT key). A truncated prefix or placeholder is not a valid key. Never use a Supabase secret/service-role key in a `NEXT_PUBLIC_*` variable, and never expose Gemini, Channel3 or PayPal secrets to the browser.

### Google OAuth setup

1. In Supabase **Authentication → Providers → Google**, enable Google and configure the Google OAuth client ID and client secret.
2. In Supabase **Authentication → URL Configuration**, set the local Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to the Redirect URLs allowlist.
3. In Google Cloud, set the Authorized redirect URI to `https://YOUR_PROJECT.supabase.co/auth/v1/callback` (the Supabase callback, not the frontend callback).
4. Restart the frontend after changing its environment variables.

QuickOwn uses the PKCE flow. Google and email-confirmation links return to `/auth/callback`, which exchanges the one-time authorization code, verifies that a Supabase session exists, and only then redirects into the app.

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
