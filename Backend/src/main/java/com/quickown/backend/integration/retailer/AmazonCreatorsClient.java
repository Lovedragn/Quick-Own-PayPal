package com.quickown.backend.integration.retailer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.quickown.backend.dto.product.ProductOffer;
import com.quickown.backend.dto.product.ProductResult;
import com.quickown.backend.exception.Channel3ApiException;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Amazon India Creators API adapter.
 * Amazon requires an eligible Associates account and approved Creators API credentials.
 */
@Component
public class AmazonCreatorsClient {

  private static final List<String> RESOURCES =
      List.of(
          "images.primary.medium",
          "itemInfo.title",
          "itemInfo.byLineInfo",
          "itemInfo.classifications",
          "itemInfo.features",
          "offersV2.listings.availability",
          "offersV2.listings.merchantInfo",
          "offersV2.listings.price");

  private final ObjectMapper mapper = new ObjectMapper();
  private final String clientId;
  private final String clientSecret;
  private final String partnerTag;
  private final String marketplace;
  private final String tokenUrl;
  private final String apiBaseUrl;
  private final HttpClient httpClient;
  private volatile CachedToken cachedToken;

  public AmazonCreatorsClient(
      @Value("${amazon.creators.client-id:}") String clientId,
      @Value("${amazon.creators.client-secret:}") String clientSecret,
      @Value("${amazon.creators.partner-tag:}") String partnerTag,
      @Value("${amazon.creators.marketplace:www.amazon.in}") String marketplace,
      @Value("${amazon.creators.token-url:https://api.amazon.co.uk/auth/o2/token}") String tokenUrl,
      @Value("${amazon.creators.api-base-url:https://creatorsapi.amazon}") String apiBaseUrl) {
    this.clientId = safe(clientId);
    this.clientSecret = safe(clientSecret);
    this.partnerTag = safe(partnerTag);
    this.marketplace = safe(marketplace).isBlank() ? "www.amazon.in" : safe(marketplace);
    this.tokenUrl = safe(tokenUrl);
    this.apiBaseUrl =
        safe(apiBaseUrl).isBlank()
            ? "https://creatorsapi.amazon"
            : safe(apiBaseUrl).replaceAll("/+$", "");
    this.httpClient =
        HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .version(HttpClient.Version.HTTP_1_1)
            .build();
  }

  public boolean isConfigured() {
    return !clientId.isBlank() && !clientSecret.isBlank() && !partnerTag.isBlank();
  }

  public List<ProductResult> search(String query, boolean inStockOnly) {
    if (!isConfigured() || query == null || query.isBlank()) {
      return List.of();
    }

    try {
      ObjectNode body = mapper.createObjectNode();
      body.put("keywords", query.trim());
      body.put("partnerTag", partnerTag);
      body.put("marketplace", marketplace);
      body.put("searchIndex", "All");
      body.put("itemCount", 10);
      body.put("availability", inStockOnly ? "Available" : "IncludeOutOfStock");
      body.put("currencyOfPreference", "INR");
      body.set("resources", mapper.valueToTree(RESOURCES));

      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(apiBaseUrl + "/catalog/v1/searchItems"))
              .timeout(Duration.ofSeconds(25))
              .header("Authorization", "Bearer " + getAccessToken())
              .header("Content-Type", "application/json")
              .header("Accept", "application/json")
              .header("x-marketplace", marketplace)
              .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
              .build();

      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new Channel3ApiException(
            "Amazon Creators API search failed with HTTP " + response.statusCode() + ".");
      }

      JsonNode root = mapper.readTree(response.body());
      JsonNode items = root.path("searchResult").path("items");
      if (!items.isArray()) {
        throw new Channel3ApiException(
            "Amazon Creators API returned an unexpected response: searchResult.items is missing.");
      }

      List<ProductResult> products = new ArrayList<>();
      for (JsonNode item : items) {
        ProductResult product = toProduct(item);
        if (product != null
            && (!inStockOnly
                || (product.inStock()
                    && !product.offers().isEmpty()))) {
          products.add(product);
        }
      }
      return List.copyOf(products);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new Channel3ApiException("Amazon Creators API search was interrupted.", exception);
    } catch (IOException exception) {
      throw new Channel3ApiException("Could not read the Amazon Creators API response.", exception);
    }
  }

  private ProductResult toProduct(JsonNode item) {
    String asin = text(item, "asin");
    String title = text(item.path("itemInfo").path("title"), "displayValue");
    if (isBlank(asin) || isBlank(title)) {
      return null;
    }

    String productUrl = text(item, "detailPageURL");
    String imageUrl =
        text(item.path("images").path("primary").path("medium"), "url");
    String brand =
        firstNonBlank(
            text(item.path("itemInfo").path("byLineInfo").path("brand"), "displayValue"),
            text(item.path("itemInfo").path("byLineInfo").path("brand"), "label"));
    String category =
        firstNonBlank(
            text(item.path("itemInfo").path("classifications").path("productGroup"), "displayValue"),
            "Electronics");

    List<String> descriptions = new ArrayList<>();
    JsonNode features = item.path("itemInfo").path("features").path("displayValues");
    if (features.isArray()) {
      features.forEach(
          feature -> {
            if (feature.isTextual() && !feature.asText().isBlank()) {
              descriptions.add(feature.asText());
            }
          });
    }

    List<ProductOffer> offers = new ArrayList<>();
    JsonNode listings = item.path("offersV2").path("listings");
    if (listings.isArray()) {
      for (JsonNode listing : listings) {
        JsonNode money = listing.path("price").path("money");
        BigDecimal amount = decimal(money.path("amount"));
        String currency = text(money, "currency");
        String availability = text(listing.path("availability"), "type");
        if (amount == null || isBlank(currency) || isBlank(productUrl)) {
          continue;
        }
        String normalizedAvailability =
            availability == null
                ? ""
                : availability.replaceAll("[^A-Za-z]", "").toUpperCase();
        String stock =
            normalizedAvailability.equals("INSTOCK")
                    || normalizedAvailability.equals("INSTOCKSCARCE")
                ? "InStock"
                : "OutOfStock";
        String merchant =
            firstNonBlank(text(listing.path("merchantInfo"), "name"), "Amazon.in");
        offers.add(new ProductOffer(merchant, amount, currency, stock, productUrl));
      }
    }

    boolean inStock = offers.stream().anyMatch(offer -> "InStock".equalsIgnoreCase(offer.availability()));
    if (offers.isEmpty()) {
      return null;
    }

    return new ProductResult(
        "Amazon Creators API",
        "AMAZON:" + asin,
        title,
        brand,
        category,
        descriptions.isEmpty() ? null : String.join(". ", descriptions),
        imageUrl,
        inStock,
        List.copyOf(offers));
  }

  public String getAccessToken() {
    if (!isConfigured()) {
      throw new IllegalStateException("Amazon Creators API is not configured.");
    }

    CachedToken current = cachedToken;
    if (current != null && current.expiresAt().isAfter(Instant.now().plusSeconds(30))) {
      return current.value();
    }

    synchronized (this) {
      current = cachedToken;
      if (current != null && current.expiresAt().isAfter(Instant.now().plusSeconds(30))) {
        return current.value();
      }
      cachedToken = requestNewToken();
      return cachedToken.value();
    }
  }

  private CachedToken requestNewToken() {
    try {
      ObjectNode body = mapper.createObjectNode();
      body.put("grant_type", "client_credentials");
      body.put("client_id", clientId);
      body.put("client_secret", clientSecret);
      body.put("scope", "creatorsapi::default");

      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(tokenUrl))
              .timeout(Duration.ofSeconds(20))
              .header("Content-Type", "application/json")
              .header("Accept", "application/json")
              .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
              .build();

      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new Channel3ApiException(
            "Amazon Creators API OAuth token request failed with HTTP "
                + response.statusCode()
                + ".");
      }

      JsonNode tokenResponse = mapper.readTree(response.body());
      String token = text(tokenResponse, "access_token");
      long expiresIn = tokenResponse.path("expires_in").asLong(0);
      if (isBlank(token) || expiresIn <= 0) {
        throw new Channel3ApiException(
            "Amazon Creators API OAuth response did not contain a usable access token.");
      }
      return new CachedToken(token, Instant.now().plusSeconds(Math.max(30, expiresIn - 60)));
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new Channel3ApiException("Amazon Creators API OAuth request was interrupted.", exception);
    } catch (IOException exception) {
      throw new Channel3ApiException("Could not read the Amazon Creators API OAuth response.", exception);
    }
  }

  private BigDecimal decimal(JsonNode value) {
    if (value == null || value.isMissingNode() || value.isNull()) {
      return null;
    }
    if (value.isNumber()) {
      return value.decimalValue();
    }
    if (value.isTextual()) {
      try {
        return new BigDecimal(value.asText());
      } catch (NumberFormatException ignored) {
        return null;
      }
    }
    return null;
  }

  private String text(JsonNode node, String field) {
    JsonNode value = node.path(field);
    return value.isMissingNode() || value.isNull() || value.isContainerNode()
        ? null
        : value.asText(null);
  }

  private String firstNonBlank(String... values) {
    for (String value : values) {
      if (!isBlank(value)) {
        return value;
      }
    }
    return null;
  }

  private String safe(String value) {
    return value == null ? "" : value.trim();
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private record CachedToken(String value, Instant expiresAt) {}
}
