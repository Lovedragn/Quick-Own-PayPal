package com.quickown.backend.service.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.quickown.backend.dto.checkout.CaptureOrderResponse;
import com.quickown.backend.dto.checkout.CheckoutItem;
import com.quickown.backend.dto.checkout.CheckoutLineSummary;
import com.quickown.backend.dto.checkout.CheckoutOrderStatusResponse;
import com.quickown.backend.dto.checkout.CheckoutRequest;
import com.quickown.backend.dto.checkout.CreateOrderResponse;
import com.quickown.backend.dto.product.ProductOffer;
import com.quickown.backend.dto.product.ProductResult;
import com.quickown.backend.exception.CheckoutConflictException;
import com.quickown.backend.exception.PayPalApiException;
import com.quickown.backend.integration.paypal.PayPalOrdersClient;
import com.quickown.backend.service.catalog.ProductCatalogService;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Currency;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class CheckoutService {

  private final ObjectMapper mapper = new ObjectMapper();
  private final ProductCatalogService productCatalogService;
  private final PayPalOrdersClient paypal;
  private final String brandName;
  private final String returnUrl;
  private final String cancelUrl;

  private final Map<String, CheckoutSession> sessionsByOrderId = new ConcurrentHashMap<>();
  private final Map<String, CreateOrderResponse> ordersByIdempotencyKey = new ConcurrentHashMap<>();
  private final Map<String, String> fingerprintsByIdempotencyKey = new ConcurrentHashMap<>();
  private final Path storageFile;

  /** Spring constructor: checkout state is stored outside target/ so restarts do not lose it. */
  @Autowired
  public CheckoutService(
      ProductCatalogService productCatalogService,
      PayPalOrdersClient paypal,
      @Value("${paypal.brand-name:Quick-Own}") String brandName,
      @Value("${paypal.return-url:http://localhost:8080/api/checkout/return}") String returnUrl,
      @Value("${paypal.cancel-url:http://localhost:8080/api/checkout/cancelled}") String cancelUrl,
      @Value("${checkout.storage-path:./data/checkout-sessions.json}") String storagePath) {
    this(productCatalogService, paypal, brandName, returnUrl, cancelUrl, Path.of(storagePath));
  }

  /** Test-friendly constructor that keeps state in memory unless a storage file is supplied. */
  public CheckoutService(
      ProductCatalogService productCatalogService,
      PayPalOrdersClient paypal,
      String brandName,
      String returnUrl,
      String cancelUrl) {
    this(productCatalogService, paypal, brandName, returnUrl, cancelUrl, (Path) null);
  }

  public CheckoutService(
      ProductCatalogService productCatalogService,
      PayPalOrdersClient paypal,
      String brandName,
      String returnUrl,
      String cancelUrl,
      Path storageFile) {
    this.productCatalogService = productCatalogService;
    this.paypal = paypal;
    this.brandName = brandName;
    this.returnUrl = returnUrl;
    this.cancelUrl = cancelUrl;
    this.storageFile = storageFile == null ? null : storageFile.toAbsolutePath().normalize();
    loadState();
  }

  public synchronized CreateOrderResponse createOrder(
      CheckoutRequest request, String idempotencyKey) {
    validateRequest(request);
    if (idempotencyKey == null || idempotencyKey.isBlank()) {
      throw new IllegalArgumentException(
          "Idempotency-Key is required to safely create a PayPal order.");
    }
    String safeIdempotencyKey = idempotencyKey.trim();

    if (!safeIdempotencyKey.matches("[A-Za-z0-9_-]{8,100}")) {
      throw new IllegalArgumentException(
          "Idempotency-Key must contain 8-100 letters, numbers, hyphens or underscores.");
    }

    String fingerprint = requestFingerprint(request.items());
    CreateOrderResponse previous = ordersByIdempotencyKey.get(safeIdempotencyKey);
    if (previous != null) {
      if (!fingerprint.equals(fingerprintsByIdempotencyKey.get(safeIdempotencyKey))) {
        throw new CheckoutConflictException(
            "The Idempotency-Key was already used with a different cart.");
      }
      return previous;
    }

    PricedCart cart = priceCart(request.items());
    String checkoutReference = UUID.randomUUID().toString();
    ObjectNode paypalRequest = buildPayPalOrderRequest(cart, checkoutReference);

    JsonNode paypalResponse = paypal.createOrder(paypalRequest, safeIdempotencyKey);
    String orderId = requiredText(paypalResponse, "id");
    String status = firstNonBlank(text(paypalResponse, "status"), "CREATED");
    String approvalUrl = findApprovalUrl(paypalResponse.path("links"));
    if (approvalUrl == null) {
      throw new PayPalApiException(
          502, "PayPal created an order but did not return an approval URL.");
    }

    CreateOrderResponse result =
        new CreateOrderResponse(
            orderId,
            status,
            approvalUrl,
            cart.currency(),
            cart.total().toPlainString(),
            cart.lines().stream().map(CheckoutLine::toSummary).toList());

    sessionsByOrderId.put(orderId, new CheckoutSession(cart.currency(), cart.total()));
    ordersByIdempotencyKey.put(safeIdempotencyKey, result);
    fingerprintsByIdempotencyKey.put(safeIdempotencyKey, fingerprint);
    persistState();
    return result;
  }

  public boolean hasCheckoutSession(String orderId) {
    return orderId != null && sessionsByOrderId.containsKey(orderId);
  }

  public CheckoutOrderStatusResponse getOrderStatus(String orderId) {
    if (orderId == null || orderId.isBlank()) {
      throw new IllegalArgumentException("PayPal orderId is required.");
    }

    if (!sessionsByOrderId.containsKey(orderId)) {
      throw new IllegalArgumentException(
          "This order was not created by the current Quick-Own backend instance.");
    }

    JsonNode order = paypal.getOrder(orderId);
    String status = requiredText(order, "status");
    JsonNode purchaseUnits = order.path("purchase_units");
    JsonNode amount =
        purchaseUnits.isArray() && !purchaseUnits.isEmpty()
            ? purchaseUnits.get(0).path("amount")
            : mapper.createObjectNode();

    return new CheckoutOrderStatusResponse(
        orderId,
        status,
        text(amount, "currency_code"),
        text(amount, "value"),
        "APPROVED".equalsIgnoreCase(status) || "COMPLETED".equalsIgnoreCase(status));
  }

  public CaptureOrderResponse captureOrder(String orderId) {
    CheckoutSession session = sessionsByOrderId.get(orderId);
    if (session == null) {
      throw new IllegalArgumentException(
          "This order was not created by the current Quick-Own backend instance.");
    }

    synchronized (session) {
      if (session.captureResponse != null) {
        return session.captureResponse;
      }

      JsonNode approvedOrder = paypal.getOrder(orderId);
      String paypalStatus = text(approvedOrder, "status");

      // A capture can succeed at PayPal immediately before this process stops. On retry,
      // reconcile the completed order instead of attempting a second capture.
      if ("COMPLETED".equalsIgnoreCase(paypalStatus)) {
        return reconcileCompletedOrder(orderId, approvedOrder, session);
      }

      if (!"APPROVED".equalsIgnoreCase(paypalStatus)) {
        throw new CheckoutConflictException(
            "PayPal order must be APPROVED before capture. Current status: " + paypalStatus);
      }

      verifyApprovedAmount(approvedOrder, session);
      JsonNode capture = paypal.captureOrder(orderId, orderId + "-capture");
      String captureStatus = text(capture, "status");

      if (!"COMPLETED".equalsIgnoreCase(captureStatus)) {
        throw new CheckoutConflictException(
            "PayPal did not complete the capture. Current capture status: " + captureStatus);
      }

      JsonNode captureDetails = firstCapture(capture);
      if (captureDetails == null) {
        throw new PayPalApiException(
            502, "PayPal completed the order but did not return capture details.");
      }
      return saveCompletedCapture(orderId, captureDetails, session);
    }
  }

  private CaptureOrderResponse reconcileCompletedOrder(
      String orderId, JsonNode completedOrder, CheckoutSession session) {
    JsonNode captureDetails = firstCapture(completedOrder);
    if (captureDetails == null) {
      throw new PayPalApiException(
          502, "PayPal reports a completed order but returned no capture details.");
    }
    return saveCompletedCapture(orderId, captureDetails, session);
  }

  private CaptureOrderResponse saveCompletedCapture(
      String orderId, JsonNode captureDetails, CheckoutSession session) {
    String captureStatus = text(captureDetails, "status");
    if (!"COMPLETED".equalsIgnoreCase(captureStatus)) {
      throw new CheckoutConflictException(
          "PayPal order is completed but its capture status is " + captureStatus + ".");
    }

    verifyCaptureAmount(captureDetails, session);
    String captureId = requiredText(captureDetails, "id");
    CaptureOrderResponse result =
        new CaptureOrderResponse(
            orderId, "COMPLETED", captureId, session.currency, session.total.toPlainString());
    session.captureResponse = result;
    persistState();
    return result;
  }

  /**
   * Records a capture notification only after PayPal's webhook signature has been verified.
   *
   * @return false when the event refers to an order not owned by this Quick-Own instance
   */
  public boolean recordCompletedCapture(
      String orderId, String captureId, String currency, String amount) {
    CheckoutSession session = sessionsByOrderId.get(orderId);
    if (session == null) {
      return false;
    }

    synchronized (session) {
      if (!session.currency.equalsIgnoreCase(currency)
          || amount == null
          || new BigDecimal(amount).compareTo(session.total) != 0) {
        throw new CheckoutConflictException(
            "PayPal webhook capture amount does not match the server-calculated cart total.");
      }

      if (session.captureResponse != null) {
        if (!session.captureResponse.captureId().equals(captureId)) {
          throw new CheckoutConflictException(
              "A different PayPal capture is already recorded for this order.");
        }
        return true;
      }

      CaptureOrderResponse result =
          new CaptureOrderResponse(
              orderId, "COMPLETED", captureId, session.currency, session.total.toPlainString());
      session.captureResponse = result;
      persistState();
      return true;
    }
  }

  private void loadState() {
    if (storageFile == null || !Files.exists(storageFile)) {
      return;
    }

    try {
      JsonNode root = mapper.readTree(storageFile.toFile());
      JsonNode sessions = root.path("sessions");
      if (sessions.isObject()) {
        sessions.fields().forEachRemaining(
            entry -> {
              JsonNode value = entry.getValue();
              CheckoutSession session =
                  new CheckoutSession(
                      requiredText(value, "currency"),
                      new BigDecimal(requiredText(value, "total")));
              JsonNode savedCapture = value.path("captureResponse");
              if (savedCapture.isObject()) {
                session.captureResponse =
                    mapper.convertValue(savedCapture, CaptureOrderResponse.class);
              }
              sessionsByOrderId.put(entry.getKey(), session);
            });
      }

      JsonNode idempotency = root.path("idempotency");
      if (idempotency.isObject()) {
        idempotency.fields().forEachRemaining(
            entry -> {
              JsonNode value = entry.getValue();
              String fingerprint = requiredText(value, "fingerprint");
              CreateOrderResponse response =
                  mapper.convertValue(value.path("response"), CreateOrderResponse.class);
              ordersByIdempotencyKey.put(entry.getKey(), response);
              fingerprintsByIdempotencyKey.put(entry.getKey(), fingerprint);
            });
      }
    } catch (IOException | RuntimeException exception) {
      throw new IllegalStateException(
          "Could not restore checkout state from " + storageFile + ".", exception);
    }
  }

  private synchronized void persistState() {
    if (storageFile == null) {
      return;
    }

    ObjectNode root = mapper.createObjectNode();
    ObjectNode sessions = root.putObject("sessions");
    sessionsByOrderId.forEach(
        (orderId, session) -> {
          ObjectNode saved = sessions.putObject(orderId);
          saved.put("currency", session.currency);
          saved.put("total", session.total.toPlainString());
          if (session.captureResponse != null) {
            saved.set("captureResponse", mapper.valueToTree(session.captureResponse));
          }
        });

    ObjectNode idempotency = root.putObject("idempotency");
    ordersByIdempotencyKey.forEach(
        (key, response) -> {
          ObjectNode saved = idempotency.putObject(key);
          saved.put("fingerprint", fingerprintsByIdempotencyKey.get(key));
          saved.set("response", mapper.valueToTree(response));
        });

    Path temporaryFile = storageFile.resolveSibling(storageFile.getFileName() + ".tmp");
    try {
      Path parent = storageFile.getParent();
      if (parent != null) {
        Files.createDirectories(parent);
      }
      mapper.writerWithDefaultPrettyPrinter().writeValue(temporaryFile.toFile(), root);
      try {
        Files.move(
            temporaryFile,
            storageFile,
            StandardCopyOption.REPLACE_EXISTING,
            StandardCopyOption.ATOMIC_MOVE);
      } catch (AtomicMoveNotSupportedException ignored) {
        Files.move(temporaryFile, storageFile, StandardCopyOption.REPLACE_EXISTING);
      }
    } catch (IOException exception) {
      throw new IllegalStateException("Could not save checkout state to " + storageFile + ".", exception);
    }
  }

  private PricedCart priceCart(List<CheckoutItem> requestedItems) {
    List<CheckoutLine> lines = new ArrayList<>();
    String cartCurrency = null;
    BigDecimal total = BigDecimal.ZERO;

    for (CheckoutItem requested : requestedItems) {
      validateItem(requested);

      List<ProductResult> candidates = productCatalogService.search(requested.productName(), true, "ANY");

      ProductResult product =
          candidates.stream()
              .filter(
                  candidate -> candidate.name().equalsIgnoreCase(requested.productName().trim()))
              .filter(candidate -> requested.productId().equals(candidate.productId()))
              .findFirst()
              .orElseThrow(
                  () ->
                      new IllegalArgumentException(
                          "Product is no longer available: " + requested.productName()));

      List<ProductOffer> merchantOffers =
          product.offers() == null
              ? List.of()
              : product.offers().stream()
                  .filter(
                      candidate ->
                          candidate.merchant() != null
                              && candidate
                                  .merchant()
                                  .equalsIgnoreCase(requested.merchantDomain().trim()))
                  .filter(candidate -> isInStock(candidate.availability()))
                  .filter(candidate -> candidate.price() != null && candidate.currency() != null)
                  .toList();

      ProductOffer offer;
      if (requested.offerUrl() != null && !requested.offerUrl().isBlank()) {
        offer =
            merchantOffers.stream()
                // Channel3 rotates its attribution "aid" parameter between searches.
                // Keep the product path and offer identifier exact, but ignore that
                // request-specific tracking parameter during server-side revalidation.
                .filter(candidate -> sameOfferUrl(requested.offerUrl(), candidate.productUrl()))
                .findFirst()
                .orElseThrow(
                    () ->
                        new IllegalArgumentException(
                            "The selected offer URL is no longer available for "
                                + requested.productName()));
      } else if (merchantOffers.size() == 1) {
        offer = merchantOffers.get(0);
      } else if (merchantOffers.size() > 1) {
        throw new IllegalArgumentException(
            "This merchant has multiple eligible offers for "
                + requested.productName()
                + ". Send the exact selected offerUrl from the catalogue response.");
      } else {
        throw new IllegalArgumentException(
            "The selected merchant offer is unavailable or out of stock for "
                + requested.productName());
      }

      String currency = offer.currency().toUpperCase(Locale.ROOT);
      int fractionDigits;
      try {
        fractionDigits = Currency.getInstance(currency).getDefaultFractionDigits();
      } catch (IllegalArgumentException exception) {
        throw new IllegalArgumentException("Unsupported offer currency: " + currency);
      }
      if (fractionDigits < 0 || fractionDigits > 3) {
        throw new IllegalArgumentException("Unsupported fraction digits for currency: " + currency);
      }
      if (cartCurrency == null) {
        cartCurrency = currency;
      } else if (!cartCurrency.equals(currency)) {
        throw new IllegalArgumentException(
            "All items in one PayPal checkout must use the same currency. "
                + "This cart contains "
                + cartCurrency
                + " and "
                + currency
                + ".");
      }

      BigDecimal unitPrice;
      try {
        unitPrice = offer.price().setScale(fractionDigits, RoundingMode.UNNECESSARY);
      } catch (ArithmeticException exception) {
        throw new IllegalArgumentException(
            "The selected merchant price has unsupported precision for " + currency + ".");
      }

      int quantity = requested.quantity();
      BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));
      total = total.add(lineTotal);

      lines.add(
          new CheckoutLine(
              product.productId(),
              product.name(),
              product.description(),
              product.imageUrl(),
              offer.merchant(),
              offer.productUrl(),
              quantity,
              unitPrice,
              currency));
    }

    if (total.compareTo(new BigDecimal("1000000")) > 0) {
      throw new IllegalArgumentException("Checkout total exceeds the current MVP limit.");
    }

    int scale = Currency.getInstance(cartCurrency).getDefaultFractionDigits();
    total = total.setScale(scale, RoundingMode.UNNECESSARY);
    return new PricedCart(List.copyOf(lines), cartCurrency, total);
  }

  private String requestFingerprint(List<CheckoutItem> items) {
    StringBuilder fingerprint = new StringBuilder();
    for (CheckoutItem item : items) {
      if (item == null) {
        fingerprint.append("null;");
        continue;
      }
      fingerprint
          .append(item.productId())
          .append('|')
          .append(
              item.productName() == null ? "" : item.productName().trim().toLowerCase(Locale.ROOT))
          .append('|')
          .append(
              item.merchantDomain() == null
                  ? ""
                  : item.merchantDomain().trim().toLowerCase(Locale.ROOT))
          .append('|')
          .append(item.quantity())
          .append('|')
          .append(item.offerUrl() == null ? "" : item.offerUrl().trim())
          .append(';');
    }
    return fingerprint.toString();
  }

  private ObjectNode buildPayPalOrderRequest(PricedCart cart, String checkoutReference) {
    ObjectNode root = mapper.createObjectNode();
    root.put("intent", "CAPTURE");

    ObjectNode paypalExperience =
        root.putObject("payment_source").putObject("paypal").putObject("experience_context");
    paypalExperience.put("brand_name", brandName);
    paypalExperience.put("landing_page", "LOGIN");
    paypalExperience.put("user_action", "PAY_NOW");
    paypalExperience.put("return_url", returnUrl);
    paypalExperience.put("cancel_url", cancelUrl);

    ArrayNode purchaseUnits = root.putArray("purchase_units");
    ObjectNode unit = purchaseUnits.addObject();
    // PayPal carries this server-generated reference through approval and capture.
    unit.put("reference_id", checkoutReference);
    unit.put("custom_id", checkoutReference);

    ObjectNode amount = unit.putObject("amount");
    amount.put("currency_code", cart.currency());
    amount.put("value", cart.total().toPlainString());

    ObjectNode breakdown = amount.putObject("breakdown");
    ObjectNode itemTotal = breakdown.putObject("item_total");
    itemTotal.put("currency_code", cart.currency());
    itemTotal.put("value", cart.total().toPlainString());

    ArrayNode items = unit.putArray("items");
    for (CheckoutLine line : cart.lines()) {
      ObjectNode item = items.addObject();
      item.put("name", truncate(line.name(), 127));
      item.put("quantity", String.valueOf(line.quantity()));

      ObjectNode unitAmount = item.putObject("unit_amount");
      unitAmount.put("currency_code", line.currency());
      unitAmount.put("value", line.unitPrice().toPlainString());
    }

    return root;
  }

  private void verifyApprovedAmount(JsonNode order, CheckoutSession session) {
    JsonNode purchaseUnits = order.path("purchase_units");
    if (!purchaseUnits.isArray() || purchaseUnits.isEmpty()) {
      throw new CheckoutConflictException("Approved PayPal order does not contain purchase units.");
    }
    JsonNode amount = purchaseUnits.get(0).path("amount");
    String currency = text(amount, "currency_code");
    String value = text(amount, "value");

    if (!session.currency.equalsIgnoreCase(currency)
        || value == null
        || new BigDecimal(value).compareTo(session.total) != 0) {
      throw new CheckoutConflictException(
          "Approved PayPal amount does not match the server-calculated cart total.");
    }
  }

  private void validateRequest(CheckoutRequest request) {
    if (request == null || request.items() == null || request.items().isEmpty()) {
      throw new IllegalArgumentException("Checkout must contain at least one item.");
    }
    if (request.items().size() > 10) {
      throw new IllegalArgumentException("A checkout can contain at most 10 distinct items.");
    }
  }

  private void validateItem(CheckoutItem item) {
    if (item == null
        || item.productId() == null
        || item.productId().isBlank()
        || item.productId().length() > 128) {
      throw new IllegalArgumentException("Each cart item must contain a valid productId.");
    }
    if (item.productName() == null
        || item.productName().isBlank()
        || item.productName().length() > 200) {
      throw new IllegalArgumentException("Each cart item must contain a valid productName.");
    }
    if (item.merchantDomain() == null
        || item.merchantDomain().isBlank()
        || item.merchantDomain().length() > 255) {
      throw new IllegalArgumentException(
          "Each cart item must contain the selected merchantDomain.");
    }
    if (item.quantity() < 1 || item.quantity() > 10) {
      throw new IllegalArgumentException("Item quantity must be between 1 and 10.");
    }
    if (item.offerUrl() != null && !item.offerUrl().isBlank()) {
      if (item.offerUrl().length() > 2048 || !isHttpUrl(item.offerUrl().trim())) {
        throw new IllegalArgumentException("offerUrl must be a valid HTTP or HTTPS URL.");
      }
    }
  }

  private String findApprovalUrl(JsonNode links) {
    if (!links.isArray()) {
      return null;
    }
    for (JsonNode link : links) {
      String relation = text(link, "rel");
      if ("approve".equalsIgnoreCase(relation) || "payer-action".equalsIgnoreCase(relation)) {
        return text(link, "href");
      }
    }
    return null;
  }

  private JsonNode firstCapture(JsonNode capture) {
    JsonNode purchaseUnits = capture.path("purchase_units");
    if (purchaseUnits.isArray() && !purchaseUnits.isEmpty()) {
      JsonNode captures = purchaseUnits.get(0).path("payments").path("captures");
      if (captures.isArray() && !captures.isEmpty()) {
        return captures.get(0);
      }
    }
    return null;
  }

  private void verifyCaptureAmount(JsonNode captureDetails, CheckoutSession session) {
    JsonNode amount = captureDetails.path("amount");
    String currency = text(amount, "currency_code");
    String value = text(amount, "value");

    if (!session.currency.equalsIgnoreCase(currency)
        || value == null
        || new BigDecimal(value).compareTo(session.total) != 0) {
      throw new CheckoutConflictException(
          "PayPal capture amount does not match the server-calculated cart total.");
    }
  }

  private boolean isInStock(String availability) {
    if (availability == null) {
      return false;
    }
    String normalized = availability.replaceAll("[^A-Za-z]", "").toLowerCase(Locale.ROOT);
    return normalized.equals("instock")
        || normalized.equals("available")
        || normalized.equals("limitedavailability");
  }

  private boolean sameOfferUrl(String requestedUrl, String currentUrl) {
    String requestedCanonical = canonicalOfferUrl(requestedUrl);
    return requestedCanonical != null
        && requestedCanonical.equals(canonicalOfferUrl(currentUrl));
  }

  /**
   * Normalizes only transport-level differences in a merchant offer URL.
   *
   * <p>Channel3's {@code aid} query parameter is request-specific attribution data and can rotate
   * between a recommendation search and the checkout revalidation search. The product path and
   * every other query parameter (including the offer identifier) remain part of the comparison.
   */
  private String canonicalOfferUrl(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    try {
      URI uri = URI.create(value.trim()).normalize();
      String scheme = uri.getScheme();
      String host = uri.getHost();
      if (scheme == null
          || host == null
          || uri.getUserInfo() != null
          || !("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))) {
        return null;
      }

      String normalizedScheme = scheme.toLowerCase(Locale.ROOT);
      String normalizedHost = host.toLowerCase(Locale.ROOT);
      StringBuilder canonical =
          new StringBuilder(normalizedScheme).append("://").append(normalizedHost);
      int port = uri.getPort();
      if (port != -1
          && !(("https".equals(normalizedScheme) && port == 443)
              || ("http".equals(normalizedScheme) && port == 80))) {
        canonical.append(':').append(port);
      }

      String path = uri.getRawPath();
      if (path != null && !path.isEmpty()) {
        canonical.append(path);
      }

      List<String> queryParameters = new ArrayList<>();
      String rawQuery = uri.getRawQuery();
      if (rawQuery != null && !rawQuery.isBlank()) {
        for (String parameter : rawQuery.split("&")) {
          String key = parameter.split("=", 2)[0];
          if (!"aid".equalsIgnoreCase(key)) {
            queryParameters.add(parameter);
          }
        }
      }
      queryParameters.sort(String::compareTo);
      if (!queryParameters.isEmpty()) {
        canonical.append('?').append(String.join("&", queryParameters));
      }
      return canonical.toString();
    } catch (IllegalArgumentException exception) {
      return null;
    }
  }

  private boolean isHttpUrl(String value) {
    if (value == null || value.isBlank()) {
      return false;
    }
    try {
      URI uri = URI.create(value);
      String scheme = uri.getScheme();
      return ("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme))
          && uri.getHost() != null
          && !uri.getHost().isBlank()
          && uri.getUserInfo() == null;
    } catch (IllegalArgumentException exception) {
      return false;
    }
  }

  private String requiredText(JsonNode node, String field) {
    String value = text(node, field);
    if (value == null || value.isBlank()) {
      throw new PayPalApiException(
          502, "PayPal response did not contain the expected " + field + ".");
    }
    return value;
  }

  private String text(JsonNode node, String field) {
    JsonNode value = node.path(field);
    return value.isMissingNode() || value.isNull() || value.isContainerNode()
        ? null
        : value.asText(null);
  }

  private String firstNonBlank(String first, String fallback) {
    return first == null || first.isBlank() ? fallback : first;
  }

  private String truncate(String value, int maxLength) {
    if (value == null || value.length() <= maxLength) {
      return value;
    }
    return value.substring(0, maxLength);
  }

  private record CheckoutLine(
      String productId,
      String name,
      String description,
      String imageUrl,
      String merchant,
      String productUrl,
      int quantity,
      BigDecimal unitPrice,
      String currency) {
    CheckoutLineSummary toSummary() {
      return new CheckoutLineSummary(
          productId, name, merchant, quantity, unitPrice.toPlainString(), currency);
    }
  }

  private record PricedCart(List<CheckoutLine> lines, String currency, BigDecimal total) {}

  private static final class CheckoutSession {
    private final String currency;
    private final BigDecimal total;
    private CaptureOrderResponse captureResponse;

    private CheckoutSession(String currency, BigDecimal total) {
      this.currency = currency;
      this.total = total;
    }
  }
}
