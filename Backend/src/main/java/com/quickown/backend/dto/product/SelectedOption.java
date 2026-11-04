package com.quickown.backend.dto.product;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record SelectedOption(
    String name,
    String label) {}

