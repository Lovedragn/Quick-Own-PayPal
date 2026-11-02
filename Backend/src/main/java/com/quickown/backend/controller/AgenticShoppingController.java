package com.quickown.backend.controller;

import com.quickown.backend.dto.shopping.ShoppingRecommendationRequest;
import com.quickown.backend.dto.shopping.ShoppingRecommendationResponse;
import com.quickown.backend.service.ai.AgenticShoppingService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** AI agentic shopping endpoint: interpret, discover, filter and rank catalogue-backed offers. */
@RestController
@RequestMapping("/api/ai")
public class AgenticShoppingController {

  private final AgenticShoppingService agenticShoppingService;

  public AgenticShoppingController(AgenticShoppingService agenticShoppingService) {
    this.agenticShoppingService = agenticShoppingService;
  }

  @PostMapping("/recommendations")
  public ShoppingRecommendationResponse recommend(
      @Valid @RequestBody ShoppingRecommendationRequest request) {
    return agenticShoppingService.recommend(request.message());
  }
}
