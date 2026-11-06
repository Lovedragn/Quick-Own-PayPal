package com.quickown.backend.dto.product;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record VariantOptionValue(
    String label,
    Boolean exists,
    String available,
    @JsonProperty("thumbnail_url") String thumbnailUrl,
    @JsonProperty("product_id") String productId) {

  @JsonProperty("thumbnailUrl")
  public String getThumbnailUrl() {
    return thumbnailUrl;
  }
}

