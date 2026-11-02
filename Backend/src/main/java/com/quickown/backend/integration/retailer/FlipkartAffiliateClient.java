package com.quickown.backend.integration.retailer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickown.backend.dto.product.ProductOffer;
import com.quickown.backend.dto.product.ProductResult;
import com.quickown.backend.exception.Channel3ApiException;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Official Flipkart Affiliate API search adapter.
 * Credentials are optional; the provider is only called when both are configured.
 */
@Component
public class FlipkartAffiliateClient {

  private final ObjectMapper mapper = new ObjectMapper();
  private final String affiliateId;
  private final String affiliateToken;
  private final String baseUrl;
  private final HttpClient httpClient;

  public FlipkartAffiliateClient(
      @Value("${flipkart.affiliate-id:}") String affiliateId,
      @Value("${flipkart.affiliate-token:}") String affiliateToken,
      @Value("${flipkart.base-url:https://affiliate-api.flipkart.net}") String baseUrl) {
    this.affiliateId = affiliateId == null ? "" : affiliateId.trim();
    this.affiliateToken = affiliateToken == null ? "" : affiliateToken.trim();
    this.baseUrl =
        baseUrl == null
            ? "https://affiliate-api.flipkart.net"
            : baseUrl.replaceAll("/+$", "");
    this.httpClient =
        HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .version(HttpClient.Version.HTTP_1_1)
            .build();
  }

  public boolean isConfigured() {
    return !affiliateId.isBlank() && !affiliateToken.isBlank();
  }

  public List<ProductResult> search(String query, boolean inStockOnly) {
    if (!isConfigured() || query == null || query.isBlank()) {
      return List.of();
    }

    try {
      String uri =
          baseUrl
              + "/affiliate/1.0/search.json?query="
              + URLEncoder.encode(query.trim(), StandardCharsets.UTF_8)
              + "&resultCount=10";
      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(uri))
              .timeout(Duration.ofSeconds(25))
              .header("Accept", "application/json")
              .header("Fk-Affiliate-Id", affiliateId)
              .header("Fk-Affiliate-Token", affiliateToken)
              .GET()
              .build();
      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new Channel3ApiException(
            "Flipkart Affiliate API search failed with HTTP " + response.statusCode() + ".");
      }

      JsonNode root = mapper.readTree(response.body());
      JsonNode items = root.path("productInfoList");
      if (!items.isArray()) {
        throw new Channel3ApiException(
            "Flipkart Affiliate API returned an unexpected response: productInfoList is missing.");
      }

      List<ProductResult> products = new ArrayList<>();
      for (JsonNode item : items) {
        ProductResult product = toProduct(item);
        if (product != null && (!inStockOnly || product.inStock())) {
          products.add(product);
        }
      }
      return List.copyOf(products);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new Channel3ApiException("Flipkart search was interrupted.", exception);
    } catch (IOException exception) {
      throw new Channel3ApiException("Could not read the Flipkart search response.", exception);
    }
  }

  private ProductResult toProduct(JsonNode item) {
    // Official /1.0/search.json response schema documented by Flipkart.
    JsonNode base = item.path("productBaseInfoV1");
    String id = text(base, "productId");
    String title = text(base, "title");
    if (isBlank(id) || isBlank(title)) {
      return null;
    }

    JsonNode price = firstObject(base, "flipkartSpecialPrice", "flipkartSellingPrice");
    BigDecimal amount = decimal(price.path("amount"));
    String currency = firstNonBlank(text(price, "currency"), "INR");
    String productUrl = text(base, "productUrl");
    String imageUrl =
        firstNonBlank(
            text(base.path("imageUrls"), "400x400"),
            text(base.path("imageUrls"), "200x200"),
            text(base.path("imageUrls"), "unknown"));
    String brand = text(base, "productBrand");
    String description = text(base, "productDescription");
    String availability =
        base.path("inStock").asBoolean(false)
                && base.path("isAvailable").asBoolean(true)
            ? "InStock"
            : "OutOfStock";

    JsonNode specifications = item.path("categorySpecificInfoV1").path("keySpecs");
    if (specifications.isArray()) {
      List<String> values = new ArrayList<>();
      specifications.forEach(value -> {
        if (value.isTextual() && !value.asText().isBlank()) {
          values.add(value.asText());
        }
      });
      if (!values.isEmpty()) {
        description = (description == null ? "" : description + " ") + String.join(". ", values);
      }
    }

    List<ProductOffer> offers = new ArrayList<>();
    if (amount != null && !isBlank(productUrl)) {
      offers.add(new ProductOffer("Flipkart", amount, currency, availability, productUrl));
    }

    return new ProductResult(
        "Flipkart Affiliate API",
        "FLIPKART:" + id,
        title,
        brand,
        "India marketplace",
        description,
        imageUrl,
        "InStock".equals(availability),
        List.copyOf(offers));
  }

  private JsonNode firstObject(JsonNode parent, String first, String second) {
    JsonNode node = parent.path(first);
    if (node.isObject() && node.has("amount")) {
      return node;
    }
    return parent.path(second);
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

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
