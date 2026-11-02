package com.quickown.backend.controller;

import com.quickown.backend.dto.ai.AiRequest;
import com.quickown.backend.dto.ai.AiResponse;
import com.quickown.backend.service.ai.AiShoppingService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** REST endpoints for AI-assisted shopping experiences. */
@RestController
@RequestMapping("/api/ai")
public class AiShoppingController {

  private final AiShoppingService aiShoppingService;

  public AiShoppingController(AiShoppingService aiShoppingService) {
    this.aiShoppingService = aiShoppingService;
  }

  @PostMapping("/test")
  public AiResponse testGemini(@Valid @RequestBody AiRequest request) {
    return new AiResponse(aiShoppingService.answer(request.message()));
  }
}
