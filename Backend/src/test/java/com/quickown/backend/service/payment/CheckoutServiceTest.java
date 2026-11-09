package com.quickown.backend.service.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

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
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class CheckoutServiceTest {

  private final ObjectMapper mapper = new ObjectMapper();
  private HttpServer server;
  private CheckoutService checkoutService;
  private ProductCatalogService productCatalogService;
  private PayPalOrdersClient paypalOrdersClient;
  private Path storageFile;
  @TempDir Path tempDir;
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
    paypalOrdersClient = new PayPalOrdersClient(auth, baseUrl);
    productCatalogService = new ProductCatalogService(channel3);
    storageFile = tempDir.resolve("checkout-sessions.json");
    checkoutService =
        new CheckoutService(
            productCatalogService,
            paypalOrdersClient,
            "Quick-Own Test",
            "http://localhost:3000/checkout/success",
            "http://localhost:3000/checkout/cancel",
            storageFile);
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
        false, createBody.path("purchase_units").get(0).path("custom_id").asText().isBlank());
    JsonNode paypalExperience =
        createBody.path("payment_source").path("paypal").path("experience_context");
    assertEquals("Quick-Own Test", paypalExperience.path("brand_name").asText());
    assertEquals("LOGIN", paypalExperience.path("landing_page").asText());
    assertEquals("PAY_NOW", paypalExperience.path("user_action").asText());
    assertEquals(
        "http://localhost:3000/checkout/success", paypalExperience.path("return_url").asText());
    assertEquals(
        "http://localhost:3000/checkout/cancel", paypalExperience.path("cancel_url").asText());
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
  void restoresPendingCheckoutAndIdempotencyAfterBackendRestart() {
    var request =
        new CheckoutRequest(
            List.of(
                new CheckoutItem("channel3-bose-001", "Bose QC Earbuds", "shop.example.com", 2)));

    var created = checkoutService.createOrder(request, "checkout-persist-restart-001");

    // A new service instance represents a backend restart reading the same local state file.
    CheckoutService restartedService =
        new CheckoutService(
            productCatalogService,
            paypalOrdersClient,
            "Quick-Own Test",
            "http://localhost:3000/checkout/success",
            "http://localhost:3000/checkout/cancel",
            storageFile);

    var retried = restartedService.createOrder(request, "checkout-persist-restart-001");
    assertEquals(created, retried);
    assertEquals(1, paypalCreateCalls.get());

    var captured = restartedService.captureOrder(created.orderId());
    assertEquals("COMPLETED", captured.status());
    assertEquals("CAPTURE123", captured.captureId());
    assertEquals(1, paypalCaptureCalls.get());
  }

  @Test
  void recoversCaptureWhenPayPalCompletedItBeforeBackendRestart() {
    var request =
        new CheckoutRequest(
            List.of(
                new CheckoutItem("channel3-bose-001", "Bose QC Earbuds", "shop.example.com", 2)));
    var created = checkoutService.createOrder(request, "checkout-reconcile-completed-001");

    // Simulate PayPal completing capture just before the backend lost its previous process.
    paypalApprovalStatus.set("COMPLETED");

    CheckoutService restartedService =
        new CheckoutService(
            productCatalogService,
            paypalOrdersClient,
            "Quick-Own Test",
            "http://localhost:3000/checkout/success",
            "http://localhost:3000/checkout/cancel",
            storageFile);
    var recovered = restartedService.captureOrder(created.orderId());

    assertEquals("COMPLETED", recovered.status());
    assertEquals("CAPTURE123", recovered.captureId());
    assertEquals("USD", recovered.currency());
    assertEquals("358.00", recovered.total());
    assertEquals(1, paypalGetCalls.get());
    assertEquals(0, paypalCaptureCalls.get());
  }

  @Test
  void webhookCaptureChecksAmountAndIsIdempotent() {
    var request =
        new CheckoutRequest(
            List.of(
                new CheckoutItem("channel3-bose-001", "Bose QC Earbuds", "shop.example.com", 2)));
    var created = checkoutService.createOrder(request, "checkout-webhook-record-001");

    assertThrows(
        CheckoutConflictException.class,
        () ->
            checkoutService.recordCompletedCapture(
                created.orderId(), "CAPTURE123", "USD", "1.00"));

    assertTrue(
        checkoutService.recordCompletedCapture(
            created.orderId(), "CAPTURE123", "USD", "358.00"));
    assertTrue(
        checkoutService.recordCompletedCapture(
            created.orderId(), "CAPTURE123", "USD", "358.00"));
    assertThrows(
        CheckoutConflictException.class,
        () ->
            checkoutService.recordCompletedCapture(
                created.orderId(), "DIFFERENT_CAPTURE", "USD", "358.00"));
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
  void refusesStatusLookupForAnOrderNotCreatedByThisBackend() {
    assertThrows(
        IllegalArgumentException.class,
        () -> checkoutService.getOrderStatus("EXTERNALORDER123"));
    assertEquals(0, paypalGetCalls.get());
  }

  @Test
  void rejectsMismatchedProductIdEvenWhenTheProductNameMatches() {
    var request =
        new CheckoutRequest(
            List.of(
                new CheckoutItem(
                    "different-product-id", "Bose QC Earbuds", "shop.example.com", 1)));

    assertThrows(
        IllegalArgumentException.class,
        () -> checkoutService.createOrder(request, "checkout-wrong-product-id"));
    assertEquals(0, paypalCreateCalls.get());
  }

  @Test
  void usesSoleCurrentMerchantOfferWhenChannel3RefreshesTheSelectedUrl() {
    ProductCatalogService refreshedCatalog =
        new ProductCatalogService(new Channel3CatalogClient("test-channel3-key", baseUrl)) {
          @Override
          public com.quickown.backend.dto.product.ProductResult findById(String productId) {
            return new com.quickown.backend.dto.product.ProductResult(
                "Channel3",
                "channel3-bose-001",
                "Bose QC Earbuds",
                "Bose",
                "Earbuds",
                "Wireless noise cancelling earbuds",
                "https://images.example/bose-qc.jpg",
                true,
                List.of(
                    new com.quickown.backend.dto.product.ProductOffer(
                        "shop.example.com",
                        new java.math.BigDecimal("179.00"),
                        "USD",
                        "InStock",
                        "https://shop.example.com/bose-qc?aid=current")),
                null,
                List.of());
          }
        };

    CheckoutService refreshedCheckout =
        new CheckoutService(
            refreshedCatalog,
            paypalOrdersClient,
            "Quick-Own Test",
            "http://localhost:3000/checkout/success",
            "http://localhost:3000/checkout/cancel",
            tempDir.resolve("checkout-refreshed-offer.json"));

    var request =
        new CheckoutRequest(
            List.of(
                new CheckoutItem(
                    "channel3-bose-001",
                    "Bose QC Earbuds",
                    "shop.example.com",
                    1,
                    "https://shop.example.com/old-redirect?aid=previous")));

    var created = refreshedCheckout.createOrder(request, "checkout-refreshed-offer");

    assertEquals("179.00", created.total());
    assertEquals("USD", created.currency());
    assertEquals(1, paypalCreateCalls.get());
  }

  @Test
  void refreshesOffersWhenProductDetailOmitsThemAndMatchesCanonicalMerchantDomain() {
    var detailWithoutOffers =
        new com.quickown.backend.dto.product.ProductResult(
            "Channel3",
            "channel3-bose-001",
            "Bose QC Earbuds",
            "Bose",
            "Earbuds",
            "Wireless noise cancelling earbuds",
            "https://images.example/bose-qc.jpg",
            true,
            List.of(),
            null,
            List.of());
    var refreshedProduct =
        new com.quickown.backend.dto.product.ProductResult(
            "Channel3",
            "channel3-bose-001",
            "Bose QC Earbuds",
            "Bose",
            "Earbuds",
            "Wireless noise cancelling earbuds",
            "https://images.example/bose-qc.jpg",
            true,
            List.of(
                new com.quickown.backend.dto.product.ProductOffer(
                    "Amazon",
                    new java.math.BigDecimal("179.00"),
                    "USD",
                    "InStock",
                    "https://www.amazon.com/bose-qc?aid=current")),
            null,
            List.of());
    AtomicInteger refreshedSearchCalls = new AtomicInteger();
    ProductCatalogService refreshedCatalog =
        new ProductCatalogService(new Channel3CatalogClient("test-channel3-key", baseUrl)) {
          @Override
          public com.quickown.backend.dto.product.ProductResult findById(String productId) {
            return detailWithoutOffers;
          }

          @Override
          public List<com.quickown.backend.dto.product.ProductResult> search(
              String query, boolean inStockOnly, String currency) {
            refreshedSearchCalls.incrementAndGet();
            assertEquals("Bose QC Earbuds", query);
            assertEquals(true, inStockOnly);
            assertEquals("ANY", currency);
            return List.of(refreshedProduct);
          }
        };

    CheckoutService refreshedCheckout =
        new CheckoutService(
            refreshedCatalog,
            paypalOrdersClient,
            "Quick-Own Test",
            "http://localhost:3000/checkout/success",
            "http://localhost:3000/checkout/cancel",
            tempDir.resolve("checkout-detail-without-offers.json"));
    var request =
        new CheckoutRequest(
            List.of(
                new CheckoutItem(
                    "channel3-bose-001",
                    "Bose QC Earbuds",
                    "www.amazon.com",
                    1,
                    "https://www.amazon.com/old-product-link?aid=previous")));

    var created = refreshedCheckout.createOrder(request, "checkout-detail-without-offers");

    assertEquals("179.00", created.total());
    assertEquals("USD", created.currency());
    assertEquals(1, refreshedSearchCalls.get());
    assertEquals(1, paypalCreateCalls.get());
  }

  @Test
  void requiresSelectedOfferUrlWhenMerchantHasMultipleEligibleOffers() {
    ProductCatalogService multiOfferCatalog =
        new ProductCatalogService(
            new Channel3CatalogClient("test-channel3-key", baseUrl)) {
          @Override
          public List<com.quickown.backend.dto.product.ProductResult> search(
              String query, boolean inStockOnly, String currency) {
            return List.of(
                new com.quickown.backend.dto.product.ProductResult(
                    "Channel3",
                    "channel3-bose-001",
                    "Bose QC Earbuds",
                    "Bose",
                    "Earbuds",
                    "Wireless noise cancelling earbuds",
                    "https://images.example/bose-qc.jpg",
                    true,
                    List.of(
                        new com.quickown.backend.dto.product.ProductOffer(
                            "shop.example.com",
                            new java.math.BigDecimal("179.00"),
                            "USD",
                            "InStock",
                            "https://shop.example.com/bose-qc?offer=low&aid=fresh"),
                        new com.quickown.backend.dto.product.ProductOffer(
                            "shop.example.com",
                            new java.math.BigDecimal("199.00"),
                            "USD",
                            "InStock",
                            "https://shop.example.com/bose-qc-premium?offer=high&aid=fresh"))));
          }
        };

    CheckoutService multiOfferCheckout =
        new CheckoutService(
            multiOfferCatalog,
            paypalOrdersClient,
            "Quick-Own Test",
            "http://localhost:3000/checkout/success",
            "http://localhost:3000/checkout/cancel",
            tempDir.resolve("checkout-multiple-offers.json"));

    var ambiguousRequest =
        new CheckoutRequest(
            List.of(
                new CheckoutItem(
                    "channel3-bose-001", "Bose QC Earbuds", "shop.example.com", 1)));

    assertThrows(
        IllegalArgumentException.class,
        () -> multiOfferCheckout.createOrder(ambiguousRequest, "checkout-ambiguous-offer"));
    assertEquals(0, paypalCreateCalls.get());

    var staleAmbiguousRequest =
        new CheckoutRequest(
            List.of(
                new CheckoutItem(
                    "channel3-bose-001",
                    "Bose QC Earbuds",
                    "shop.example.com",
                    1,
                    "https://shop.example.com/removed-offer?aid=old")));
    assertThrows(
        IllegalArgumentException.class,
        () ->
            multiOfferCheckout.createOrder(
                staleAmbiguousRequest, "checkout-stale-ambiguous-offer"));
    assertEquals(0, paypalCreateCalls.get());

    var selectedRequest =
        new CheckoutRequest(
            List.of(
                new CheckoutItem(
                    "channel3-bose-001",
                    "Bose QC Earbuds",
                    "shop.example.com",
                    1,
                    "https://shop.example.com/bose-qc-premium?offer=high&aid=original")));

    var created = multiOfferCheckout.createOrder(selectedRequest, "checkout-selected-offer");

    assertEquals("199.00", created.total());
    assertEquals(1, paypalCreateCalls.get());

    var changedOfferSameKey =
        new CheckoutRequest(
            List.of(
                new CheckoutItem(
                    "channel3-bose-001",
                    "Bose QC Earbuds",
                    "shop.example.com",
                    1,
                    "https://shop.example.com/bose-qc?offer=low&aid=original")));

    assertThrows(
        CheckoutConflictException.class,
        () -> multiOfferCheckout.createOrder(changedOfferSameKey, "checkout-selected-offer"));
    assertEquals(1, paypalCreateCalls.get());
  }

  @Test
  void rejectsCheckoutItemsWithoutProductIdBeforeCallingPayPal() {
    var request =
        new CheckoutRequest(
            List.of(new CheckoutItem(null, "Bose QC Earbuds", "shop.example.com", 1)));

    assertThrows(
        IllegalArgumentException.class,
        () -> checkoutService.createOrder(request, "checkout-no-product-id"));
    assertEquals(0, paypalCreateCalls.get());
  }

  @Test
  void rejectsMissingIdempotencyKeyBeforeCallingPayPal() {
    var request =
        new CheckoutRequest(
            List.of(
                new CheckoutItem("channel3-bose-001", "Bose QC Earbuds", "shop.example.com", 1)));

    assertThrows(IllegalArgumentException.class, () -> checkoutService.createOrder(request, null));
    assertEquals(0, paypalCreateCalls.get());
  }

  @Test
  void readsPayPalApprovalStatusWithoutCapturingTheOrder() throws Exception {
    var request =
        new CheckoutRequest(
            List.of(
                new CheckoutItem("channel3-bose-001", "Bose QC Earbuds", "shop.example.com", 2)));
    var created = checkoutService.createOrder(request, "checkout-read-status-001");

    var status = checkoutService.getOrderStatus(created.orderId());

    assertEquals("PAYPALORDER123", status.orderId());
    assertEquals("APPROVED", status.status());
    assertEquals("USD", status.currency());
    assertEquals("358.00", status.total());
    assertEquals(true, status.buyerApproved());
    assertEquals(0, paypalCaptureCalls.get());
  }

  @Test
  void reportsBuyerApprovedWhenPayPalOrderIsAlreadyCompleted() {
    var request =
        new CheckoutRequest(
            List.of(
                new CheckoutItem("channel3-bose-001", "Bose QC Earbuds", "shop.example.com", 2)));
    var created = checkoutService.createOrder(request, "checkout-status-completed-001");
    paypalApprovalStatus.set("COMPLETED");

    var status = checkoutService.getOrderStatus(created.orderId());

    assertEquals("COMPLETED", status.status());
    assertEquals("USD", status.currency());
    assertEquals("358.00", status.total());
    assertEquals(true, status.buyerApproved());
    assertEquals(0, paypalCaptureCalls.get());
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
      String capturedDetails =
          "COMPLETED".equalsIgnoreCase(paypalApprovalStatus.get())
              ? """
                ,"payments":{"captures":[
                  {
                    "id":"CAPTURE123",
                    "status":"COMPLETED",
                    "amount":{"currency_code":"USD","value":"%s"}
                  }
                ]}
                """
                  .formatted(paypalCapturedAmount.get())
              : "";
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
                %s
              }
            ]
          }
          """
              .formatted(
                  paypalApprovalStatus.get(), paypalApprovedAmount.get(), capturedDetails);
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
