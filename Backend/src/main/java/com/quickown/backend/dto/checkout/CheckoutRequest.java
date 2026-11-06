package com.quickown.backend.dto.checkout;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Client cart submitted for server-side price and stock validation. */
public record CheckoutRequest(
    @NotEmpty(message = "Checkout must contain at least one item.")
        @Size(max = 10, message = "Checkout can contain at most 10 distinct items.")
        List<@NotNull @Valid CheckoutItem> items) {

  /**
   * Jackson deserializer allowing either { items: [...] } or a flat single-item object
   * { productId, productName, merchantDomain, quantity, offerUrl }.
   */
  @JsonCreator
  public static CheckoutRequest create(
      @JsonProperty("items") List<CheckoutItem> items,
      @JsonProperty("productId") String productId,
      @JsonProperty("productName") String productName,
      @JsonProperty("merchantDomain") String merchantDomain,
      @JsonProperty("quantity") Integer quantity,
      @JsonProperty("offerUrl") String offerUrl) {
    if (items != null && !items.isEmpty()) {
      return new CheckoutRequest(items);
    }
    if (productId != null && !productId.isBlank()) {
      return new CheckoutRequest(
          List.of(
              new CheckoutItem(
                  productId,
                  productName != null ? productName : "",
                  merchantDomain != null ? merchantDomain : "",
                  quantity != null ? quantity : 1,
                  offerUrl)));
    }
    return new CheckoutRequest(items != null ? items : List.of());
  }
}
