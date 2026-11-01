package com.quickown.backend.service.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickown.backend.catalog.MockProductCatalog;
import com.quickown.backend.dto.checkout.CheckoutItem;
import com.quickown.backend.dto.checkout.CheckoutRequest;
import com.quickown.backend.exception.CheckoutConflictException;
import com.quickown.backend.integration.channel3.Channel3CatalogClient;
import com.quickown.backend.integration.paypal.PayPalAuthService;
import com.quickown.backend.integration.paypal.PayPalOrdersClient;
import com.quickown.backend.service.catalog.ProductCatalogService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CheckoutServiceTest {

  private final ObjectMapper mapper = new ObjectMapper();
  private HttpServer server;
  private CheckoutService checkoutService;
  private String baseUrl;

  private final AtomicInteger channel3SearchCalls = new AtomicInteger();
  private final AtomicInteger paypalTokenCalls = new AtomicInteger();
  private final AtomicInteger paypalCreateCalls = new AtomicInteger();
  private final AtomicInteger paypalGetCalls = new AtomicInteger();
  private final AtomicInteger paypalCaptureCalls = new AtomicInteger();
  private final AtomicReference<String> receivedPayPalRequestId = new AtomicReference<>();
  private final AtomicReference<JsonNode> receivedCreateBody = new AtomicReference<>();
  private final AtomicReference<String> receivedCaptureRequestId = new AtomicReference<>();
  private final AtomicReference<String> paypalApprovalStatus = new AtomicReference<>("APPROVED");
  private final AtomicReference<String> paypalApprovedAmount = new AtomicReference<>("358.00");
  private final AtomicReference<String> paypalCapturedAmount = new AtomicReference<>("358.00");

  @BeforeEach
  void setUp() throws IOException {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();

    server.createContext("/v1/search", this::handleChannel3Search);
    server.createContext("/v1/oauth2/token", this::handlePayPalToken);
    server.createContext("/v2/checkout/orders", this::handlePayPalOrders);
    server.start();

    Channel3CatalogClient channel3 = new Channel3CatalogClient("test-channel3-key", baseUrl);
    PayPalAuthService auth =
        new PayPalAuthService("test-paypal-client-id", "test-paypal-client-secret", baseUrl);
    PayPalOrdersClient orders = new PayPalOrdersClient(auth, baseUrl);

    ProductCatalogService productCatalogService =
        new ProductCatalogService(channel3, new MockProductCatalog());
    checkoutService =
        new CheckoutService(
            productCatalogService,
            orders,
            "Quick-Own Test",
            "http://localhost:3000/checkout/success",
            "http://localhost:3000/checkout/cancel");
  }

  @AfterEach
  void tearDown() {
    if (server != null) {
      server.stop(0);
    }
  }

  @Test
  void createsApprovesAndCapturesPayPalOrderUsingCurrentChannel3Price() throws Exception {
    var request =
        new CheckoutRequest(
            List.of(
                new CheckoutItem("channel3-bose-001", "Bose QC Earbuds", "shop.example.com", 2)));

    var created = checkoutService.createOrder(request, "checkout-idempotency-001");

    assertEquals("PAYPALORDER123", created.orderId());
    assertEquals("CREATED", created.status());
    assertEquals(
        "https://www.sandbox.paypal.com/checkoutnow?token=PAYPALORDER123", created.approvalUrl());
    assertEquals("USD", created.currency());
    assertEquals("358.00", created.total());
    assertEquals(1, created.items().size());
    assertEquals(2, created.items().get(0).quantity());
    assertEquals("179.00", created.items().get(0).unitPrice());

    assertEquals(1, channel3SearchCalls.get());
    assertEquals(1, paypalTokenCalls.get());
    assertEquals(1, paypalCreateCalls.get());
    assertEquals("checkout-idempotency-001", receivedPayPalRequestId.get());

    JsonNode createBody = receivedCreateBody.get();
    assertEquals("CAPTURE", createBody.path("intent").asText());
    assertEquals(
        "USD",
        createBody.path("purchase_units").get(0).path("amount").path("currency_code").asText());
    assertEquals(
        "358.00", createBody.path("purchase_units").get(0).path("amount").path("value").asText());
    assertEquals(
        "358.00",
        createBody
            .path("purchase_units")
            .get(0)
            .path("amount")
            .path("breakdown")
            .path("item_total")
            .path("value")
            .asText());
    assertEquals(
        "179.00",
        createBody
            .path("purchase_units")
            .get(0)
            .path("items")
            .get(0)
            .path("unit_amount")
            .path("value")
            .asText());
    assertEquals(
        "2",
        createBody.path("purchase_units").get(0).path("items").get(0).path("quantity").asText());

    // Retrying the same create call with the same idempotency key must not create a second PayPal
    // order.
    var retry = checkoutService.createOrder(request, "checkout-idempotency-001");
    assertEquals(created, retry);
    assertEquals(1, paypalCreateCalls.get());

    var changedCart =
        new CheckoutRequest(
            List.of(
                new CheckoutItem("channel3-bose-001", "Bose QC Earbuds", "shop.example.com", 1)));
    assertThrows(
        CheckoutConflictException.class,
        () -> checkoutService.createOrder(changedCart, "checkout-idempotency-001"));
    assertEquals(1, paypalCreateCalls.get());

    var captured = checkoutService.captureOrder(created.orderId());
    assertEquals("PAYPALORDER123", captured.orderId());
    assertEquals("COMPLETED", captured.status());
    assertEquals("CAPTURE123", captured.captureId());
    assertEquals("USD", captured.currency());
    assertEquals("358.00", captured.total());
    assertEquals(1, paypalGetCalls.get());
    assertEquals(1, paypalCaptureCalls.get());
    assertEquals("PAYPALORDER123-capture", receivedCaptureRequestId.get());

    // Duplicate capture calls return the recorded result and never call PayPal twice.
    var captureRetry = checkoutService.captureOrder(created.orderId());
    assertEquals(captured, captureRetry);
    assertEquals(1, paypalCaptureCalls.get());
  }

  @Test
  void rejectsCheckoutWhenSelectedMerchantOfferIsUnavailable() {
    var request =
        new CheckoutRequest(
            List.of(
                new CheckoutItem(
                    "channel3-bose-001", "Bose QC Earbuds", "not-the-selected-store.example", 1)));

    assertThrows(
        IllegalArgumentException.class,
        () -> checkoutService.createOrder(request, "checkout-invalid-merchant"));
    assertEquals(0, paypalCreateCalls.get());
  }

  @Test
  void refusesCaptureUntilPayPalShowsBuyerApproval() {
    var request =
        new CheckoutRequest(
            List.of(
                new CheckoutItem("channel3-bose-001", "Bose QC Earbuds", "shop.example.com", 2)));
    var created = checkoutService.createOrder(request, "checkout-approval-check");
    paypalApprovalStatus.set("CREATED");

    assertThrows(
        CheckoutConflictException.class, () -> checkoutService.captureOrder(created.orderId()));
    assertEquals(0, paypalCaptureCalls.get());
  }

  @Test
  void refusesCaptureWhenPayPalApprovedAmountDoesNotMatchServerTotal() {
    var request =
        new CheckoutRequest(
            List.of(
                new CheckoutItem("channel3-bose-001", "Bose QC Earbuds", "shop.example.com", 2)));
    var created = checkoutService.createOrder(request, "checkout-amount-check");
    paypalApprovedAmount.set("1.00");

    assertThrows(
        CheckoutConflictException.class, () -> checkoutService.captureOrder(created.orderId()));
    assertEquals(0, paypalCaptureCalls.get());
  }

  @Test
  void rejectsCaptureReceiptWithDifferentCurrencyAmount() {
    var request =
        new CheckoutRequest(
            List.of(
                new CheckoutItem("channel3-bose-001", "Bose QC Earbuds", "shop.example.com", 2)));
    var created = checkoutService.createOrder(request, "checkout-capture-amount");
    paypalCapturedAmount.set("1.00");

    assertThrows(
        CheckoutConflictException.class, () -> checkoutService.captureOrder(created.orderId()));
    assertEquals(1, paypalCaptureCalls.get());
  }

  private void handleChannel3Search(HttpExchange exchange) throws IOException {
    channel3SearchCalls.incrementAndGet();
    assertEquals("test-channel3-key", exchange.getRequestHeaders().getFirst("x-api-key"));
    String body =
        """
        {
          "products": [
            {
              "id": "channel3-bose-001",
              "title": "Bose QC Earbuds",
              "brand": {"name": "Bose"},
              "category": "Earbuds",
              "description": "Wireless noise cancelling earbuds",
              "images": [{"url": "https://images.example/bose-qc.jpg"}],
              "offers": [
                {
                  "merchant_domain": "shop.example.com",
                  "price": {"price": 179.00, "currency": "USD"},
                  "availability": "InStock",
                  "url": "https://shop.example.com/bose-qc"
                },
                {
                  "merchant_domain": "other.example.com",
                  "price": {"price": 169.00, "currency": "USD"},
                  "availability": "OutOfStock",
                  "url": "https://other.example.com/bose-qc"
                }
              ]
            }
          ]
        }
        """;
    respond(exchange, 200, body);
  }

  private void handlePayPalToken(HttpExchange exchange) throws IOException {
    paypalTokenCalls.incrementAndGet();
    assertEquals(
        "Basic "
            + java.util.Base64.getEncoder()
                .encodeToString(
                    "test-paypal-client-id:test-paypal-client-secret"
                        .getBytes(StandardCharsets.UTF_8)),
        exchange.getRequestHeaders().getFirst("Authorization"));
    assertEquals(
        "grant_type=client_credentials",
        new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
    respond(
        exchange,
        200,
        """
        {"access_token":"test-access-token","token_type":"Bearer","expires_in":3600}
        """);
  }

  private void handlePayPalOrders(HttpExchange exchange) throws IOException {
    String path = exchange.getRequestURI().getPath();

    if ("/v2/checkout/orders".equals(path) && "POST".equals(exchange.getRequestMethod())) {
      paypalCreateCalls.incrementAndGet();
      assertEquals(
          "Bearer test-access-token", exchange.getRequestHeaders().getFirst("Authorization"));
      receivedPayPalRequestId.set(exchange.getRequestHeaders().getFirst("PayPal-Request-Id"));
      receivedCreateBody.set(mapper.readTree(exchange.getRequestBody().readAllBytes()));
      respond(
          exchange,
          201,
          """
          {
            "id": "PAYPALORDER123",
            "status": "CREATED",
            "links": [
              {
                "href": "https://www.sandbox.paypal.com/checkoutnow?token=PAYPALORDER123",
                "rel": "approve",
                "method": "GET"
              }
            ]
          }
          """);
      return;
    }

    if ("/v2/checkout/orders/PAYPALORDER123".equals(path)
        && "GET".equals(exchange.getRequestMethod())) {
      paypalGetCalls.incrementAndGet();
      String approvedOrderBody =
          """
          {
            "id": "PAYPALORDER123",
            "status": "%s",
            "purchase_units": [
              {
                "amount": {
                  "currency_code": "USD",
                  "value": "%s"
                }
              }
            ]
          }
          """
              .formatted(paypalApprovalStatus.get(), paypalApprovedAmount.get());
      respond(exchange, 200, approvedOrderBody);
      return;
    }

    if ("/v2/checkout/orders/PAYPALORDER123/capture".equals(path)
        && "POST".equals(exchange.getRequestMethod())) {
      paypalCaptureCalls.incrementAndGet();
      receivedCaptureRequestId.set(exchange.getRequestHeaders().getFirst("PayPal-Request-Id"));
      respond(
          exchange,
          201,
          """
          {
            "id": "PAYPALORDER123",
            "status": "COMPLETED",
            "purchase_units": [
              {
                "payments": {
                  "captures": [
                    {
                      "id": "CAPTURE123",
                      "status": "COMPLETED",
                      "amount": {
                        "currency_code": "USD",
                        "value": "%s"
                      }
                    }
                  ]
                }
              }
            ]
          }
          """
              .formatted(paypalCapturedAmount.get()));
      return;
    }

    respond(exchange, 404, "{\"error\":\"not_found\"}");
  }

  private void respond(HttpExchange exchange, int status, String body) throws IOException {
    byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
    exchange.getResponseHeaders().add("Content-Type", "application/json");
    exchange.sendResponseHeaders(status, bytes.length);
    try (var output = exchange.getResponseBody()) {
      output.write(bytes);
    }
  }
}
