package com.quickown.backend.controller;

import com.quickown.backend.dto.checkout.CaptureOrderResponse;
import com.quickown.backend.dto.checkout.CheckoutRequest;
import com.quickown.backend.dto.checkout.CreateOrderResponse;
import com.quickown.backend.service.payment.CheckoutService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** REST endpoints for creating and capturing PayPal checkout orders. */
@RestController
@RequestMapping("/api/checkout")
public class CheckoutController {

  private final CheckoutService checkoutService;

  public CheckoutController(CheckoutService checkoutService) {
    this.checkoutService = checkoutService;
  }

  @PostMapping("/orders")
  public ResponseEntity<CreateOrderResponse> createOrder(
      @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
      @Valid @RequestBody CheckoutRequest request) {
    CreateOrderResponse response = checkoutService.createOrder(request, idempotencyKey);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PostMapping("/orders/{orderId}/capture")
  public ResponseEntity<CaptureOrderResponse> captureOrder(@PathVariable String orderId) {
    return ResponseEntity.ok(checkoutService.captureOrder(orderId));
  }
}
