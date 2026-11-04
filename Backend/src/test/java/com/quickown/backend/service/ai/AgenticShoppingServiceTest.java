package com.quickown.backend.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.quickown.backend.testutil.TestProductCatalogService;
import com.quickown.backend.dto.shopping.ShoppingIntent;
import com.quickown.backend.integration.channel3.Channel3CatalogClient;
import com.quickown.backend.service.catalog.ProductCatalogService;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class AgenticShoppingServiceTest {

  private final ProductCatalogService catalogue = new TestProductCatalogService();

  @Test
  void filtersByBudgetAndRanksUsingCatalogueBackedFeatureMatches() {
    ShoppingIntentInterpreter interpreter =
        message ->
            new ShoppingIntent(
                "wireless headphones",
                "headphones",
                List.of("noise cancellation", "long battery life"),
                new BigDecimal("6000"),
                "INR",
                true,
                true,
                null);
    AgenticShoppingService service = new AgenticShoppingService(interpreter, catalogue);

    var response = service.recommend("wireless headphones under ₹6000 with noise cancellation, in stock");

    assertEquals(1, response.resultCount());
    var recommendation = response.recommendations().get(0);
    assertEquals(1, recommendation.rank());
    assertEquals("Wireless Headphones 450", recommendation.product().name());
    assertEquals("Mock catalogue", recommendation.selectedOffer().merchant());
    assertEquals("INR", recommendation.selectedOffer().currency());
    assertEquals("4999.0", recommendation.selectedOffer().price().toPlainString());
    assertTrue(
        recommendation.product().offers().stream()
            .allMatch(
                offer ->
                    "INR".equalsIgnoreCase(offer.currency())
                        && offer.price().compareTo(new BigDecimal("6000")) <= 0));
    assertTrue(recommendation.product().inStock());
    assertEquals(List.of("noise cancellation"), recommendation.matchedFeatures());
    assertTrue(recommendation.explanation().contains("Within your stated budget"));
  }

  @Test
  void usesTheExplicitBudgetCurrencyForCatalogueSearch() {
    RecordingCatalogue recordingCatalogue = new RecordingCatalogue();
    ShoppingIntentInterpreter interpreter =
        message ->
            new ShoppingIntent(
                "wireless earbuds",
                "earbuds",
                List.of("noise cancellation"),
                new BigDecimal("100"),
                "USD",
                true,
                false,
                null);

    var response =
        new AgenticShoppingService(interpreter, recordingCatalogue)
            .recommend("Find wireless earbuds under $100 with noise cancellation");

    assertEquals("USD", recordingCatalogue.requestedCurrency);
    assertEquals(1, response.resultCount());
    assertEquals("USD", response.recommendations().get(0).selectedOffer().currency());
  }



  @Test
  void fallsBackToUsdOnlyForAnUnbudgetedSearchWhenInrHasNoOffers() {
    FallbackRecordingCatalogue recordingCatalogue = new FallbackRecordingCatalogue();
    ShoppingIntentInterpreter interpreter =
        message ->
            new ShoppingIntent(
                "iphone 16", "Smartphones", List.of(), null, null, false, false, null);

    var response =
        new AgenticShoppingService(interpreter, recordingCatalogue, "USD")
            .recommend("Find me an iPhone 16");

    assertEquals(List.of("INR", "USD"), recordingCatalogue.requestedCurrencies);
    assertEquals(1, response.resultCount());
    assertEquals("USD", response.recommendations().get(0).selectedOffer().currency());
    assertTrue(response.intent().notice().contains("No live INR offers"));
    assertTrue(response.intent().notice().contains("not converted"));
  }

  @Test
  void neverUsesCurrencyFallbackWhenAnExplicitBudgetWasProvided() {
    FallbackRecordingCatalogue recordingCatalogue = new FallbackRecordingCatalogue();
    ShoppingIntentInterpreter interpreter =
        message ->
            new ShoppingIntent(
                "iphone 16",
                "Smartphones",
                List.of(),
                new BigDecimal("20000"),
                "INR",
                true,
                false,
                null);

    var response =
        new AgenticShoppingService(interpreter, recordingCatalogue, "USD")
            .recommend("Find me an iPhone 16 under INR 20000");

    assertEquals(List.of("INR"), recordingCatalogue.requestedCurrencies);
    assertEquals(0, response.resultCount());
    assertTrue(response.intent().notice().contains("No live catalogue offers"));
  }

  private static final class FallbackRecordingCatalogue extends ProductCatalogService {
    private final List<String> requestedCurrencies = new java.util.ArrayList<>();

    private FallbackRecordingCatalogue() {
      super(
          new Channel3CatalogClient("", "https://api.trychannel3.com"));
    }

    @Override
    public String getMarketCurrency() {
      return "INR";
    }

    @Override
    public List<com.quickown.backend.dto.product.ProductResult> search(
        String query, boolean inStockOnly, String currency) {
      requestedCurrencies.add(currency);
      if (!"USD".equalsIgnoreCase(currency)) {
        return List.of();
      }
      return List.of(
          new com.quickown.backend.dto.product.ProductResult(
              "Channel3",
              "USD-IPHONE-16",
              "iPhone 16",
              "Apple",
              "Smartphones",
              "Live catalogue product",
              "https://images.example/iphone-16.jpg",
              true,
              List.of(
                  new com.quickown.backend.dto.product.ProductOffer(
                      "buy.trychannel3.com",
                      new BigDecimal("565.00"),
                      "USD",
                      "InStock",
                      "https://buy.trychannel3.com/iphone-16"))));
    }
  }


  @Test
  void excludesAccessoryProductsWhenCustomerRequestsThePrimaryDevice() {
    AccessoryRecordingCatalogue recordingCatalogue = new AccessoryRecordingCatalogue();
    ShoppingIntentInterpreter interpreter =
        message ->
            new ShoppingIntent(
                "iPhone 16",
                "Smartphones",
                List.of("includes a charger"),
                null,
                null,
                false,
                false,
                null);

    var response =
        new AgenticShoppingService(interpreter, recordingCatalogue, "USD")
            .recommend("Find me an iPhone 16 with a charger");

    assertEquals(1, response.resultCount());
    assertEquals("iPhone 16", response.recommendations().get(0).product().name());
  }

  @Test
  void keepsAccessoryProductsWhenCustomerSpecificallyRequestsACase() {
    AccessoryRecordingCatalogue recordingCatalogue = new AccessoryRecordingCatalogue();
    ShoppingIntentInterpreter interpreter =
        message ->
            new ShoppingIntent(
                "iPhone 16 case", "Phone cases", List.of(), null, null, false, false, null);

    var response =
        new AgenticShoppingService(interpreter, recordingCatalogue, "USD")
            .recommend("Find me an iPhone 16 case");

    assertEquals(1, response.resultCount());
    assertEquals("iPhone 16 Case", response.recommendations().get(0).product().name());
  }

  private static final class AccessoryRecordingCatalogue extends ProductCatalogService {
    private AccessoryRecordingCatalogue() {
      super(
          new Channel3CatalogClient("", "https://api.trychannel3.com"));
    }

    @Override
    public String getMarketCurrency() {
      return "USD";
    }

    @Override
    public List<com.quickown.backend.dto.product.ProductResult> search(
        String query, boolean inStockOnly, String currency) {
      var phone =
          new com.quickown.backend.dto.product.ProductResult(
              "Channel3",
              "IPHONE-16",
              "iPhone 16",
              "Apple",
              "Smartphones",
              "Smartphone product",
              "https://images.example/iphone-16.jpg",
              true,
              List.of(
                  new com.quickown.backend.dto.product.ProductOffer(
                      "buy.trychannel3.com",
                      new BigDecimal("565.00"),
                      "USD",
                      "InStock",
                      "https://buy.trychannel3.com/iphone-16")));
      var phoneCase =
          new com.quickown.backend.dto.product.ProductResult(
              "Channel3",
              "IPHONE-16-CASE",
              "iPhone 16 Case",
              "Apple",
              "Phone accessories",
              "Protective case for iPhone 16",
              "https://images.example/iphone-16-case.jpg",
              true,
              List.of(
                  new com.quickown.backend.dto.product.ProductOffer(
                      "buy.trychannel3.com",
                      new BigDecimal("19.99"),
                      "USD",
                      "InStock",
                      "https://buy.trychannel3.com/iphone-16-case")));
      return List.of(phone, phoneCase);
    }
  }

  private static final class RecordingCatalogue extends ProductCatalogService {
    private String requestedCurrency;

    private RecordingCatalogue() {
      super(
          new Channel3CatalogClient("", "https://api.trychannel3.com"));
    }

    @Override
    public List<com.quickown.backend.dto.product.ProductResult> search(
        String query, boolean inStockOnly, String currency) {
      requestedCurrency = currency;
      return List.of(
          new com.quickown.backend.dto.product.ProductResult(
              "Channel3",
              "USD-HEADPHONES-1",
              "Wireless earbuds",
              "Example",
              "Audio",
              "Wireless noise cancellation earbuds",
              "https://images.example/earbuds.jpg",
              true,
              List.of(
                  new com.quickown.backend.dto.product.ProductOffer(
                      "store.example",
                      new BigDecimal("79.99"),
                      "USD",
                      "InStock",
                      "https://store.example/earbuds"))));
    }
  }

  @Test
  void excludesOutOfStockOffersWhenCustomerRequestsAvailability() {
    ShoppingIntentInterpreter interpreter =
        message ->
            new ShoppingIntent(
                "wireless earbuds",
                "earbuds",
                List.of(),
                null,
                null,
                false,
                true,
                null);
    AgenticShoppingService service = new AgenticShoppingService(interpreter, catalogue);

    var response = service.recommend("Find wireless earbuds that are in stock");

    assertEquals(0, response.resultCount());
    assertTrue(response.recommendations().isEmpty());
    assertTrue(response.intent().notice().contains("No live catalogue offers"));
  }

  @Test
  void doesNotCompareDifferentCurrenciesOrInventOfferFields() {
    ShoppingIntentInterpreter interpreter =
        message ->
            new ShoppingIntent(
                "wireless headphones",
                "headphones",
                List.of(),
                null,
                null,
                false,
                false,
                null);
    AgenticShoppingService service = new AgenticShoppingService(interpreter, catalogue);

    var response = service.recommend("Find wireless headphones");

    assertEquals(1, response.resultCount());
    assertEquals("Wireless Headphones 450", response.recommendations().get(0).product().name());
    assertEquals("4999.0", response.recommendations().get(0).selectedOffer().price().toPlainString());
    assertTrue(response.recommendations().get(0).selectedOffer().merchant() != null);
  }
}
