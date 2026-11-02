package com.quickown.backend.controller;

import com.quickown.backend.dto.product.ProductResult;
import com.quickown.backend.service.catalog.ProductCatalogService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** REST endpoints for product discovery and catalogue search. */
@RestController
@RequestMapping({"/api/products", "/api/channel3/products"})
public class ProductController {

  private final ProductCatalogService productCatalogService;

  public ProductController(ProductCatalogService productCatalogService) {
    this.productCatalogService = productCatalogService;
  }

  /** Backwards-compatible direct-call overload used by existing controller tests. */
  public List<ProductResult> searchProducts(String query, boolean inStockOnly) {
    return searchProducts(query, inStockOnly, null);
  }

  @GetMapping("/search")
  public List<ProductResult> searchProducts(
      @RequestParam String query,
      @RequestParam(defaultValue = "false") boolean inStockOnly,
      @RequestParam(required = false) String currency) {
    if (query == null || query.isBlank() || query.length() > 250) {
      throw new IllegalArgumentException("query must contain 1-250 characters.");
    }
    return productCatalogService.search(query, inStockOnly, currency);
  }
}
