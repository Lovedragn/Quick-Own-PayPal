package com.quickown.backend.catalog;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class MockProductCatalog {

  public record Product(
      Long id,
      String name,
      String brand,
      String category,
      double price,
      String description,
      boolean inStock) {}

  private final List<Product> products =
      List.of(
          new Product(
              1L,
              "Galaxy M35 5G",
              "Samsung",
              "Smartphone",
              17999,
              "6GB RAM, 128GB storage, 6000mAh battery",
              true),
          new Product(
              2L,
              "Galaxy A16 5G",
              "Samsung",
              "Smartphone",
              15999,
              "8GB RAM, 128GB storage, AMOLED display",
              true),
          new Product(
              3L,
              "Nord CE 4 Lite",
              "OnePlus",
              "Smartphone",
              19999,
              "8GB RAM, 128GB storage, 5500mAh battery",
              true),
          new Product(
              4L,
              "Wireless Headphones 450",
              "Sony",
              "Headphones",
              4999,
              "Wireless headphones with noise cancellation",
              true),
          new Product(
              5L,
              "Redmi Buds 5",
              "Xiaomi",
              "Earbuds",
              2499,
              "Wireless earbuds with active noise cancellation",
              false));

  public List<Product> getAllProducts() {
    return products;
  }

  /** Backwards-compatible search. Availability wording in the query is still respected. */
  public List<Product> search(String query) {
    return search(query, false);
  }

  /** Searches the catalogue and optionally excludes every out-of-stock product. */
  public List<Product> search(String query, boolean inStockOnly) {
    if (query == null || query.isBlank()) {
      return List.of();
    }

    String normalizedQuery = query.toLowerCase(Locale.ROOT);
    boolean availableOnly =
        inStockOnly
            || normalizedQuery.contains("available")
            || normalizedQuery.contains("in stock")
            || normalizedQuery.contains("in-stock");

    Set<String> searchKeywords = tokenize(query);

    if (searchKeywords.isEmpty()) {
      return List.of();
    }

    return products.stream()
        .filter(product -> !availableOnly || product.inStock())
        .filter(
            product -> {
              String productText =
                  product.name()
                      + " "
                      + product.brand()
                      + " "
                      + product.category()
                      + " "
                      + product.description();

              Set<String> productKeywords = tokenize(productText);
              return productKeywords.containsAll(searchKeywords);
            })
        .collect(Collectors.toList());
  }

  private Set<String> tokenize(String text) {
    Set<String> stopWords =
        Set.of(
            "find",
            "show",
            "me",
            "the",
            "a",
            "an",
            "for",
            "please",
            "available",
            "products",
            "product",
            "in",
            "of",
            "and",
            "category",
            "stock",
            "only");

    Map<String, String> synonyms =
        Map.of(
            "phones", "smartphone",
            "phone", "smartphone",
            "smartphones", "smartphone",
            "mobiles", "smartphone",
            "mobile", "smartphone",
            "headphones", "headphone",
            "earbuds", "earbud");

    return Arrays.stream(
            text.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9 ]", " ").trim().split("\\s+"))
        .filter(word -> !word.isBlank())
        .filter(word -> !stopWords.contains(word))
        .map(word -> synonyms.getOrDefault(word, word))
        .collect(Collectors.toSet());
  }
}
