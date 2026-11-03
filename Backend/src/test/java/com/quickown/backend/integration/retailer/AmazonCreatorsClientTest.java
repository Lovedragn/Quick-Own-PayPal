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

class AmazonCreatorsClientTest {

  private final ObjectMapper mapper = new ObjectMapper();
  private final AtomicReference<String> authorization = new AtomicReference<>();
  private final AtomicReference<String> marketplaceHeader = new AtomicReference<>();
  private final AtomicReference<JsonNode> searchRequest = new AtomicReference<>();
  private HttpServer server;
  private String baseUrl;

  @BeforeEach
  void setUp() throws IOException {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();
    server.createContext("/oauth/token", this::handleToken);
    server.createContext("/catalog/v1/searchItems", this::handleSearch);
    server.start();
  }

  @AfterEach
  void tearDown() {
    if (server != null) {
      server.stop(0);
    }
  }

  @Test
  void obtainsOAuthTokenAndMapsAmazonIndiaCreatorsSearchItems() throws Exception {
    var client =
        new AmazonCreatorsClient(
            "creators-client-id",
            "creators-client-secret",
            "quickown-21",
            "www.amazon.in",
            baseUrl + "/oauth/token",
            baseUrl);

    var products = client.search("Sony wireless headphones", true);

    assertTrue(client.isConfigured());
    assertEquals(1, products.size());
    assertEquals("AMAZON:B0SKU123", products.get(0).productId());
    assertEquals("Sony WH-CH720N", products.get(0).name());
    assertEquals("Sony", products.get(0).brand());
    assertEquals("Amazon.in", products.get(0).offers().get(0).merchant());
    assertEquals("INR", products.get(0).offers().get(0).currency());
    assertEquals("8990.0", products.get(0).offers().get(0).price().toPlainString());
    assertTrue(products.get(0).inStock());

    assertEquals("Bearer test-creators-token", authorization.get());
    assertEquals("www.amazon.in", marketplaceHeader.get());
    assertEquals("quickown-21", searchRequest.get().path("partnerTag").asText());
    assertEquals("Sony wireless headphones", searchRequest.get().path("keywords").asText());
    assertEquals("www.amazon.in", searchRequest.get().path("marketplace").asText());
    assertEquals("INR", searchRequest.get().path("currencyOfPreference").asText());
    assertTrue(
        searchRequest.get().path("resources").toString().contains("offersV2.listings.price"));
  }

  @Test
  void isDisabledWithoutApprovedCreatorsCredentialsAndPartnerTag() {
    var client =
        new AmazonCreatorsClient("", "", "", "www.amazon.in", baseUrl + "/oauth/token", baseUrl);
    assertTrue(!client.isConfigured());
    assertTrue(client.search("headphones", false).isEmpty());
  }

  private void handleToken(HttpExchange exchange) throws IOException {
    respond(
        exchange,
        """
        {"access_token":"test-creators-token","token_type":"bearer","expires_in":3600}
        """);
  }

  private void handleSearch(HttpExchange exchange) throws IOException {
    authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
    marketplaceHeader.set(exchange.getRequestHeaders().getFirst("x-marketplace"));
    searchRequest.set(mapper.readTree(exchange.getRequestBody().readAllBytes()));
    respond(
        exchange,
        """
        {
          "searchResult": {
            "items": [{
              "asin": "B0SKU123",
              "detailPageURL": "https://www.amazon.in/dp/B0SKU123",
              "images": {"primary": {"medium": {"url": "https://images.example/sony.jpg"}}},
              "itemInfo": {
                "title": {"displayValue": "Sony WH-CH720N"},
                "byLineInfo": {"brand": {"displayValue": "Sony"}},
                "classifications": {"productGroup": {"displayValue": "Headphones"}},
                "features": {"displayValues": ["Bluetooth wireless", "Noise cancellation"]}
              },
              "offersV2": {
                "listings": [{
                  "availability": {"type": "IN_STOCK", "maxOrderQuantity": 2},
                  "merchantInfo": {"name": "Amazon.in"},
                  "price": {"money": {"amount": 8990.00, "currency": "INR", "displayAmount": "₹8,990"}}
                }]
              }
            }]
          }
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
