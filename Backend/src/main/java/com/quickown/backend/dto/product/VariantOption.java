package com.quickown.backend.dto.product;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record VariantOption(
    String name,
    List<VariantOptionValue> values) {}

