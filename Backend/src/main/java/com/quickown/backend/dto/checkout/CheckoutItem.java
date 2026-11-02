package com.quickown.backend.dto.checkout;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** One selected product and merchant offer in the buyer's cart. */
public record CheckoutItem(
    @NotBlank(message = "productId is required.")
        @Size(max = 128, message = "productId must be at most 128 characters.")
        String productId,
    @NotBlank(message = "productName is required.")
        @Size(max = 200, message = "productName must be at most 200 characters.")
        String productName,
    @NotBlank(message = "merchantDomain is required.")
        @Size(max = 255, message = "merchantDomain must be at most 255 characters.")
        String merchantDomain,
    @Min(value = 1, message = "quantity must be at least 1.")
        @Max(value = 10, message = "quantity must not exceed 10.")
        int quantity,
    @Size(max = 2048, message = "offerUrl must be at most 2048 characters.")
        String offerUrl) {

  /** Backwards-compatible constructor for a merchant with one eligible offer. */
  public CheckoutItem(
      String productId, String productName, String merchantDomain, int quantity) {
    this(productId, productName, merchantDomain, quantity, null);
  }
}
