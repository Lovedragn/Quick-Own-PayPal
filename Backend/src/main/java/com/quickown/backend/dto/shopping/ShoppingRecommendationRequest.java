package com.quickown.backend.dto.shopping;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Natural-language shopping request submitted by the customer. */
public record ShoppingRecommendationRequest(
    @NotBlank(message = "message is required.")
        @Size(max = 2000, message = "message must be at most 2000 characters.")
        String message) {}
