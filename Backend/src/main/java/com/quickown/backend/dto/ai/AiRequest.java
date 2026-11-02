package com.quickown.backend.dto.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Validated request body for the AI shopping assistant. */
public record AiRequest(
    @NotBlank(message = "message is required.")
        @Size(max = 2000, message = "message must be at most 2000 characters.")
        String message) {}
