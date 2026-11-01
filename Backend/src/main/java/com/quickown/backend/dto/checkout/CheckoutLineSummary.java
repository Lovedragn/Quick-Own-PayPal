package com.quickown.backend.dto.checkout;

/** Server-validated line item included in the order creation response. */
public record CheckoutLineSummary(
    String productId,
    String productName,
    String merchantDomain,
    int quantity,
    String unitPrice,
    String currency) {}
