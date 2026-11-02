package com.quickown.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickown.backend.dto.checkout.CaptureOrderResponse;
import com.quickown.backend.integration.paypal.PayPalAuthService;
import com.quickown.backend.integration.paypal.PayPalWebhookVerificationClient;
import com.quickown.backend.service.payment.CheckoutService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class PayPalWebhookControllerTest {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void acceptsCompletedCaptureOnlyAfterSignatureVerification() throws Exception {
    FakeVerificationClient verifier = new FakeVerificationClient(true);
    FakeCheckoutService checkout = new FakeCheckoutService();
    PayPalWebhookController controller = new PayPalWebhookController(verifier, checkout);

    JsonNode event =
        mapper.readTree(
            """
            {
              "id": "WH-123",
              "event_type": "PAYMENT.CAPTURE.COMPLETED",
              "resource": {
                "id": "CAPTURE123",
                "status": "COMPLETED",
                "amount": {"currency_code": "USD", "value": "118.00"},
                "supplementary_data": {"related_ids": {"order_id": "ORDER123"}}
              }
            }
            """);

    var response =
        controller.receive("transmission-id", "transmission-time", "signature",
            "https://api.paypal.com/cert", "SHA256withRSA", event);

    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertEquals("RECEIVED", response.getBody().status());
    assertTrue(response.getBody().orderUpdated());
    assertEquals("ORDER123", checkout.orderId);
    assertEquals("CAPTURE123", checkout.captureId);
    assertEquals("USD", checkout.currency);
    assertEquals("118.00", checkout.amount);
  }

  @Test
  void rejectsInvalidSignatureAndDoesNotTouchOrderState() throws Exception {
    FakeVerificationClient verifier = new FakeVerificationClient(false);
    FakeCheckoutService checkout = new FakeCheckoutService();
    PayPalWebhookController controller = new PayPalWebhookController(verifier, checkout);

    JsonNode event =
        mapper.readTree(
            """
            {
              "event_type": "PAYMENT.CAPTURE.COMPLETED",
              "resource": {
                "id": "CAPTURE123",
                "status": "COMPLETED",
                "amount": {"currency_code": "USD", "value": "118.00"},
                "supplementary_data": {"related_ids": {"order_id": "ORDER123"}}
              }
            }
            """);

    var response =
        controller.receive("transmission-id", "transmission-time", "bad-signature",
            "https://api.paypal.com/cert", "SHA256withRSA", event);

    assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    assertEquals("REJECTED", response.getBody().status());
    assertFalse(response.getBody().orderUpdated());
    assertEquals(null, checkout.orderId);
  }

  @Test
  void capturesApprovedOrderFromVerifiedWebhookWhenBrowserCannotReturn() throws Exception {
    FakeVerificationClient verifier = new FakeVerificationClient(true);
    FakeCheckoutService checkout = new FakeCheckoutService();
    PayPalWebhookController controller = new PayPalWebhookController(verifier, checkout);

    JsonNode event =
        mapper.readTree(
            """
            {"event_type":"CHECKOUT.ORDER.APPROVED","resource":{"id":"ORDER123"}}
            """);

    var response =
        controller.receive(
            "transmission-id",
            "transmission-time",
            "signature",
            "https://api.paypal.com/cert",
            "SHA256withRSA",
            event);

    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertTrue(response.getBody().orderUpdated());
    assertEquals("ORDER123", checkout.captureRequestedOrderId);
  }

  @Test
  void acknowledgesVerifiedEventsThatDoNotChangePaymentState() throws Exception {
    FakeVerificationClient verifier = new FakeVerificationClient(true);
    FakeCheckoutService checkout = new FakeCheckoutService();
    PayPalWebhookController controller = new PayPalWebhookController(verifier, checkout);

    JsonNode event = mapper.readTree(
        """
        {"event_type":"CHECKOUT.ORDER.PENDING","resource":{"id":"ORDER123"}}
        """);

    var response =
        controller.receive("transmission-id", "transmission-time", "signature",
            "https://api.paypal.com/cert", "SHA256withRSA", event);

    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertEquals("CHECKOUT.ORDER.PENDING", response.getBody().eventType());
    assertFalse(response.getBody().orderUpdated());
    assertEquals(null, checkout.orderId);
  }

  private static final class FakeVerificationClient extends PayPalWebhookVerificationClient {
    private final boolean valid;

    private FakeVerificationClient(boolean valid) {
      super(new PayPalAuthService("", "", "http://localhost"), "http://localhost", "test-webhook");
      this.valid = valid;
    }

    @Override
    public boolean verify(
        String transmissionId,
        String transmissionTime,
        String transmissionSignature,
        String certificateUrl,
        String authAlgorithm,
        JsonNode event) {
      return valid;
    }
  }

  private static final class FakeCheckoutService extends CheckoutService {
    private String orderId;
    private String captureId;
    private String currency;
    private String amount;
    private String captureRequestedOrderId;

    private FakeCheckoutService() {
      super(null, null, "Quick-Own Test", "", "");
    }

    @Override
    public boolean hasCheckoutSession(String orderId) {
      return true;
    }

    @Override
    public CaptureOrderResponse captureOrder(String orderId) {
      captureRequestedOrderId = orderId;
      return new CaptureOrderResponse(orderId, "COMPLETED", "CAPTURE123", "USD", "118.00");
    }

    @Override
    public boolean recordCompletedCapture(
        String orderId, String captureId, String currency, String amount) {
      this.orderId = orderId;
      this.captureId = captureId;
      this.currency = currency;
      this.amount = amount;
      return true;
    }
  }
}
