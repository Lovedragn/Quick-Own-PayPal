# Contributing and Coding Standards

These conventions keep the Quick-Own hackathon project understandable and safe to change. Keep changes focused, test them locally, and update the README or release checklist when behaviour or setup changes.

## Repository layout

- `Backend/src/main/java/com/quickown/backend/controller`: thin HTTP controllers and request/response mapping.
- `Backend/src/main/java/com/quickown/backend/dto`: API request/response records and bean validation.
- `Backend/src/main/java/com/quickown/backend/service`: shopping orchestration, catalogue policy and checkout use cases.
- `Backend/src/main/java/com/quickown/backend/integration`: external Channel3, retailer and PayPal HTTP adapters.
- `Backend/src/main/java/com/quickown/backend/exception`: typed integration/business exceptions and REST error translation.
- `Backend/src/test/java`: tests mirroring the production package structure.
- `Frontend/src/app`: Next.js App Router pages and global styles.

For future frontend growth, move reusable UI into `Frontend/src/components`, shared browser/API helpers into `Frontend/src/lib`, and stateful reusable logic into `Frontend/src/hooks`. Keep route files focused on page composition rather than letting one page own every component and request helper.

For future backend growth, keep controllers thin, business rules in services, and provider-specific request/response handling inside integration adapters. Split classes when they accumulate unrelated responsibilities; the checkout service is currently a large MVP orchestration class and is a candidate for a later, test-led extraction.

## Java and Spring Boot

- Use lowercase package names, `UpperCamelCase` class/type names, `lowerCamelCase` methods/fields, and `UPPER_SNAKE_CASE` constants.
- Use constructor injection. Do not add field injection or static mutable application state.
- Keep controllers limited to HTTP concerns. Put business rules and orchestration in services.
- Use records for simple immutable API DTOs. Add Jakarta Bean Validation constraints for untrusted request fields and apply `@Valid` at controller boundaries.
- Use `BigDecimal` for money. Never calculate currency amounts using `double` or `float`.
- Treat browser-supplied product names, merchant labels, offer URLs, quantities and all prices as untrusted. Re-fetch the catalogue offer and calculate the PayPal amount on the backend.
- Preserve currency explicitly. Do not silently convert currencies or mix currencies in one PayPal order.
- Use typed exceptions for provider and business failures. Do not return stack traces, access tokens, API keys or raw provider payloads to the browser.
- Use SLF4J for server logging. Never use `System.out`, `System.err`, or `printStackTrace()` in production code. Avoid logging credentials, authorization headers, full payment payloads or personal information.
- Preserve the interrupt flag when catching `InterruptedException`.
- Test service rules and provider adapters with deterministic fixtures/mock HTTP responses. Do not make live PayPal charges or depend on live affiliate credentials in unit tests.

## Frontend and React

- Use Next.js App Router conventions. Keep page files focused on layout and page-level state; extract reusable product, offer, search and checkout UI into components as the page grows.
- Use React state/hooks rather than direct DOM mutation for application state.
- Use `next/link` for internal route navigation. Hash links may use ordinary anchors.
- Use semantic headings, buttons, labels and form controls. Every control must have an accessible name; expose errors with `role="alert"` and long-running work with an appropriate live region.
- Keep API calls and response parsing consistent. Show actionable errors; never present a failed or unverified payment as successful.
- Retain an idempotency key for retries of the same checkout cart. Generate a new key only when cart identity changes.
- Never put secrets in `NEXT_PUBLIC_*` variables. Only public, browser-safe configuration (such as the backend base URL) belongs there.
- Do not hard-code product prices or merchant facts in UI. Render catalogue/backend responses.

## Configuration and secrets

- Store Gemini, Channel3, retailer and PayPal secrets in local environment variables or a deployment secret manager.
- Do not commit `.env`, `.env.local`, IntelliJ workspace files containing credentials, local checkout JSON, logs, build output or dependency directories.
- Keep `Frontend/.env.local.example` limited to safe public configuration.
- Use PayPal Sandbox credentials for hackathon testing only.

## Required checks before a commit

From `Backend`:

```powershell
.\mvnw.cmd clean verify
```

From `Frontend`:

```powershell
npm ci
npm run lint
npm run build
```

The GitHub Actions workflow runs backend verification with Java 21 and frontend lint/build with Node 22 for pushes and pull requests to `main` and `Prapitesh`.

## Pull requests

- Keep changes small and explain the user-visible or backend behaviour change.
- Include or update tests for changed business logic.
- Update API/setup documentation and the release checklist when needed.
- Do not claim retailer fulfilment: PayPal Sandbox capture currently pays the Quick-Own Sandbox merchant and does not place an external merchant order.
- Do not add an open-source license until all contributors whose work is included have agreed and the project owner has confirmed the right to license it.
