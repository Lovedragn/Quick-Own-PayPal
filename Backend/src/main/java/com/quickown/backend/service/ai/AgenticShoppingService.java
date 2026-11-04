package com.quickown.backend.service.ai;

import com.quickown.backend.dto.product.ProductOffer;
import com.quickown.backend.dto.product.ProductResult;
import com.quickown.backend.dto.shopping.ShoppingIntent;
import com.quickown.backend.dto.shopping.ShoppingRecommendation;
import com.quickown.backend.dto.shopping.ShoppingRecommendationResponse;
import com.quickown.backend.service.catalog.ProductCatalogService;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Orchestrates AI intent extraction, live catalogue retrieval, deterministic offer filtering
 * and evidence-based product ranking. Product facts always come from the catalogue.
 */
@Service
public class AgenticShoppingService {

  private static final Set<String> FEATURE_STOP_WORDS =
      Set.of("with", "and", "for", "the", "good", "great", "long", "high", "low", "quality");

  private static final Set<String> ACCESSORY_TERMS =
      Set.of(
          "case", "cases", "cover", "covers", "protector", "protectors", "tempered",
          "charger", "chargers", "cable", "cables", "adapter", "adapters", "replacement",
          "spare", "parts", "skin", "sleeve", "stand", "mount", "holder", "grip", "strap",
          "lanyard", "stylus", "accessory", "accessories");

  private final ShoppingIntentInterpreter intentInterpreter;
  private final ProductCatalogService productCatalogService;
  private final String fallbackCurrency;

  @Autowired
  public AgenticShoppingService(
      ShoppingIntentInterpreter intentInterpreter,
      ProductCatalogService productCatalogService,
      @Value("${catalog.fallback-currency:USD}") String fallbackCurrency) {
    this.intentInterpreter = intentInterpreter;
    this.productCatalogService = productCatalogService;
    this.fallbackCurrency =
        fallbackCurrency == null || fallbackCurrency.isBlank()
            ? "USD"
            : fallbackCurrency.trim().toUpperCase(Locale.ROOT);
  }

  /** Backwards-compatible constructor for direct unit-test construction. */
  public AgenticShoppingService(
      ShoppingIntentInterpreter intentInterpreter, ProductCatalogService productCatalogService) {
    this(intentInterpreter, productCatalogService, "USD");
  }

  public ShoppingRecommendationResponse recommend(String customerMessage) {
    // ShoppingIntent intent = intentInterpreter.interpret(customerMessage);
    String rawQuery = customerMessage != null ? customerMessage.trim() : "";
    ShoppingIntent intent =
        new ShoppingIntent(
            rawQuery,
            null,
            List.of(),
            null,
            null,
            false,
            false,
            null);
    String searchCurrency = productCatalogService.getMarketCurrency();
    List<ProductResult> catalogueResults =
        productCatalogService.search(
            rawQuery, false, searchCurrency);

    // A no-budget request may use a clearly disclosed fallback market when the preferred
    // market has no offers. Never bypass an explicit budget or convert currencies.
    String fallbackCurrencyUsed = null;
    if (catalogueResults.isEmpty()
        && !intent.budgetApplied()
        && !"ANY".equalsIgnoreCase(searchCurrency)
        && !searchCurrency.equalsIgnoreCase(fallbackCurrency)) {
      List<ProductResult> fallbackResults =
          productCatalogService.search(
              intent.searchQuery(), intent.inStockOnly(), fallbackCurrency);
      if (!fallbackResults.isEmpty()) {
        catalogueResults = fallbackResults;
        fallbackCurrencyUsed = fallbackCurrency;
      }
    }

    List<Candidate> candidates = new ArrayList<>();
    for (ProductResult product : catalogueResults) {
      if (isIrrelevantAccessory(product, intent)) {
        continue;
      }
      List<ProductOffer> eligibleOffers = eligibleOffers(product, intent);
      if (eligibleOffers.isEmpty()) {
        continue;
      }

      ProductOffer selectedOffer = chooseOffer(eligibleOffers);
      List<String> matchedFeatures = matchFeatures(product, intent.requiredFeatures());

      // Return only the eligible offers inside the product card as well as the selected offer.
      // This prevents the frontend from accidentally showing an out-of-budget or unavailable
      // merchant offer as part of a recommendation that passed the customer's filters.
      ProductResult filteredProduct =
          new ProductResult(
              product.source(),
              product.productId(),
              product.name(),
              product.brand(),
              product.category(),
              product.description(),
              product.imageUrl(),
              eligibleOffers.stream().anyMatch(offer -> isInStock(offer.availability())),
              List.copyOf(eligibleOffers),
              product.variants());
      candidates.add(new Candidate(filteredProduct, selectedOffer, matchedFeatures));
    }

    candidates.sort(candidateComparator());
    List<ShoppingRecommendation> recommendations = new ArrayList<>();
    int rank = 1;
    for (Candidate candidate : candidates.stream().limit(10).toList()) {
      recommendations.add(
          new ShoppingRecommendation(
              rank++,
              candidate.product(),
              candidate.offer(),
              candidate.matchedFeatures().size(),
              candidate.matchedFeatures(),
              explain(candidate, intent)));
    }

    ShoppingIntent responseIntent = intent;
    if (fallbackCurrencyUsed != null) {
      String fallbackNotice =
          "No live "
              + searchCurrency
              + " offers were found. Showing live "
              + fallbackCurrencyUsed
              + " offers instead; prices remain in their original currency and are not converted.";
      if (intent.notice() != null && !intent.notice().isBlank()) {
        fallbackNotice += " " + intent.notice();
      }
      responseIntent =
          new ShoppingIntent(
              intent.searchQuery(),
              intent.category(),
              intent.requiredFeatures(),
              intent.maxBudget(),
              intent.budgetCurrency(),
              intent.budgetApplied(),
              intent.inStockOnly(),
              fallbackNotice);
    } else if (recommendations.isEmpty() && intent.notice() == null) {
      responseIntent =
          new ShoppingIntent(
              intent.searchQuery(),
              intent.category(),
              intent.requiredFeatures(),
              intent.maxBudget(),
              intent.budgetCurrency(),
              intent.budgetApplied(),
              intent.inStockOnly(),
              "No live catalogue offers matched all applied constraints.");
    }

    return new ShoppingRecommendationResponse(
        responseIntent, recommendations.size(), List.copyOf(recommendations));
  }

  /** Avoid recommending cases, covers and other add-ons for a primary-product request. */
  private boolean isIrrelevantAccessory(ProductResult product, ShoppingIntent intent) {
    // Classify the requested product from the search phrase/category only. A feature
    // such as "includes a charger" must not turn a phone search into an accessory search.
    String requestedText =
        normalize(safe(intent.searchQuery()) + " " + safe(intent.category()));
    boolean accessoryRequested = containsAccessoryTerm(requestedText);
    String productText = normalize(safe(product.name()) + " " + safe(product.category()));
    boolean accessoryProduct = containsAccessoryTerm(productText);
    return accessoryRequested ? !accessoryProduct : accessoryProduct;
  }

  private boolean containsAccessoryTerm(String normalizedText) {
    return Arrays.stream(normalizedText.split(" ")).anyMatch(ACCESSORY_TERMS::contains);
  }

  private List<ProductOffer> eligibleOffers(ProductResult product, ShoppingIntent intent) {
    if (product.offers() == null) {
      return List.of();
    }

    return product.offers().stream()
        .filter(
            offer ->
                offer != null
                    && offer.merchant() != null
                    && !offer.merchant().isBlank()
                    && offer.price() != null
                    && offer.currency() != null
                    && !offer.currency().isBlank())
        .filter(offer -> !intent.inStockOnly() || isInStock(offer.availability()))
        .filter(
            offer ->
                !intent.budgetApplied()
                    || (intent.budgetCurrency().equalsIgnoreCase(offer.currency())
                        && offer.price().compareTo(intent.maxBudget()) <= 0))
        .toList();
  }

  private ProductOffer chooseOffer(List<ProductOffer> offers) {
    return offers.stream().min(offerComparator()).orElseThrow();
  }

  private Comparator<ProductOffer> offerComparator() {
    return (left, right) -> {
      int stockComparison =
          Boolean.compare(isInStock(right.availability()), isInStock(left.availability()));
      if (stockComparison != 0) {
        return stockComparison;
      }

      if (left.currency().equalsIgnoreCase(right.currency())) {
        int priceComparison = left.price().compareTo(right.price());
        if (priceComparison != 0) {
          return priceComparison;
        }
      } else {
        int currencyComparison = left.currency().compareToIgnoreCase(right.currency());
        if (currencyComparison != 0) {
          return currencyComparison;
        }
      }
      return left.merchant().compareToIgnoreCase(right.merchant());
    };
  }

  private Comparator<Candidate> candidateComparator() {
    return (left, right) -> {
      int featureComparison =
          Integer.compare(
              right.matchedFeatures().size(), left.matchedFeatures().size());
      if (featureComparison != 0) {
        return featureComparison;
      }

      int stockComparison =
          Boolean.compare(
              isInStock(right.offer().availability()), isInStock(left.offer().availability()));
      if (stockComparison != 0) {
        return stockComparison;
      }

      if (left.offer().currency().equalsIgnoreCase(right.offer().currency())) {
        int priceComparison = left.offer().price().compareTo(right.offer().price());
        if (priceComparison != 0) {
          return priceComparison;
        }
      } else {
        int currencyComparison =
            left.offer().currency().compareToIgnoreCase(right.offer().currency());
        if (currencyComparison != 0) {
          return currencyComparison;
        }
      }
      return left.product().name().compareToIgnoreCase(right.product().name());
    };
  }

  private List<String> matchFeatures(ProductResult product, List<String> requiredFeatures) {
    if (requiredFeatures == null || requiredFeatures.isEmpty()) {
      return List.of();
    }

    String productText =
        normalize(
            String.join(
                " ",
                safe(product.name()),
                safe(product.brand()),
                safe(product.category()),
                safe(product.description())));
    String expandedProductText =
        productText
            .replace("noise cancelling", "noise cancellation")
            .replace("wireless noise cancellation", "wireless noise cancellation");

    return requiredFeatures.stream()
        .filter(
            feature -> {
              String normalizedFeature = normalize(feature);
              if (normalizedFeature.isBlank()) {
                return false;
              }
              List<String> tokens =
                  Arrays.stream(normalizedFeature.split(" "))
                      .filter(token -> !token.isBlank())
                      .filter(token -> !FEATURE_STOP_WORDS.contains(token))
                      .toList();
              if (tokens.isEmpty()) {
                return false;
              }
              long matches =
                  tokens.stream()
                      .filter(
                          token ->
                              expandedProductText.contains(token)
                                  || (token.equals("cancellation")
                                      && expandedProductText.contains("cancelling")))
                      .count();
              return matches >= Math.max(1, (tokens.size() + 1) / 2);
            })
        .toList();
  }

  private String explain(Candidate candidate, ShoppingIntent intent) {
    ProductOffer offer = candidate.offer();
    StringBuilder explanation = new StringBuilder();
    if (!candidate.matchedFeatures().isEmpty()) {
      explanation
          .append("Matches ")
          .append(candidate.matchedFeatures().size())
          .append(" of ")
          .append(intent.requiredFeatures().size())
          .append(" requested features: ")
          .append(String.join(", ", candidate.matchedFeatures()));
    } else {
      explanation.append("Returned by the live catalogue for your product search");
    }
    explanation
        .append(". Selected offer: ")
        .append(offer.merchant())
        .append(" at ")
        .append(offer.price().toPlainString())
        .append(" ")
        .append(offer.currency())
        .append(".");
    if (intent.budgetApplied()) {
      explanation.append(" Within your stated budget.");
    }
    if (isInStock(offer.availability())) {
      explanation.append(" Merchant marks it in stock.");
    }
    return explanation.toString();
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

  private String normalize(String value) {
    return safe(value).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
  }

  private String safe(String value) {
    return value == null ? "" : value;
  }

  private record Candidate(
      ProductResult product, ProductOffer offer, List<String> matchedFeatures) {}
}
