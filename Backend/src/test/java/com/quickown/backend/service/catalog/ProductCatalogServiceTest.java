package com.quickown.backend.service.catalog;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.quickown.backend.dto.product.ProductOffer;
import com.quickown.backend.dto.product.ProductResult;
import com.quickown.backend.exception.CatalogProviderException;
import com.quickown.backend.integration.channel3.Channel3CatalogClient;
import com.quickown.backend.integration.retailer.AmazonCreatorsClient;
import com.quickown.backend.integration.retailer.FlipkartAffiliateClient;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class ProductCatalogServiceTest {

  @Test
  void mergesSameProductAcrossFlipkartAndAmazonIntoComparableMerchantOffers() {
    var service =
        new ProductCatalogService(
            new FakeChannel3(false, List.of()),
            new FakeFlipkart(true, List.of(product(
                "Flipkart Affiliate API", "FLIPKART:SKU-1", "Sony WH-CH720N", "Sony",
                new ProductOffer("Flipkart", new BigDecimal("8990"), "INR", "InStock",
                    "https://www.flipkart.com/product")))),
            new FakeAmazon(true, List.of(product(
                "Amazon Creators API", "AMAZON:B0SKU1", "Sony WH-CH720N", "Sony",
                new ProductOffer("Amazon.in", new BigDecimal("8490"), "INR", "InStock",
                    "https://www.amazon.in/dp/B0SKU1")))),
            "INR");

    var results = service.search("Sony WH-CH720N", true);

    assertEquals(1, results.size());
    assertEquals(2, results.get(0).offers().size());
    assertTrue(results.get(0).source().contains("Flipkart Affiliate API"));
    assertTrue(results.get(0).source().contains("Amazon Creators API"));
    assertEquals("INR", results.get(0).offers().get(0).currency());
  }

  @Test
  void filtersOutOffersOutsideConfiguredMarketCurrency() {
    var service =
        new ProductCatalogService(
            new FakeChannel3(true, List.of(product(
                "Channel3", "C3-1", "Wireless headphones", "Sony",
                new ProductOffer("bestbuy.com", new BigDecimal("99.99"), "USD", "InStock",
                    "https://bestbuy.com/item")))),
            new FakeFlipkart(false, List.of()),
            new FakeAmazon(false, List.of()),
            "INR");

    assertTrue(service.search("wireless headphones", false).isEmpty());
  }

  @Test
  void selectsExplicitUsdMarketWithoutMixingItWithInrOffers() {
    var service =
        new ProductCatalogService(
            new FakeChannel3(true, List.of(product(
                "Channel3", "C3-USD-1", "Wireless headphones", "Sony",
                new ProductOffer("store.example", new BigDecimal("79.99"), "USD", "InStock",
                    "https://store.example/headphones")))),
            new FakeFlipkart(false, List.of()),
            new FakeAmazon(false, List.of()),
            "INR");

    var results = service.search("wireless headphones", false, "USD");

    assertEquals(1, results.size());
    assertEquals("USD", results.get(0).offers().get(0).currency());
  }

  @Test
  void keepsOtherProviderResultsWhenOneProviderIsUnavailable() {
    var service =
        new ProductCatalogService(
            new FakeChannel3(true, List.of(), true),
            new FakeFlipkart(true, List.of(product(
                "Flipkart Affiliate API", "FLIPKART:SKU-2", "Samsung Galaxy Buds", "Samsung",
                new ProductOffer("Flipkart", new BigDecimal("4999"), "INR", "InStock",
                    "https://www.flipkart.com/buds")))),
            new FakeAmazon(false, List.of()),
            "INR");

    var results = service.search("Samsung Galaxy Buds", true);

    assertEquals(1, results.size());
    assertEquals("Flipkart Affiliate API", results.get(0).source());
  }

  @Test
  void reportsFailureWhenEveryConfiguredProviderIsUnavailable() {
    var service =
        new ProductCatalogService(
            new FakeChannel3(true, List.of(), true),
            new FakeFlipkart(true, List.of(), true),
            new FakeAmazon(false, List.of()),
            "INR");

    assertThrows(
        CatalogProviderException.class,
        () -> service.search("wireless headphones", false));
  }

  @Test
  void failsWhenNoLiveProviderCredentialsAreConfigured() {
    var service =
        new ProductCatalogService(
            new FakeChannel3(false, List.of()),
            new FakeFlipkart(false, List.of()),
            new FakeAmazon(false, List.of()),
            "INR");

    assertThrows(
        CatalogProviderException.class,
        () -> service.search("wireless headphones", true));
  }

  private ProductResult product(
      String source, String id, String name, String brand, ProductOffer offer) {
    return new ProductResult(
        source, id, name, brand, "Headphones", "Wireless noise cancellation",
        null, "InStock".equals(offer.availability()), List.of(offer));
  }

  private static final class FakeChannel3 extends Channel3CatalogClient {
    private final boolean configured;
    private final List<ProductResult> results;
    private final boolean fail;

    private FakeChannel3(boolean configured, List<ProductResult> results) {
      this(configured, results, false);
    }

    private FakeChannel3(boolean configured, List<ProductResult> results, boolean fail) {
      super("", "http://localhost");
      this.configured = configured;
      this.results = results;
      this.fail = fail;
    }

    @Override
    public boolean isConfigured() {
      return configured;
    }

    @Override
    public List<ProductResult> search(String query, boolean inStockOnly) {
      if (fail) {
        throw new IllegalStateException("Channel3 unavailable");
      }
      return results;
    }
  }

  private static final class FakeFlipkart extends FlipkartAffiliateClient {
    private final boolean configured;
    private final List<ProductResult> results;
    private final boolean fail;

    private FakeFlipkart(boolean configured, List<ProductResult> results) {
      this(configured, results, false);
    }

    private FakeFlipkart(boolean configured, List<ProductResult> results, boolean fail) {
      super("", "", "http://localhost");
      this.configured = configured;
      this.results = results;
      this.fail = fail;
    }

    @Override
    public boolean isConfigured() {
      return configured;
    }

    @Override
    public List<ProductResult> search(String query, boolean inStockOnly) {
      if (fail) {
        throw new IllegalStateException("Flipkart unavailable");
      }
      return results;
    }
  }

  private static final class FakeAmazon extends AmazonCreatorsClient {
    private final boolean configured;
    private final List<ProductResult> results;
    private final boolean fail;

    private FakeAmazon(boolean configured, List<ProductResult> results) {
      this(configured, results, false);
    }

    private FakeAmazon(boolean configured, List<ProductResult> results, boolean fail) {
      super("", "", "", "www.amazon.in", "http://localhost/token", "http://localhost");
      this.configured = configured;
      this.results = results;
      this.fail = fail;
    }

    @Override
    public boolean isConfigured() {
      return configured;
    }

    @Override
    public List<ProductResult> search(String query, boolean inStockOnly) {
      if (fail) {
        throw new IllegalStateException("Amazon unavailable");
      }
      return results;
    }
  }
}
