package com.quickown.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.quickown.backend.dto.checkout.CaptureOrderResponse;
import com.quickown.backend.service.payment.CheckoutService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class CheckoutControllerTest {

  @Test
  void capturesPayPalOrderWhenBuyerReturnsFromApproval() {
    CapturingCheckoutService service = new CapturingCheckoutService();
    CheckoutController controller = new CheckoutController(service);

    var response = controller.paypalReturn("PAYPALORDER123");

    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertEquals("PAYPALORDER123", response.getBody().orderId());
    assertEquals("COMPLETED", response.getBody().status());
    assertEquals("CAPTURE123", response.getBody().captureId());
    assertEquals("PAYPALORDER123", service.capturedOrderId);
  }

  private static final class CapturingCheckoutService extends CheckoutService {
    private String capturedOrderId;

    private CapturingCheckoutService() {
      super(null, null, "Quick-Own Test", "", "");
    }

    @Override
    public CaptureOrderResponse captureOrder(String orderId) {
      capturedOrderId = orderId;
      return new CaptureOrderResponse(orderId, "COMPLETED", "CAPTURE123", "USD", "118.00");
    }
  }
}
