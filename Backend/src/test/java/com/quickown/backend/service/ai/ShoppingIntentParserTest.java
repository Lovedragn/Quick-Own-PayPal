package com.quickown.backend.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ShoppingIntentParserTest {

  private final ShoppingIntentParser parser = new ShoppingIntentParser();

  @Test
  void extractsSearchFeaturesDollarBudgetAndStockConstraint() {
    var intent =
        parser.parse(
            "Find wireless earbuds under $100 with noise cancellation, in stock.",
            """
            {
              "searchQuery": "wireless earbuds",
              "category": "earbuds",
              "requiredFeatures": ["noise cancellation", "long battery life"]
            }
            """);

    assertEquals("wireless earbuds", intent.searchQuery());
    assertEquals("earbuds", intent.category());
    assertEquals(2, intent.requiredFeatures().size());
    assertEquals("100", intent.maxBudget().toPlainString());
    assertEquals("USD", intent.budgetCurrency());
    assertTrue(intent.budgetApplied());
    assertTrue(intent.inStockOnly());
    assertNull(intent.notice());
  }

  @Test
  void extractsIndianRupeeBudgetWithThousandsSeparator() {
    var intent =
        parser.parse(
            "Show wireless headphones below ₹6,000",
            """
            {"searchQuery":"wireless headphones","category":"headphones","requiredFeatures":[]}
            """);

    assertEquals("6000", intent.maxBudget().toPlainString());
    assertEquals("INR", intent.budgetCurrency());
    assertTrue(intent.budgetApplied());
  }

  @Test
  void doesNotAssumeCurrencyWhenCustomerOnlyProvidesANumber() {
    var intent =
        parser.parse(
            "Find headphones under 100",
            """
            {"searchQuery":"headphones","category":"headphones","requiredFeatures":[]}
            """);

    assertEquals("100", intent.maxBudget().toPlainString());
    assertNull(intent.budgetCurrency());
    assertFalse(intent.budgetApplied());
    assertTrue(intent.notice().contains("currency was not specified"));
  }

  @Test
  void parsesGeminiJsonWrappedInMarkdownFence() {
    var intent =
        parser.parse(
            "Find Sony headphones",
            """
            ```json
            {"searchQuery":"Sony headphones","category":"headphones","requiredFeatures":["noise cancellation"]}
            ```
            """);

    assertEquals("Sony headphones", intent.searchQuery());
    assertEquals("noise cancellation", intent.requiredFeatures().get(0));
  }
}
