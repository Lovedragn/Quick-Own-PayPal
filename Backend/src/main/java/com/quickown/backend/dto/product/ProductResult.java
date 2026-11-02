package com.quickown.backend.dto.product;

import java.util.List;

/** Normalized product model shared by catalogue, AI and checkout layers. */
public record ProductResult(
    String source,
    String productId,
    String name,
    String brand,
    String category,
    String description,
    String imageUrl,
    boolean inStock,
    List<ProductOffer> offers) {}
