package com.quickown.backend.dto.checkout;

/** Read-only status and amount returned by PayPal for a checkout order. */
public record CheckoutOrderStatusResponse(
    String orderId, String status, String currency, String total, boolean buyerApproved) {}
