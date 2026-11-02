package com.quickown.backend.service.ai;

import com.quickown.backend.ai.tool.ProductSearchTool;
import com.quickown.backend.exception.AiProviderException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

/** Application service coordinating Gemini prompts and shopping-tool execution. */
@Service
public class AiShoppingService {

  private static final Logger LOGGER = LoggerFactory.getLogger(AiShoppingService.class);

  private static final String SYSTEM_PROMPT =
      """
      You are Quick-Own, an intelligent shopping assistant.

      Help customers discover products from the available catalogue.

      When a customer asks to find products, use the search_products tool.
      When the customer asks for available, currently available, in-stock,
      or purchasable products, you MUST set inStockOnly=true.

      Never recommend or describe an out-of-stock product as available.
      If the tool returns no products for an in-stock request, clearly say
      that no matching products are currently in stock. Do not suggest
      out-of-stock alternatives or products from unrelated categories.

      Never invent product names, prices, features or availability.
      Only recommend products returned by the tool.
      Preserve the exact price and currency returned by the catalogue.
      Never convert currencies or assume a currency when the offer does not provide one.
      """;

  private final ChatClient chatClient;
  private final ProductSearchTool productSearchTool;

  public AiShoppingService(
      ChatClient.Builder chatClientBuilder, ProductSearchTool productSearchTool) {
    this.chatClient = chatClientBuilder.build();
    this.productSearchTool = productSearchTool;
  }

  public String answer(String message) {
    try {
      return chatClient
          .prompt()
          .system(SYSTEM_PROMPT)
          .user(message)
          .tools(productSearchTool)
          .call()
          .content();
    } catch (RuntimeException exception) {
      LOGGER.error("Gemini shopping request failed.", exception);
      if (isQuotaExceeded(exception)) {
        throw new AiProviderException(
            429,
            "GEMINI_QUOTA_EXCEEDED",
            "Gemini API quota is exhausted. Check the project's quota or retry later.",
            exception);
      }

      throw new AiProviderException(
          502, "AI_PROVIDER_ERROR", "The AI provider could not complete the request.", exception);
    }
  }

  private boolean isQuotaExceeded(Throwable exception) {
    Throwable current = exception;
    while (current != null) {
      String message = current.getMessage();
      if (message != null) {
        String normalized = message.toLowerCase();
        if (normalized.contains("quota exceeded")
            || normalized.contains("free_tier_requests")
            || (normalized.contains("429")
                && (normalized.contains("quota") || normalized.contains("rate limit")))) {
          return true;
        }
      }
      current = current.getCause();
    }
    return false;
  }
}
