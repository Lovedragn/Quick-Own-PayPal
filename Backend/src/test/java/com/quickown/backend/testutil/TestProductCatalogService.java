package com.quickown.backend.testutil;

import com.quickown.backend.dto.product.ProductOffer;
import com.quickown.backend.dto.product.ProductResult;
import com.quickown.backend.integration.channel3.Channel3CatalogClient;
import com.quickown.backend.service.catalog.ProductCatalogService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

/** Test-only stub catalogue service used by unit tests. */
public class TestProductCatalogService extends ProductCatalogService {

  private static final List<ProductResult> TEST_PRODUCTS =
      List.of(
          new ProductResult(
              "Local mock catalogue",
              "1",
              "Galaxy M35 5G",
              "Samsung",
              "Smartphone",
              "6GB RAM, 128GB storage, 6000mAh battery",
              null,
              true,
              List.of(
                  new ProductOffer(
                      "Mock catalogue", new BigDecimal("17999"), "INR", "InStock", null)),
              ProductResult.createDefaultVariants("1", "Galaxy M35 5G (Midnight Blue)", null, true)),
          new ProductResult(
              "Local mock catalogue",
              "2",
              "Galaxy A16 5G",
              "Samsung",
              "Smartphone",
              "8GB RAM, 128GB storage, AMOLED display",
              null,
              true,
              List.of(
                  new ProductOffer(
                      "Mock catalogue", new BigDecimal("15999"), "INR", "InStock", null)),
              ProductResult.createDefaultVariants("2", "Galaxy A16 5G (Light Green)", null, true)),
          new ProductResult(
              "Local mock catalogue",
              "3",
              "Nord CE 4 Lite",
              "OnePlus",
              "Smartphone",
              "8GB RAM, 128GB storage, 5500mAh battery",
              null,
              true,
              List.of(
                  new ProductOffer(
                      "Mock catalogue", new BigDecimal("19999"), "INR", "InStock", null)),
              ProductResult.createDefaultVariants("3", "Nord CE 4 Lite (Super Silver)", null, true)),
          new ProductResult(
              "Local mock catalogue",
              "4",
              "Wireless Headphones 450",
              "Sony",
              "Headphones",
              "Wireless headphones with noise cancellation",
              null,
              true,
              List.of(
                  new ProductOffer(
                      "Mock catalogue", new BigDecimal("4999.0"), "INR", "InStock", null)),
              ProductResult.createDefaultVariants("4", "Wireless Headphones 450 (Black)", null, true)),
          new ProductResult(
              "Local mock catalogue",
              "5",
              "Redmi Buds 5",
              "Xiaomi",
              "Earbuds",
              "Wireless earbuds with active noise cancellation",
              null,
              false,
              List.of(
                  new ProductOffer(
                      "Mock catalogue", new BigDecimal("2499"), "INR", "OutOfStock", null)),
              ProductResult.createDefaultVariants("5", "Redmi Buds 5 (White)", null, false)));

  public TestProductCatalogService() {
    super(new Channel3CatalogClient("test-key", "https://api.trychannel3.com"));
  }

  @Override
  public List<ProductResult> search(String query, boolean inStockOnly, String currency) {
    if (query == null || query.isBlank() || query.length() > 250) {
      throw new IllegalArgumentException("query must contain 1-250 characters.");
    }
    String q = query.toLowerCase(Locale.ROOT);
    boolean hasSamsung = q.contains("samsung");
    boolean hasSmartphone = q.contains("smartphone");
    boolean hasEarbud = q.contains("earbud");
    boolean hasHeadphone = q.contains("headphone");

    return TEST_PRODUCTS.stream()
        .filter(p -> !inStockOnly || p.inStock())
        .filter(
            p -> {
              if (hasSamsung && hasSmartphone) {
                return p.brand().equalsIgnoreCase("Samsung")
                    && p.category().equalsIgnoreCase("Smartphone");
              }
              return p.name().toLowerCase(Locale.ROOT).contains(q)
                  || p.brand().toLowerCase(Locale.ROOT).contains(q)
                  || p.category().toLowerCase(Locale.ROOT).contains(q)
                  || p.description().toLowerCase(Locale.ROOT).contains(q)
                  || (hasSmartphone && p.category().equalsIgnoreCase("Smartphone"))
                  || (hasEarbud && p.category().equalsIgnoreCase("Earbuds"))
                  || (hasHeadphone && p.category().equalsIgnoreCase("Headphones"))
                  || (hasSamsung && p.brand().equalsIgnoreCase("Samsung"));
            })
        .toList();
  }
}

