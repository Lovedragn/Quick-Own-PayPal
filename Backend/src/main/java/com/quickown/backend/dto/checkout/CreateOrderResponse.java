package com.quickown.backend.dto.checkout;

import java.util.List;

/** PayPal order details required by the frontend to redirect the buyer for approval. */
public record CreateOrderResponse(
    String orderId,
    String status,
    String approvalUrl,
    String currency,
    String total,
    List<CheckoutLineSummary> items) {}
