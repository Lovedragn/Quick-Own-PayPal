package com.quickown.backend.dto.checkout;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Client cart submitted for server-side price and stock validation. */
public record CheckoutRequest(
    @NotEmpty(message = "Checkout must contain at least one item.")
        @Size(max = 10, message = "Checkout can contain at most 10 distinct items.")
        List<@NotNull @Valid CheckoutItem> items) {}
