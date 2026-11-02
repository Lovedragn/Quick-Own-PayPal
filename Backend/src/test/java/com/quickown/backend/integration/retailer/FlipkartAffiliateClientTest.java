package com.quickown.backend.integration.retailer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class FlipkartAffiliateClientTest {

  private final ObjectMapper mapper = new ObjectMapper();
  private final AtomicReference<String> affiliateIdHeader = new AtomicReference<>();
  private final AtomicReference<String> affiliateTokenHeader = new AtomicReference<>();
  private final AtomicReference<String> query = new AtomicReference<>();
  private final AtomicReference<String> requestPath = new AtomicReference<>();
  private HttpServer server;
  private String baseUrl;

  @BeforeEach
  void setUp() throws IOException {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();
    server.createContext("/affiliate/1.0/search.json", this::handleSearch);
    server.start();
  }

  @AfterEach
  void tearDown() {
    if (server != null) {
      server.stop(0);
    }
  }

  @Test
  void authenticatesAndMapsOfficialFlipkartAffiliateSearchResponse() throws Exception {
    var client = new FlipkartAffiliateClient("tracking-id", "affiliate-token", baseUrl);

    var results = client.search("wireless headphones", true);

    assertTrue(client.isConfigured());
    assertEquals("tracking-id", affiliateIdHeader.get());
    assertEquals("affiliate-token", affiliateTokenHeader.get());
    assertEquals("/affiliate/1.0/search.json", requestPath.get());
    assertTrue(query.get().contains("wireless+headphones"));
    assertTrue(query.get().contains("resultCount=10"));
    assertEquals(1, results.size());
    var product = results.get(0);
    assertEquals("FLIPKART:SKU123", product.productId());
    assertEquals("Sony WH-CH720N", product.name());
    assertEquals("Flipkart", product.offers().get(0).merchant());
    assertEquals("INR", product.offers().get(0).currency());
    assertEquals("8990", product.offers().get(0).price().toPlainString());
    assertTrue(product.inStock());
  }

  private void handleSearch(HttpExchange exchange) throws IOException {
    affiliateIdHeader.set(exchange.getRequestHeaders().getFirst("Fk-Affiliate-Id"));
    affiliateTokenHeader.set(exchange.getRequestHeaders().getFirst("Fk-Affiliate-Token"));
    query.set(exchange.getRequestURI().getRawQuery());
    requestPath.set(exchange.getRequestURI().getPath());
    respond(
        exchange,
        """
        {
          "productInfoList": [{
            "productBaseInfoV1": {
              "productId": "SKU123",
              "title": "Sony WH-CH720N",
              "productDescription": "Wireless headphones with active noise cancellation",
              "productBrand": "Sony",
              "flipkartSpecialPrice": {"amount": 8990, "currency": "INR"},
              "flipkartSellingPrice": {"amount": 8990, "currency": "INR"},
              "productUrl": "https://www.flipkart.com/item?pid=SKU123&affid=tracking-id",
              "inStock": true,
              "isAvailable": true,
              "imageUrls": {"400x400": "https://image.example/sony.jpg"}
            },
            "categorySpecificInfoV1": {
              "keySpecs": ["Bluetooth", "Noise cancellation"]
            }
          }]
        }
        """);
  }

  private void respond(HttpExchange exchange, String body) throws IOException {
    byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
    exchange.getResponseHeaders().add("Content-Type", "application/json");
    exchange.sendResponseHeaders(200, bytes.length);
    try (var output = exchange.getResponseBody()) {
      output.write(bytes);
    }
  }
}
