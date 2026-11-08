package com.quickown.backend.controller;

import com.quickown.backend.dto.product.ProductResult;
import com.quickown.backend.service.catalog.ProductCatalogService;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** REST endpoints for product discovery and catalogue search. */
@RestController
@RequestMapping({"/api/products", "/api/channel3/products"})
public class ProductController {

  private static final Logger log = LoggerFactory.getLogger(ProductController.class);

  private final ProductCatalogService productCatalogService;

  public ProductController(ProductCatalogService productCatalogService) {
    this.productCatalogService = productCatalogService;
  }

  /** Backwards-compatible direct-call overload used by existing controller tests. */
  public List<ProductResult> searchProducts(String query, boolean inStockOnly) {
    return searchProducts(query, inStockOnly, null);
  }

  /**
   * Resolves a saved product by its catalogue ID so legacy wishlist and order records
   * can restore their product title and image after the original search has ended.
   */
  @GetMapping("/{productId}")
  public ResponseEntity<ProductResult> getProductById(@PathVariable String productId) {
    if (productId == null || productId.isBlank() || productId.length() > 200) {
      return ResponseEntity.badRequest().build();
    }
    ProductResult product = productCatalogService.findById(productId);
    return product == null
        ? ResponseEntity.notFound().build()
        : ResponseEntity.ok(product);
  }

  @GetMapping("/search")
  public List<ProductResult> searchProducts(
      @RequestParam String query,
      @RequestParam(defaultValue = "false") boolean inStockOnly,
      @RequestParam(required = false) String currency) {
    if (query == null || query.isBlank() || query.length() > 250) {
      throw new IllegalArgumentException("query must contain 1-250 characters.");
    }
    log.info("Product search request: query='{}', inStockOnly={}, currency='{}'", query, inStockOnly, currency);
    List<ProductResult> results = productCatalogService.search(query, inStockOnly, currency);
    log.info("Product search response for query='{}': returned {} items -> {}", query, results != null ? results.size() : 0, results);
    return results;
  }
}
