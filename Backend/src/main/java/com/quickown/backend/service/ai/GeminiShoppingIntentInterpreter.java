package com.quickown.backend.service.ai;

import com.quickown.backend.dto.shopping.ShoppingIntent;
import com.quickown.backend.exception.AiProviderException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

/** Gemini-backed intent extraction; catalogue facts are fetched separately from Channel3. */
@Service
public class GeminiShoppingIntentInterpreter implements ShoppingIntentInterpreter {

  private static final Logger LOGGER =
      LoggerFactory.getLogger(GeminiShoppingIntentInterpreter.class);

  private static final String SYSTEM_PROMPT =
      """
      You are Quick-Own's shopping-intent interpreter.
      Convert the customer's request into a concise catalogue search intent.
      Return ONLY one valid JSON object, with no markdown or explanation, using exactly:
      {
        "searchQuery": "short product/category phrase suitable for a catalogue search",
        "category": "product category or empty string",
        "requiredFeatures": ["feature phrase 1", "feature phrase 2"]
      }

      Rules:
      - searchQuery must describe the product the customer wants, not the budget or shopping instructions.
      - Keep requiredFeatures to at most six concrete features/preferences explicitly requested.
      - Do not invent a budget, currency, brand, feature, technical specification or product.
      - Do not return products, prices, merchant names, availability or recommendations.
      - Keep the customer's original meaning. If a brand is requested, preserve it in searchQuery.
      - Numeric budget, currency and stock constraints are extracted and enforced separately by the server.
      """;

  private final ChatClient chatClient;
  private final ShoppingIntentParser parser;

  public GeminiShoppingIntentInterpreter(
      ChatClient.Builder chatClientBuilder, ShoppingIntentParser parser) {
    this.chatClient = chatClientBuilder.build();
    this.parser = parser;
  }

  @Override
  public ShoppingIntent interpret(String customerMessage) {
    try {
      String content =
          chatClient.prompt().system(SYSTEM_PROMPT).user(customerMessage).call().content();
      return parser.parse(customerMessage, content);
    } catch (RuntimeException exception) {
      LOGGER.error("Gemini shopping-intent extraction failed.", exception);
      if (isQuotaExceeded(exception)) {
        throw new AiProviderException(
            429,
            "GEMINI_QUOTA_EXCEEDED",
            "Gemini API quota is exhausted. Check the project's quota or retry later.",
            exception);
      }
      throw new AiProviderException(
          502,
          "AI_INTENT_ERROR",
          "The AI provider could not interpret the shopping request.",
          exception);
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
