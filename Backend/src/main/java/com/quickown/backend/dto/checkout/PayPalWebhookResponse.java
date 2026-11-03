package com.quickown.backend.dto.checkout;

/** Acknowledgement returned after PayPal webhook signature verification. */
public record PayPalWebhookResponse(String status, String eventType, boolean orderUpdated) {}
