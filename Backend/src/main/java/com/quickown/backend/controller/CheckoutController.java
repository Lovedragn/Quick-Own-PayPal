package com.quickown.backend.controller;

import com.quickown.backend.dto.checkout.CaptureOrderResponse;
import com.quickown.backend.dto.checkout.CheckoutOrderStatusResponse;
import com.quickown.backend.dto.checkout.CheckoutRedirectResponse;
import com.quickown.backend.dto.checkout.CheckoutRequest;
import com.quickown.backend.dto.checkout.CreateOrderResponse;
import com.quickown.backend.service.payment.CheckoutService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** REST endpoints for creating, returning from and capturing PayPal checkout orders. */
@RestController
@RequestMapping("/api/checkout")
public class CheckoutController {

  private final CheckoutService checkoutService;

  public CheckoutController(CheckoutService checkoutService) {
    this.checkoutService = checkoutService;
  }

  @PostMapping("/orders")
  public ResponseEntity<CreateOrderResponse> createOrder(
      @RequestHeader("Idempotency-Key") String idempotencyKey,
      @Valid @RequestBody CheckoutRequest request) {
    CreateOrderResponse response = checkoutService.createOrder(request, idempotencyKey);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @GetMapping("/return")
  public ResponseEntity<CaptureOrderResponse> paypalReturn(
      @RequestParam("token") String orderId) {
    // PayPal redirects here only after buyer approval. The service independently verifies
    // the PayPal order status and amount before it requests the capture.
    return ResponseEntity.ok(checkoutService.captureOrder(orderId));
  }

  @GetMapping("/cancelled")
  public ResponseEntity<CheckoutRedirectResponse> paypalCancelled(
      @RequestParam(value = "token", required = false) String orderId) {
    CheckoutRedirectResponse response =
        new CheckoutRedirectResponse(
            orderId,
            "CANCELLED",
            "The buyer cancelled PayPal checkout. No capture was requested.",
            null);
    return ResponseEntity.ok(response);
  }

  @GetMapping("/orders/{orderId}/status")
  public ResponseEntity<CheckoutOrderStatusResponse> orderStatus(@PathVariable String orderId) {
    return ResponseEntity.ok(checkoutService.getOrderStatus(orderId));
  }

  @PostMapping("/orders/{orderId}/capture")
  public ResponseEntity<CaptureOrderResponse> captureOrder(@PathVariable String orderId) {
    return ResponseEntity.ok(checkoutService.captureOrder(orderId));
  }
}
