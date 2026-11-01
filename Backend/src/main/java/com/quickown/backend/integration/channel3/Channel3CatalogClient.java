package com.quickown.backend.integration.channel3;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickown.backend.dto.product.ProductOffer;
import com.quickown.backend.dto.product.ProductResult;
import com.quickown.backend.exception.Channel3ApiException;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Server-side Channel3 Search API client. The API key is read from configuration and is never
 * exposed to the frontend or logs.
 */
@Component
public class Channel3CatalogClient {

  private final ObjectMapper objectMapper;
  private final String apiKey;
  private final String baseUrl;
  private final HttpClient httpClient;

  public Channel3CatalogClient(
      @Value("${channel3.api-key:}") String apiKey,
      @Value("${channel3.base-url:https://api.trychannel3.com}") String baseUrl) {
    this.objectMapper = new ObjectMapper();
    this.apiKey = apiKey == null ? "" : apiKey.trim();
    this.baseUrl = baseUrl == null ? "https://api.trychannel3.com" : baseUrl.replaceAll("/+$", "");
    this.httpClient =
        HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(10))
            .build();
  }

  public boolean isConfigured() {
    return !apiKey.isBlank();
  }

  public List<ProductResult> search(String query, boolean inStockOnly) {
    if (!isConfigured()) {
      throw new IllegalStateException("Channel3 API key is not configured.");
    }
    if (query == null || query.isBlank()) {
      return List.of();
    }

    try {
      String requestBody = objectMapper.writeValueAsString(new SearchRequest(query.trim(), 10));

      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(baseUrl + "/v1/search"))
              .timeout(Duration.ofSeconds(30))
              .header("Content-Type", "application/json")
              .header("x-api-key", apiKey)
              .POST(HttpRequest.BodyPublishers.ofString(requestBody))
              .build();

      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString());

      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new Channel3ApiException(
            "Channel3 search failed with HTTP "
                + response.statusCode()
                + ". Check the API key, account quota and request filters.");
      }

      JsonNode root = objectMapper.readTree(response.body());
      JsonNode productsNode = root.path("products");
      if (!productsNode.isArray()) {
        throw new Channel3ApiException(
            "Channel3 returned an unexpected response: products array is missing.");
      }

      List<ProductResult> results = new ArrayList<>();
      for (JsonNode productNode : productsNode) {
        ProductResult product = toProductResult(productNode, inStockOnly);
        if (product != null) {
          results.add(product);
        }
      }
      return List.copyOf(results);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new Channel3ApiException("Channel3 search was interrupted.", exception);
    } catch (IOException exception) {
      throw new Channel3ApiException("Could not read the Channel3 search response.", exception);
    }
  }

  private ProductResult toProductResult(JsonNode product, boolean inStockOnly) {
    String id = text(product, "id");
    String title = firstNonBlank(text(product, "title"), text(product, "name"));
    if (title == null) {
      return null;
    }

    String brand = readBrand(product.path("brand"));
    String category =
        firstNonBlank(
            text(product, "category"),
            text(product.path("category"), "name"),
            text(product, "category_name"));
    String description = text(product, "description");
    String imageUrl = firstImageUrl(product.path("images"));

    List<ProductOffer> offers = new ArrayList<>();
    JsonNode offersNode = product.path("offers");
    if (offersNode.isArray()) {
      for (JsonNode offerNode : offersNode) {
        ProductOffer offer = toOfferResult(offerNode);
        if (offer != null && (!inStockOnly || isInStock(offer.availability()))) {
          offers.add(offer);
        }
      }
    }

    // An in-stock-only request must never return a product without a confirmed
    // in-stock merchant offer.
    if (inStockOnly && offers.isEmpty()) {
      return null;
    }

    boolean inStock = offers.stream().anyMatch(offer -> isInStock(offer.availability()));
    return new ProductResult(
        "Channel3",
        id,
        title,
        brand,
        category,
        description,
        imageUrl,
        inStock,
        List.copyOf(offers));
  }

  private ProductOffer toOfferResult(JsonNode offer) {
    BigDecimal amount = readPrice(offer.path("price"));
    String currency = firstNonBlank(text(offer, "currency"), text(offer.path("price"), "currency"));
    String availability = text(offer, "availability");
    String url = text(offer, "url");
    String merchant =
        firstNonBlank(
            text(offer, "merchant_domain"),
            text(offer.path("merchant"), "domain"),
            text(offer.path("merchant"), "name"),
            text(offer, "merchant_name"),
            merchantDomainFromUrl(url));

    if (amount == null && currency == null && availability == null && url == null) {
      return null;
    }

    return new ProductOffer(merchant, amount, currency, availability, url);
  }

  private String merchantDomainFromUrl(String url) {
    if (url == null || url.isBlank()) {
      return null;
    }
    try {
      return URI.create(url).getHost();
    } catch (IllegalArgumentException exception) {
      return null;
    }
  }

  private BigDecimal readPrice(JsonNode priceNode) {
    JsonNode value = priceNode.isObject() ? priceNode.path("price") : priceNode;
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

  private String readBrand(JsonNode brandNode) {
    if (brandNode.isTextual()) {
      return brandNode.asText();
    }
    return firstNonBlank(text(brandNode, "name"), text(brandNode, "title"));
  }

  private String firstImageUrl(JsonNode images) {
    if (!images.isArray()) {
      return null;
    }
    for (JsonNode image : images) {
      String url = text(image, "url");
      if (url != null) {
        return url;
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
      if (value != null && !value.isBlank()) {
        return value;
      }
    }
    return null;
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

  private record SearchRequest(String query, int limit) {}
}
