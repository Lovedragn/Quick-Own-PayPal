# Backend coding standards

## Package responsibilities

- `controller`: HTTP routing, request binding, response status and delegation only.
- `dto`: API request/response models. Do not return persistence or provider SDK models directly.
- `service`: application use cases and orchestration; no HTTP response construction.
- `integration`: outbound clients and provider-specific request/response handling (Gemini via Spring AI, Channel3 and PayPal).
- `ai/tool`: narrowly scoped functions exposed to Spring AI; delegate to application services.
- `catalog`: local catalogue data and domain search behavior.
- `payment`: payment-domain code; checkout use case lives under `service/payment`.
- `exception`: typed application/provider exceptions and global REST error translation.
- `config`: application infrastructure configuration such as CORS.

## HTTP and error handling

- Controllers must not declare local `@ExceptionHandler` methods.
- Translate exceptions centrally in `exception/GlobalExceptionHandler` using `@RestControllerAdvice`.
- Return the shared `ApiErrorResponse` shape for errors.
- Never return stack traces, raw provider response bodies, API keys, OAuth tokens or secrets.
- Use 400 for invalid requests, 409 for checkout state conflicts, 429 for AI quota exhaustion, 502 for upstream provider failures and 503 for missing required provider configuration.

## DTOs and validation

- Use Java records for immutable request and response DTOs.
- Use Jakarta Bean Validation annotations for untrusted request fields.
- Add `@Valid` to nested request bodies and collection elements.
- Never accept price or currency as authoritative values from the frontend; revalidate selected offers server-side.

## Code style

- Java 21.
- Two-space Java indentation and Google Java Format.
- Explicit imports only; no wildcard imports.
- Prefer constructor injection, immutable fields and small single-purpose classes.
- Use SLF4J; do not use `System.out.println` for application logging.
- Keep provider credentials in environment variables.
- Name classes by responsibility (for example, `AiShoppingController`, not `AiTestController`).
- Add tests for service behavior, integration mapping, validation and exception translation.

## Verification

From the Backend directory:

```powershell
.\mvnw.cmd clean test
```

Format the Java source and test files using Google Java Format 1.24.0 (the version currently used for this refactor).
