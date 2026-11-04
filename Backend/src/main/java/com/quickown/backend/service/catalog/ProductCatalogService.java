package com.quickown.backend.service.catalog;

import com.quickown.backend.dto.product.ProductOffer;
import com.quickown.backend.dto.product.ProductResult;
import com.quickown.backend.exception.CatalogProviderException;
import com.quickown.backend.integration.channel3.Channel3CatalogClient;
import com.quickown.backend.integration.retailer.AmazonCreatorsClient;
import com.quickown.backend.integration.retailer.FlipkartAffiliateClient;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * India-first multi-provider catalogue orchestration.
 *
 * <p>Searches all configured authorized providers, normalizes their results, restricts displayed
 * offers to the configured market currency, and merges exact title/brand matches so the UI can
 * compare merchants for the same catalogue item. No retailer website scraping is performed.
 */
@Service
public class ProductCatalogService {

  private static final Logger LOGGER = LoggerFactory.getLogger(ProductCatalogService.class);

  private final Channel3CatalogClient channel3Client;
  private final FlipkartAffiliateClient flipkartClient;
  private final AmazonCreatorsClient amazonClient;
  private final String marketCurrency;

  @Autowired
  public ProductCatalogService(
      Channel3CatalogClient channel3Client,
      FlipkartAffiliateClient flipkartClient,
      AmazonCreatorsClient amazonClient,
      @Value("${catalog.currency:INR}") String marketCurrency) {
    this.channel3Client = channel3Client;
    this.flipkartClient = flipkartClient;
    this.amazonClient = amazonClient;
    this.marketCurrency =
        marketCurrency == null || marketCurrency.isBlank()
            ? "INR"
            : marketCurrency.trim().toUpperCase(Locale.ROOT);
  }

  /** Backwards-compatible constructor used by existing unit tests. */
  public ProductCatalogService(Channel3CatalogClient channel3Client) {
    this(channel3Client, null, null, "ANY");
  }

  public String getMarketCurrency() {
    return marketCurrency;
  }

  public Map<String, Boolean> configuredProviders() {
    Map<String, Boolean> result = new LinkedHashMap<>();
    result.put("Channel3", channel3Client != null && channel3Client.isConfigured());
    result.put("Flipkart", flipkartClient != null && flipkartClient.isConfigured());
    result.put("Amazon.in", amazonClient != null && amazonClient.isConfigured());
    return Map.copyOf(result);
  }

  public List<ProductResult> search(String query, boolean inStockOnly) {
    return search(query, inStockOnly, marketCurrency);
  }

  /**
   * Searches one explicit currency market. "ANY" is reserved for server-side checkout
   * revalidation, where the selected merchant offer determines the single cart currency.
   */
  public List<ProductResult> search(
      String query, boolean inStockOnly, String requestedCurrency) {
    if (query == null || query.isBlank()) {
      return List.of();
    }
    String searchCurrency = normalizeCurrency(requestedCurrency);

    boolean anyLiveProviderConfigured =
        (channel3Client != null && channel3Client.isConfigured())
            || (flipkartClient != null && flipkartClient.isConfigured())
            || (amazonClient != null && amazonClient.isConfigured());

    if (!anyLiveProviderConfigured) {
      throw new CatalogProviderException(
          "No live product catalogue provider is configured. Please configure Channel3 API credentials.");
    }

    List<ProductResult> providerResults = new ArrayList<>();
    List<String> failedProviders = new ArrayList<>();
    int configuredCount = 0;
    int successfulCount = 0;

    if (channel3Client != null && channel3Client.isConfigured()) {
      configuredCount++;
      if (addProviderResults(
          providerResults,
          "Channel3",
          () -> channel3Client.search(query, inStockOnly),
          failedProviders)) {
        successfulCount++;
      }
    }
    if (flipkartClient != null && flipkartClient.isConfigured()) {
      configuredCount++;
      if (addProviderResults(
          providerResults,
          "Flipkart",
          () -> flipkartClient.search(query, inStockOnly),
          failedProviders)) {
        successfulCount++;
      }
    }
    if (amazonClient != null && amazonClient.isConfigured()) {
      configuredCount++;
      if (addProviderResults(
          providerResults,
          "Amazon.in",
          () -> amazonClient.search(query, inStockOnly),
          failedProviders)) {
        successfulCount++;
      }
    }

    if (configuredCount > 0 && successfulCount == 0) {
      throw new CatalogProviderException(
          "All configured product providers are currently unavailable: "
              + String.join(", ", failedProviders));
    }
    return mergeComparableProducts(providerResults, inStockOnly, searchCurrency);
  }

  private boolean addProviderResults(
      List<ProductResult> results,
      String provider,
      ProviderSearch search,
      List<String> failedProviders) {
    try {
      results.addAll(search.run());
      return true;
    } catch (RuntimeException exception) {
      // One provider outage must not prevent results from other configured providers.
      LOGGER.warn(
          "{} catalogue search failed; continuing with other providers: {}",
          provider,
          exception.getMessage());
      failedProviders.add(provider);
      return false;
    }
  }

  private List<ProductResult> mergeComparableProducts(
      List<ProductResult> providerResults, boolean inStockOnly, String requestedCurrency) {
    Map<String, ProductResult> merged = new LinkedHashMap<>();

    for (ProductResult product : providerResults) {
      if (product == null || product.name() == null || product.name().isBlank()) {
        continue;
      }

      List<ProductOffer> eligibleOffers =
          product.offers() == null
              ? List.of()
              : product.offers().stream()
                  .filter(offer -> hasComparableMarketPrice(offer, requestedCurrency))
                  .filter(offer -> !inStockOnly || isInStock(offer.availability()))
                  .toList();

      if (eligibleOffers.isEmpty()) {
        continue;
      }

      ProductResult normalized =
          new ProductResult(
              product.source(),
              product.productId(),
              product.name(),
              product.brand(),
              product.category(),
              product.description(),
              product.imageUrl(),
              eligibleOffers.stream().anyMatch(offer -> isInStock(offer.availability())),
              List.copyOf(eligibleOffers), product.variants());

      String key = comparisonKey(normalized);
      ProductResult previous = merged.get(key);
      if (previous == null) {
        merged.put(key, normalized);
      } else {
        merged.put(key, combine(previous, normalized));
      }
    }
    return List.copyOf(merged.values());
  }

  private ProductResult combine(ProductResult first, ProductResult second) {
    List<ProductOffer> offers = new ArrayList<>(first.offers());
    for (ProductOffer candidate : second.offers()) {
      boolean duplicate =
          offers.stream()
              .anyMatch(
                  existing ->
                      existing.merchant().equalsIgnoreCase(candidate.merchant())
                          && existing.currency().equalsIgnoreCase(candidate.currency())
                          && existing.price().compareTo(candidate.price()) == 0);
      if (!duplicate) {
        offers.add(candidate);
      }
    }

    String source =
        first.source().contains(second.source())
            ? first.source()
            : first.source() + " + " + second.source();

    return new ProductResult(
        source,
        first.productId(),
        first.name(),
        first.brand() == null ? second.brand() : first.brand(),
        first.category() == null ? second.category() : first.category(),
        first.description() == null ? second.description() : first.description(),
        first.imageUrl() == null ? second.imageUrl() : first.imageUrl(),
        offers.stream().anyMatch(offer -> isInStock(offer.availability())),
        List.copyOf(offers),
        first.variants() != null ? first.variants() : second.variants());
  }

  private String comparisonKey(ProductResult product) {
    String brand = normalize(product.brand() == null ? "" : product.brand());
    String name = normalize(product.name());
    return brand + "|" + name;
  }

  private String normalize(String value) {
    return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
  }

  private boolean hasComparableMarketPrice(
      ProductOffer offer, String requestedCurrency) {
    return offer != null
        && offer.merchant() != null
        && !offer.merchant().isBlank()
        && offer.price() != null
        && offer.price().compareTo(BigDecimal.ZERO) > 0
        && ("ANY".equals(requestedCurrency)
            || requestedCurrency.equalsIgnoreCase(offer.currency()));
  }

  private String normalizeCurrency(String requestedCurrency) {
    if (requestedCurrency == null || requestedCurrency.isBlank()) {
      return marketCurrency;
    }
    String normalized = requestedCurrency.trim().toUpperCase(Locale.ROOT);
    if ("ANY".equals(normalized)) {
      return normalized;
    }
    try {
      java.util.Currency.getInstance(normalized);
      return normalized;
    } catch (IllegalArgumentException exception) {
      throw new IllegalArgumentException("Unsupported catalogue currency: " + normalized);
    }
  }

  private boolean isInStock(String availability) {
    if (availability == null) {
      return false;
    }
    String normalized = availability.replaceAll("[^A-Za-z]", "").toLowerCase(Locale.ROOT);
    return normalized.equals("instock")
        || normalized.equals("available")
        || normalized.equals("limitedavailability");
  }


  @FunctionalInterface
  private interface ProviderSearch {
    List<ProductResult> run();
  }
}
