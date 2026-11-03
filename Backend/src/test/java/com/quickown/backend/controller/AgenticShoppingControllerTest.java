package com.quickown.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.quickown.backend.catalog.MockProductCatalog;
import com.quickown.backend.dto.shopping.ShoppingIntent;
import com.quickown.backend.dto.shopping.ShoppingRecommendationRequest;
import com.quickown.backend.integration.channel3.Channel3CatalogClient;
import com.quickown.backend.service.ai.AgenticShoppingService;
import com.quickown.backend.service.catalog.ProductCatalogService;
import java.util.List;
import org.junit.jupiter.api.Test;

class AgenticShoppingControllerTest {

  @Test
  void returnsStructuredRecommendationsForFrontend() {
    var catalogue =
        new ProductCatalogService(
            new Channel3CatalogClient("", "https://api.trychannel3.com"),
            new MockProductCatalog());
    var intent =
        new ShoppingIntent(
            "wireless headphones", "headphones", List.of("noise cancellation"),
            null, null, false, true, null);
    var service = new AgenticShoppingService(message -> intent, catalogue);
    var controller = new AgenticShoppingController(service);

    var response =
        controller.recommend(
            new ShoppingRecommendationRequest("Find wireless headphones with noise cancellation in stock"));

    assertEquals(1, response.resultCount());
    assertEquals("wireless headphones", response.intent().searchQuery());
    assertEquals("Wireless Headphones 450", response.recommendations().get(0).product().name());
    assertEquals("Mock catalogue", response.recommendations().get(0).selectedOffer().merchant());
    assertTrue(response.recommendations().get(0).explanation().contains("noise cancellation"));
  }
}
