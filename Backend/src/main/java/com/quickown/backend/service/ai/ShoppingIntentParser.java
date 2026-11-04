package com.quickown.backend.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickown.backend.dto.shopping.ShoppingIntent;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * ###not useful rgt now
 * Parses Gemini's catalogue-search intent and independently validates numeric constraints.
 */
@Component
public class ShoppingIntentParser {

  private static final Pattern BUDGET_PATTERN =
      Pattern.compile(
          "(?i)(?:under|below|less\\s+than|up\\s+to|upto|within|max(?:imum)?|not\\s+more\\s+than|budget(?:\\s+of)?)\\s*(₹|rs\\.?|inr|\\$|usd)?\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)\\s*(usd|dollars?|inr|rupees?)?");
  private static final Pattern CURRENCY_AMOUNT_PATTERN =
      Pattern.compile("(?i)(₹|rs\\.?|inr|\\$|usd)\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)");
  private static final Pattern IN_STOCK_PATTERN =
      Pattern.compile("(?i)\\b(in\\s*stock|available|availability|purchasable)\\b");

  private final ObjectMapper mapper = new ObjectMapper();

  public ShoppingIntent parse(String customerMessage, String aiJson) {
    JsonNode root = readJsonObject(aiJson);
    String query = clean(root.path("searchQuery").asText(""));
    String category = clean(root.path("category").asText(""));
    List<String> features = readFeatures(root.path("requiredFeatures"));

    if (query.isBlank()) {
      throw new IllegalArgumentException("Gemini did not return a usable product search query.");
    }

    Budget budget = detectBudget(customerMessage);
    boolean inStockOnly = IN_STOCK_PATTERN.matcher(customerMessage).find();
    String notice =
        budget.amount() != null && budget.currency() == null
            ? "A budget was detected but its currency was not specified; no price cap was applied."
            : null;

    return new ShoppingIntent(
        query,
        category.isBlank() ? null : category,
        features,
        budget.amount(),
        budget.currency(),
        budget.amount() != null && budget.currency() != null,
        inStockOnly,
        notice);
  }

  private JsonNode readJsonObject(String content) {
    if (content == null || content.isBlank()) {
      throw new IllegalArgumentException("Gemini returned an empty shopping intent.");
    }
    String normalized = content.trim();
    if (normalized.startsWith("```")) {
      int firstLineBreak = normalized.indexOf('\n');
      if (firstLineBreak >= 0) {
        normalized = normalized.substring(firstLineBreak + 1);
      }
      normalized = normalized.trim();
      if (normalized.endsWith("```")) {
        normalized = normalized.substring(0, normalized.length() - 3).trim();
      }
    }
    int start = normalized.indexOf('{');
    int end = normalized.lastIndexOf('}');
    if (start < 0 || end <= start) {
      throw new IllegalArgumentException("Gemini returned invalid JSON for the shopping intent.");
    }
    try {
      JsonNode root = mapper.readTree(normalized.substring(start, end + 1));
      if (!root.isObject()) {
        throw new IllegalArgumentException("Shopping intent must be a JSON object.");
      }
      return root;
    } catch (Exception exception) {
      if (exception instanceof IllegalArgumentException illegalArgument) {
        throw illegalArgument;
      }
      throw new IllegalArgumentException("Gemini returned malformed JSON for the shopping intent.", exception);
    }
  }

  private List<String> readFeatures(JsonNode node) {
    if (!node.isArray()) {
      return List.of();
    }
    List<String> features = new ArrayList<>();
    for (JsonNode value : node) {
      if (value.isTextual()) {
        String feature = clean(value.asText());
        if (!feature.isBlank() && feature.length() <= 80 && !features.contains(feature)) {
          features.add(feature);
        }
      }
      if (features.size() == 6) {
        break;
      }
    }
    return List.copyOf(features);
  }

  private Budget detectBudget(String message) {
    Matcher matcher = BUDGET_PATTERN.matcher(message);
    if (matcher.find()) {
      return toBudget(matcher.group(1), matcher.group(2), matcher.group(3));
    }

    matcher = CURRENCY_AMOUNT_PATTERN.matcher(message);
    if (matcher.find()) {
      return toBudget(matcher.group(1), matcher.group(2), null);
    }
    return new Budget(null, null);
  }

  private Budget toBudget(String prefix, String rawAmount, String suffix) {
    String currency = currency(prefix);
    if (currency == null) {
      currency = currency(suffix);
    }
    try {
      BigDecimal amount = new BigDecimal(rawAmount.replace(",", ""));
      if (amount.signum() <= 0) {
        return new Budget(null, null);
      }
      return new Budget(amount, currency);
    } catch (NumberFormatException exception) {
      return new Budget(null, null);
    }
  }

  private String currency(String token) {
    if (token == null || token.isBlank()) {
      return null;
    }
    String normalized = token.toLowerCase(Locale.ROOT).replace(".", "").trim();
    if (normalized.equals("₹") || normalized.startsWith("rs") || normalized.equals("inr")
        || normalized.startsWith("rupee")) {
      return "INR";
    }
    if (normalized.equals("$") || normalized.equals("usd") || normalized.startsWith("dollar")) {
      return "USD";
    }
    return null;
  }

  private String clean(String value) {
    return value == null ? "" : value.trim().replaceAll("\\s+", " ");
  }

  private record Budget(BigDecimal amount, String currency) {}
}
