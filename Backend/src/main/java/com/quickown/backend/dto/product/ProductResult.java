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
    Object variants,
    List<String> images) {

  public ProductResult(
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
    this(source, productId, name, brand, category, description, imageUrl, inStock, offers, variants, null);
  }

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
    this(source, productId, name, brand, category, description, imageUrl, inStock, offers, null, null);
  }

  public static ProductVariants createDefaultVariants(
      String productId, String name, String imageUrl, boolean inStock) {
    String label = name != null && !name.isBlank() ? name : "Standard Edition";
    VariantOptionValue val =
        new VariantOptionValue(
            label, true, inStock ? "InStock" : "OutOfStock", imageUrl, productId);
    VariantOption opt = new VariantOption("Option", List.of(val));
    SelectedOption sel = new SelectedOption("Option", label);
    return new ProductVariants(List.of(opt), List.of(sel));
  }
}

