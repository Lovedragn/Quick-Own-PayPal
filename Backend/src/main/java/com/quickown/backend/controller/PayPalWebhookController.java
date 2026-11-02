package com.quickown.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.quickown.backend.dto.checkout.PayPalWebhookResponse;
import com.quickown.backend.integration.paypal.PayPalWebhookVerificationClient;
import com.quickown.backend.service.payment.CheckoutService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Receives PayPal events and updates local payment state only after signature verification. */
@RestController
@RequestMapping("/api/paypal/webhooks")
public class PayPalWebhookController {

  private final PayPalWebhookVerificationClient verificationClient;
  private final CheckoutService checkoutService;

  public PayPalWebhookController(
      PayPalWebhookVerificationClient verificationClient, CheckoutService checkoutService) {
    this.verificationClient = verificationClient;
    this.checkoutService = checkoutService;
  }

  @PostMapping
  public ResponseEntity<PayPalWebhookResponse> receive(
      @RequestHeader("PAYPAL-TRANSMISSION-ID") String transmissionId,
      @RequestHeader("PAYPAL-TRANSMISSION-TIME") String transmissionTime,
      @RequestHeader("PAYPAL-TRANSMISSION-SIG") String transmissionSignature,
      @RequestHeader("PAYPAL-CERT-URL") String certificateUrl,
      @RequestHeader("PAYPAL-AUTH-ALGO") String authAlgorithm,
      @RequestBody JsonNode event) {
    boolean verified =
        verificationClient.verify(
            transmissionId,
            transmissionTime,
            transmissionSignature,
            certificateUrl,
            authAlgorithm,
            event);
    if (!verified) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST)
          .body(new PayPalWebhookResponse("REJECTED", text(event, "event_type"), false));
    }

    String eventType = text(event, "event_type");
    boolean updated = processCompletedCapture(eventType, event.path("resource"));
    return ResponseEntity.ok(new PayPalWebhookResponse("RECEIVED", eventType, updated));
  }

  private boolean processCompletedCapture(String eventType, JsonNode resource) {
    if ("CHECKOUT.ORDER.APPROVED".equals(eventType)) {
      String orderId = text(resource, "id");
      if (isBlank(orderId) || !checkoutService.hasCheckoutSession(orderId)) {
        return false;
      }
      // The signed approval event provides a server-to-server path to capture even when
      // the buyer's browser cannot complete the return redirect.
      checkoutService.captureOrder(orderId);
      return true;
    }

    if ("PAYMENT.CAPTURE.COMPLETED".equals(eventType)) {
      String orderId =
          text(resource.path("supplementary_data").path("related_ids"), "order_id");
      return recordCapture(orderId, resource);
    }

    if ("CHECKOUT.ORDER.COMPLETED".equals(eventType)) {
      String orderId = text(resource, "id");
      JsonNode purchaseUnits = resource.path("purchase_units");
      if (!purchaseUnits.isArray() || purchaseUnits.isEmpty()) {
        return false;
      }
      JsonNode captures =
          purchaseUnits.get(0).path("payments").path("captures");
      if (!captures.isArray() || captures.isEmpty()) {
        return false;
      }
      return recordCapture(orderId, captures.get(0));
    }

    // Other events are acknowledged after signature verification. Their state transitions
    // are not inferred from an event we do not explicitly handle.
    return false;
  }

  private boolean recordCapture(String orderId, JsonNode capture) {
    String captureId = text(capture, "id");
    JsonNode amount = capture.path("amount");
    String currency = text(amount, "currency_code");
    String value = text(amount, "value");
    if (isBlank(orderId) || isBlank(captureId) || isBlank(currency) || isBlank(value)) {
      return false;
    }
    if (!"COMPLETED".equalsIgnoreCase(text(capture, "status"))) {
      return false;
    }
    return checkoutService.recordCompletedCapture(orderId, captureId, currency, value);
  }

  private String text(JsonNode node, String field) {
    JsonNode value = node.path(field);
    return value.isMissingNode() || value.isNull() || value.isContainerNode()
        ? null
        : value.asText(null);
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
