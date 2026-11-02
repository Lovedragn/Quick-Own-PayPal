package com.quickown.backend.integration.channel3;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class Channel3CatalogClientTest {

  private HttpServer server;
  private Channel3CatalogClient client;
  private final AtomicReference<String> receivedApiKey = new AtomicReference<>();
  private final AtomicReference<String> receivedBody = new AtomicReference<>();

  private static final String SAMPLE_RESPONSE =
      """
      {
        "products": [
          {
            "id": "prod_bose_001",
            "title": "QuietComfort Earbuds",
            "brand": { "name": "Bose" },
            "category": "Earbuds",
            "description": "Noise cancelling wireless earbuds",
            "images": [{ "url": "https://images.example/bose-earbuds.jpg" }],
            "offers": [
              {
                "price": { "price": 179.00, "currency": "USD" },
                "availability": "InStock",
                "url": "https://store.example/bose-earbuds"
              },
              {
                "merchant_domain": "outlet.example",
                "price": 169.00,
                "currency": "USD",
                "availability": "OutOfStock",
                "url": "https://outlet.example/bose-earbuds"
              }
            ]
          },
          {
            "id": "prod_apple_002",
            "title": "AirPods Pro",
            "brand": { "name": "Apple" },
            "category": "Earbuds",
            "offers": [
              {
                "merchant_domain": "store.example",
                "price": 199.00,
                "currency": "USD",
                "availability": "OutOfStock",
                "url": "https://store.example/airpods"
              }
            ]
          }
        ],
        "next_page_token": null
      }
      """;

  @BeforeEach
  void setUp() throws IOException {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/v1/search", this::handleSearch);
    server.start();

    client =
        new Channel3CatalogClient(
            "unit-test-channel3-key", "http://127.0.0.1:" + server.getAddress().getPort());
  }

  @AfterEach
  void tearDown() {
    if (server != null) {
      server.stop(0);
    }
  }

  @Test
  void sendsAuthenticatedSearchAndMapsStructuredProductData() {
    var results = client.search("wireless earbuds", false);

    assertEquals(2, results.size());
    assertEquals("prod_bose_001", results.get(0).productId());
    assertEquals("QuietComfort Earbuds", results.get(0).name());
    assertEquals("Bose", results.get(0).brand());
    assertEquals("https://images.example/bose-earbuds.jpg", results.get(0).imageUrl());
    assertEquals(2, results.get(0).offers().size());
    assertEquals("USD", results.get(0).offers().get(0).currency());
    assertEquals("store.example", results.get(0).offers().get(0).merchant());
    assertEquals("unit-test-channel3-key", receivedApiKey.get());
    assertTrue(receivedBody.get().contains("\"query\":\"wireless earbuds\""));
    assertTrue(receivedBody.get().contains("\"limit\":10"));
  }

  @Test
  void inStockOnlyKeepsOnlyProductsAndOffersWithConfirmedStock() {
    var results = client.search("wireless earbuds", true);

    assertEquals(1, results.size());
    var product = results.get(0);
    assertEquals("QuietComfort Earbuds", product.name());
    assertTrue(product.inStock());
    assertEquals(1, product.offers().size());
    assertEquals("InStock", product.offers().get(0).availability());
    assertFalse(
        product.offers().stream()
            .anyMatch(offer -> "OutOfStock".equalsIgnoreCase(offer.availability())));
  }

  private void handleSearch(HttpExchange exchange) throws IOException {
    receivedApiKey.set(exchange.getRequestHeaders().getFirst("x-api-key"));
    receivedBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));

    byte[] response = SAMPLE_RESPONSE.getBytes(StandardCharsets.UTF_8);
    exchange.getResponseHeaders().add("Content-Type", "application/json");
    exchange.sendResponseHeaders(200, response.length);
    try (var output = exchange.getResponseBody()) {
      output.write(response);
    }
  }
}
