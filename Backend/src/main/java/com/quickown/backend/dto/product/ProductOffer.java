package com.quickown.backend.dto.product;

import java.math.BigDecimal;

/** A merchant offer attached to a catalogue product. */
public record ProductOffer(
    String merchant, BigDecimal price, String currency, String availability, String productUrl) {}
