package com.quickown.backend.dto.checkout;

/** Confirmed PayPal capture result. */
public record CaptureOrderResponse(
    String orderId, String status, String captureId, String currency, String total) {}
