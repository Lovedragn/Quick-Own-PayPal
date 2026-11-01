package com.quickown.backend.service.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.quickown.backend.dto.checkout.CaptureOrderResponse;
import com.quickown.backend.dto.checkout.CheckoutItem;
import com.quickown.backend.dto.checkout.CheckoutLineSummary;
import com.quickown.backend.dto.checkout.CheckoutRequest;
import com.quickown.backend.dto.checkout.CreateOrderResponse;
import com.quickown.backend.dto.product.ProductOffer;
import com.quickown.backend.dto.product.ProductResult;
import com.quickown.backend.exception.CheckoutConflictException;
import com.quickown.backend.exception.PayPalApiException;
import com.quickown.backend.integration.paypal.PayPalOrdersClient;
import com.quickown.backend.service.catalog.ProductCatalogService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Currency;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
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

  public CheckoutService(
      ProductCatalogService productCatalogService,
      PayPalOrdersClient paypal,
      @Value("${paypal.brand-name:Quick-Own}") String brandName,
      @Value("${paypal.return-url:http://localhost:3000/checkout/success}") String returnUrl,
      @Value("${paypal.cancel-url:http://localhost:3000/checkout/cancel}") String cancelUrl) {
    this.productCatalogService = productCatalogService;
    this.paypal = paypal;
    this.brandName = brandName;
    this.returnUrl = returnUrl;
    this.cancelUrl = cancelUrl;
  }

  public synchronized CreateOrderResponse createOrder(
      CheckoutRequest request, String idempotencyKey) {
    validateRequest(request);
    String safeIdempotencyKey =
        idempotencyKey == null || idempotencyKey.isBlank()
            ? UUID.randomUUID().toString()
            : idempotencyKey.trim();

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
    return result;
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
      verifyCaptureAmount(captureDetails, session);
      String captureId = text(captureDetails, "id");
      if (captureId == null || captureId.isBlank()) {
        throw new PayPalApiException(502, "PayPal capture response did not contain a capture ID.");
      }

      CaptureOrderResponse result =
          new CaptureOrderResponse(
              orderId, captureStatus, captureId, session.currency, session.total.toPlainString());
      session.captureResponse = result;
      return result;
    }
  }

  private PricedCart priceCart(List<CheckoutItem> requestedItems) {
    List<CheckoutLine> lines = new ArrayList<>();
    String cartCurrency = null;
    BigDecimal total = BigDecimal.ZERO;

    for (CheckoutItem requested : requestedItems) {
      validateItem(requested);

      List<ProductResult> candidates = productCatalogService.search(requested.productName(), true);

      ProductResult product =
          candidates.stream()
              .filter(
                  candidate -> candidate.name().equalsIgnoreCase(requested.productName().trim()))
              .filter(
                  candidate ->
                      requested.productId() == null
                          || requested.productId().isBlank()
                          || requested.productId().equals(candidate.productId()))
              .findFirst()
              .orElseThrow(
                  () ->
                      new IllegalArgumentException(
                          "Product is no longer available: " + requested.productName()));

      ProductOffer offer =
          product.offers().stream()
              .filter(
                  candidate ->
                      candidate.merchant() != null
                          && candidate
                              .merchant()
                              .equalsIgnoreCase(requested.merchantDomain().trim()))
              .filter(candidate -> isInStock(candidate.availability()))
              .filter(candidate -> candidate.price() != null && candidate.currency() != null)
              .findFirst()
              .orElseThrow(
                  () ->
                      new IllegalArgumentException(
                          "The selected merchant offer is unavailable or out of stock for "
                              + requested.productName()));

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
          .append(';');
    }
    return fingerprint.toString();
  }

  private ObjectNode buildPayPalOrderRequest(PricedCart cart, String checkoutReference) {
    ObjectNode root = mapper.createObjectNode();
    root.put("intent", "CAPTURE");

    ArrayNode purchaseUnits = root.putArray("purchase_units");
    ObjectNode unit = purchaseUnits.addObject();

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
        || item.productName() == null
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

  private boolean isHttpUrl(String value) {
    return value != null && (value.startsWith("https://") || value.startsWith("http://"));
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
