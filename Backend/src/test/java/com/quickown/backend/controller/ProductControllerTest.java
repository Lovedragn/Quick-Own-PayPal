package com.quickown.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.quickown.backend.testutil.TestProductCatalogService;
import org.junit.jupiter.api.Test;

class ProductControllerTest {

  private final ProductController controller =
      new ProductController(new TestProductCatalogService());

  @Test
  void returnsStructuredProductCardsForFrontend() {
    var results = controller.searchProducts("Samsung smartphones", false);

    assertEquals(2, results.size());
    assertEquals("Galaxy M35 5G", results.get(0).name());
    assertEquals("Samsung", results.get(0).brand());
    assertEquals(1, results.get(0).offers().size());
  }

  @Test
  void returnsProductDetailsForSavedProductId() {
    var response = controller.getProductById("4");

    assertEquals(200, response.getStatusCode().value());
    assertEquals("Wireless Headphones 450", response.getBody().name());
  }

  @Test
  void returnsNotFoundWhenSavedProductCannotBeResolved() {
    var response = controller.getProductById("missing-product");
    assertEquals(404, response.getStatusCode().value());
  }

  @Test
  void supportsInStockOnlyFilterForFrontend() {
    var results = controller.searchProducts("wireless earbuds", true);
    assertTrue(results.isEmpty());
  }

  @Test
  void rejectsBlankSearchQuery() {
    try {
      controller.searchProducts("  ", false);
    } catch (IllegalArgumentException expected) {
      assertTrue(expected.getMessage().contains("query"));
      return;
    }
    throw new AssertionError("Expected invalid search query to be rejected.");
  }
}
