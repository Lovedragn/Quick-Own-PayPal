package com.quickown.backend.dto.product;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProductVariants(
    List<VariantOption> options,
    List<SelectedOption> selected) {}

