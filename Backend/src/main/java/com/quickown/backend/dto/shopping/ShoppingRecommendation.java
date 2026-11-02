package com.quickown.backend.dto.shopping;

import com.quickown.backend.dto.product.ProductOffer;
import com.quickown.backend.dto.product.ProductResult;
import java.util.List;

/** One catalogue-backed recommendation with the merchant offer selected for comparison. */
public record ShoppingRecommendation(
    int rank,
    ProductResult product,
    ProductOffer selectedOffer,
    int matchedFeatureCount,
    List<String> matchedFeatures,
    String explanation) {}
