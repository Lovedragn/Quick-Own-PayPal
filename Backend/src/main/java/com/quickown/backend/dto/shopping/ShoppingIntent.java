package com.quickown.backend.dto.shopping;

import java.math.BigDecimal;
import java.util.List;

/** Validated shopping intent extracted from the customer's request. */
public record ShoppingIntent(
    String searchQuery,
    String category,
    List<String> requiredFeatures,
    BigDecimal maxBudget,
    String budgetCurrency,
    boolean budgetApplied,
    boolean inStockOnly,
    String notice) {}
