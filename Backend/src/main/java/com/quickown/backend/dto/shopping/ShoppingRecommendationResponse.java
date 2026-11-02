package com.quickown.backend.dto.shopping;

import java.util.List;

/** Structured AI shopping results for the frontend. */
public record ShoppingRecommendationResponse(
    ShoppingIntent intent,
    int resultCount,
    List<ShoppingRecommendation> recommendations) {}
