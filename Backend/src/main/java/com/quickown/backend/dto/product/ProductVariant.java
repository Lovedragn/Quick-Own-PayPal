package com.quickown.backend.dto.product;

import java.math.BigDecimal;

/** Product variation (color, style, finish) with dedicated image/thumbnail. */
public record ProductVariant(
    String id,
    String label,
    String imageUrl,
    String thumbnailUrl,
    BigDecimal price,
    String currency,
    boolean available) {}

