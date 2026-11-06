package com.quickown.backend.controller;

import com.quickown.backend.dto.shopping.ShoppingRecommendationRequest;
import com.quickown.backend.dto.shopping.ShoppingRecommendationResponse;
import com.quickown.backend.service.ai.AgenticShoppingService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** AI agentic shopping endpoint: interpret, discover, filter and rank catalogue-backed offers. */
@RestController
@RequestMapping("/api/ai")
public class AgenticShoppingController {

  private static final Logger log = LoggerFactory.getLogger(AgenticShoppingController.class);

  private final AgenticShoppingService agenticShoppingService;

  public AgenticShoppingController(AgenticShoppingService agenticShoppingService) {
    this.agenticShoppingService = agenticShoppingService;
  }

  @PostMapping("/recommendations")
  public ShoppingRecommendationResponse recommend(
      @Valid @RequestBody ShoppingRecommendationRequest request) {
    log.info("Incoming shopping recommendation request: {}", request.message());
    ShoppingRecommendationResponse response = agenticShoppingService.recommend(request.message());
    log.info(
        "Shopping recommendation response for '{}': found {} recommendations, intent={}, response={}",
        request.message(),
        response.recommendations() != null ? response.recommendations().size() : 0,
        response.intent(),
        response);
    return response;
  }
}
