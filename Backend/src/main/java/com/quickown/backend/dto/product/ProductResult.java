package com.quickown.backend.dto.product;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/** Normalized product model shared by catalogue, AI and checkout layers. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProductResult(
    String source,
    String productId,
    String name,
    String brand,
    String category,
    String description,
    String imageUrl,
    boolean inStock,
    List<ProductOffer> offers,
    Object variants) {

  public ProductResult(
      String source,
      String productId,
      String name,
      String brand,
      String category,
      String description,
      String imageUrl,
      boolean inStock,
      List<ProductOffer> offers) {
    this(source, productId, name, brand, category, description, imageUrl, inStock, offers, null);
  }
}
