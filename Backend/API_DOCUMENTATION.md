# Quick-Own Backend Architecture & API Specification

Comprehensive architectural and API reference for the Quick-Own agentic commerce backend.

---

## 1. System Architecture

The backend is built with **Spring Boot 4 (Java 21)** following clean architectural boundaries and strict domain segregation:

```
src/main/java/com/quickown/backend/
├── ai/
│   └── tool/
│       └── ProductSearchTool.java       # Spring AI Function callback tool for product search
├── catalog/
│   └── MockProductCatalog.java          # Fallback catalogue when external API is unconfigured
├── config/
│   ├── CorsConfig.java                  # Allowed origin and preflight CORS setup
│   └── ElasticsearchConfig.java         # High-level Elasticsearch client bean configuration
├── controller/
│   ├── AiShoppingController.java        # Conversational shopping endpoint (/api/ai/test)
│   ├── CheckoutController.java          # PayPal order creation and capture (/api/checkout)
│   └── ProductController.java           # Product search (/api/products/search & /api/channel3/products/search)
├── dto/
│   ├── ApiErrorResponse.java            # Standardized RFC 7807-style error envelope
│   ├── ai/                              # DTOs for AI request & response
│   ├── checkout/                        # DTOs for cart, order creation, capture, line items
│   └── product/                         # Normalized product & merchant offer representations
├── exception/
│   ├── AiProviderException.java         # AI upstream failure
│   ├── Channel3ApiException.java        # Channel3 catalog upstream failure
│   ├── CheckoutConflictException.java   # Out-of-stock or price mismatch failure
│   ├── GlobalExceptionHandler.java      # Central @RestControllerAdvice mapping exceptions to HTTP status
│   ├── PayPalApiException.java          # PayPal upstream HTTP failure
│   └── PayPalNotConfiguredException.java# Missing PayPal credentials check
├── integration/
│   ├── channel3/
│   │   └── Channel3CatalogClient.java   # Java 21 HttpClient for Channel3 Search API
│   └── paypal/
│       ├── PayPalAuthService.java       # OAuth2 client credentials token cache
│       └── PayPalOrdersClient.java      # PayPal v2 Orders REST client
└── service/
    ├── ai/
    │   └── AiShoppingService.java       # Orchestrates Gemini LLM chat with product search tool
    ├── catalog/
    │   └── ProductCatalogService.java   # Dispatches queries to Channel3 or mock catalog
    └── payment/
        └── CheckoutService.java         # Revalidates prices/stock & executes PayPal orders
```

---

## 2. API Endpoints

### 2.1 Product Search
Search across the Channel3 product catalog (or fallback local mock catalogue).

- **URLs:** 
  - `GET /api/products/search`
  - `GET /api/channel3/products/search` (alias for backward compatibility)
- **Parameters:**
  - `query` (string, required): Search query, 1 to 250 characters.
  - `inStockOnly` (boolean, optional, default: `false`): Filter results by confirmed in-stock offers.

#### Request Example
```http
GET /api/products/search?query=running%20shoes&inStockOnly=true
```

#### Response Example (`200 OK`)
```json
[
  {
    "source": "Channel3",
    "productId": "1V6FAZV",
    "name": "adidas Response 2 Running Shoes",
    "brand": "adidas",
    "category": "Athletic Shoes",
    "description": "These adidas Response 2 running shoes offer a comfortable and functional experience...",
    "imageUrl": "https://cdn.trychannel3.com/d23b7f06-b349-484e-ac52-ac86e872d9c8...",
    "inStock": true,
    "offers": [
      {
        "merchant": "shoebacca.com",
        "price": 46.95,
        "currency": "USD",
        "availability": "InStock",
        "productUrl": "https://buy.trychannel3.com/1V6FAZV-lGBj-PBxiiw?..."
      }
    ]
  }
]
```

---

### 2.2 PayPal Checkout

#### 2.2.1 Create Order
Validates cart items against real-time merchant pricing/availability and creates a PayPal v2 order.

- **URL:** `POST /api/checkout/orders`
- **Headers:**
  - `Content-Type: application/json`
  - `Idempotency-Key` (string, optional): Client-generated UUID to protect against duplicate orders.
- **Request Body:**
```json
{
  "items": [
    {
      "productId": "1V6FAZV",
      "productName": "adidas Response 2 Running Shoes",
      "merchantDomain": "shoebacca.com",
      "quantity": 1
    }
  ]
}
```

#### Response Example (`201 Created`)
```json
{
  "orderId": "5O190127TN364715T",
  "status": "CREATED",
  "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T",
  "currency": "USD",
  "total": "46.95",
  "items": [
    {
      "productName": "adidas Response 2 Running Shoes",
      "merchantDomain": "shoebacca.com",
      "quantity": 1,
      "unitPrice": "46.95",
      "lineTotal": "46.95"
    }
  ]
}
```

---

#### 2.2.2 Capture Order
Executes payment capture after buyer approvals via PayPal frontend modal.

- **URL:** `POST /api/checkout/orders/{orderId}/capture`
- **Path Variable:** `orderId` (string, required): The PayPal Order ID.

#### Response Example (`200 OK`)
```json
{
  "orderId": "5O190127TN364715T",
  "status": "COMPLETED",
  "captureId": "1122334455",
  "currency": "USD",
  "total": "46.95"
}
```

---

### 2.3 AI Assistant Chat
Generates natural-language shopping recommendations with function calling grounded on real catalog data.

- **URL:** `POST /api/ai/test`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "message": "Find comfortable running shoes under 70 dollars"
}
```

#### Response Example (`200 OK`)
```json
{
  "response": "I found adidas Response 2 Running Shoes for $46.95 at shoebacca.com."
}
```

---

## 3. Error Contract

All errors return the standardized `ApiErrorResponse` payload:

```json
{
  "timestamp": "2026-11-02T13:40:00Z",
  "status": 400,
  "error": "BAD_REQUEST",
  "message": "query must contain 1-250 characters.",
  "path": "/api/products/search"
}
```

### Common HTTP Status Codes:
- `400 Bad Request`: Validation failure on request body or parameters.
- `409 Conflict`: Item out of stock or price modified since cart addition.
- `429 Too Many Requests`: Upstream AI model quota exhausted.
- `502 Bad Gateway`: Channel3 or PayPal upstream network error.
- `503 Service Unavailable`: PayPal client credentials or service not configured.

---

## 4. Configuration Reference

All secrets and environment variables are loaded dynamically from environment files:

| Property | Environment Variable | Default | Description |
|---|---|---|---|
| `server.port` | `PORT` | `8080` | Port for the backend server |
| `channel3.api-key` | `CHANNEL3_API_KEY` | *(empty)* | Channel3 catalog API key |
| `channel3.base-url` | `CHANNEL3_BASE_URL` | `https://api.trychannel3.com` | Base URL for Channel3 catalog |
| `paypal.client-id` | `PAYPAL_CLIENT_ID` | *(empty)* | PayPal Sandbox client ID |
| `paypal.client-secret`| `PAYPAL_CLIENT_SECRET` | *(empty)* | PayPal Sandbox client secret |
| `paypal.base-url` | `PAYPAL_BASE_URL` | `https://api-m.sandbox.paypal.com` | PayPal REST API URL |
| `spring.ai.google.genai.api-key` | `GEMINI_API_KEY` | *(empty)* | Google Gemini AI API key |
| `cors.allowed-origin`| `FRONTEND_ORIGIN` | `http://localhost:3000` | Allowed origin for frontend requests |
| `elastic.endpoint` | `ELASTIC_ENDPOINT` | `http://localhost:9200` | Elasticsearch host endpoint |
| `elastic.api-key` | `ELASTIC_API_KEY` | *(empty)* | Elasticsearch authentication key |
