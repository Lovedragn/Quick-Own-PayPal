package com.quickown.backend.dto.checkout;

/** Browser response after PayPal redirects the buyer back to the local backend. */
public record CheckoutRedirectResponse(
    String orderId, String status, String message, String captureEndpoint) {}
