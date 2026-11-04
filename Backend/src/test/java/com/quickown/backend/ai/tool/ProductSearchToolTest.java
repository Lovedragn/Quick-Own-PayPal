package com.quickown.backend.ai.tool;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.quickown.backend.dto.product.ProductResult;
import com.quickown.backend.testutil.TestProductCatalogService;
import org.junit.jupiter.api.Test;

class ProductSearchToolTest {

  private final ProductSearchTool tool =
      new ProductSearchTool(new TestProductCatalogService());

  @Test
  void toolReturnsOnlyInStockProductsWhenFilterIsTrue() {
    var results = tool.searchProducts("wireless earbuds", true);
    assertTrue(results.isEmpty());
  }

  @Test
  void toolCanReturnOutOfStockProductsWhenFilterIsFalse() {
    var results = tool.searchProducts("wireless earbuds", false);

    assertEquals(1, results.size());
    assertEquals("Redmi Buds 5", results.get(0).name());
    assertTrue(!results.get(0).inStock());
  }

  @Test
  void toolReturnsAllThreeInStockSmartphones() {
    var results = tool.searchProducts("smartphone", true);

    assertEquals(3, results.size());
    assertTrue(results.stream().allMatch(ProductResult::inStock));
  }

  @Test
  void usesCatalogueWhenSearching() {
    var results = tool.searchProducts("Samsung smartphones", false);

    assertEquals(2, results.size());
    assertTrue(
        results.stream().allMatch(product -> product.source().equals("Local mock catalogue")));
  }
}
