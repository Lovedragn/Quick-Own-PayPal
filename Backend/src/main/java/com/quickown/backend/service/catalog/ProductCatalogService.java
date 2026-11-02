package com.quickown.backend.service.catalog;

import com.quickown.backend.catalog.MockProductCatalog;
import com.quickown.backend.dto.product.ProductOffer;
import com.quickown.backend.dto.product.ProductResult;
import com.quickown.backend.integration.channel3.Channel3CatalogClient;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Application service that selects the configured product catalogue provider and returns the
 * normalized product representation.
 */
@Service
public class ProductCatalogService {

  private final Channel3CatalogClient channel3Client;
  private final MockProductCatalog mockCatalog;

  public ProductCatalogService(
      Channel3CatalogClient channel3Client, MockProductCatalog mockCatalog) {
    this.channel3Client = channel3Client;
    this.mockCatalog = mockCatalog;
  }

  public List<ProductResult> search(String query, boolean inStockOnly) {
    if (query == null || query.isBlank()) {
      return List.of();
    }

    if (channel3Client.isConfigured()) {
      return channel3Client.search(query, inStockOnly);
    }

    return mockCatalog.search(query, inStockOnly).stream().map(this::mapMockProduct).toList();
  }

  private ProductResult mapMockProduct(MockProductCatalog.Product product) {
    ProductOffer offer =
        new ProductOffer(
            "Mock catalogue",
            BigDecimal.valueOf(product.price()),
            "INR",
            product.inStock() ? "InStock" : "OutOfStock",
            null);

    return new ProductResult(
        "Local mock catalogue",
        String.valueOf(product.id()),
        product.name(),
        product.brand(),
        product.category(),
        product.description(),
        null,
        product.inStock(),
        List.of(offer));
  }
}
