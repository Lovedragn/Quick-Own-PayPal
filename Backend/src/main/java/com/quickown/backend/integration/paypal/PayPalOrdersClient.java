package com.quickown.backend.integration.paypal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickown.backend.exception.PayPalApiException;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class PayPalOrdersClient {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final PayPalAuthService authService;
  private final String baseUrl;
  private final HttpClient httpClient;

  public PayPalOrdersClient(
      PayPalAuthService authService,
      @Value("${paypal.base-url:https://api-m.sandbox.paypal.com}") String baseUrl) {
    this.authService = authService;
    this.baseUrl =
        baseUrl == null ? "https://api-m.sandbox.paypal.com" : baseUrl.replaceAll("/+$", "");
    this.httpClient =
        HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(10))
            .build();
  }

  public JsonNode createOrder(JsonNode requestBody, String requestId) {
    return send("POST", "/v2/checkout/orders", requestBody, requestId);
  }

  public JsonNode getOrder(String orderId) {
    return send("GET", "/v2/checkout/orders/" + safeOrderId(orderId), null, null);
  }

  public JsonNode captureOrder(String orderId, String requestId) {
    return send(
        "POST",
        "/v2/checkout/orders/" + safeOrderId(orderId) + "/capture",
        objectMapper.createObjectNode(),
        requestId);
  }

  private JsonNode send(String method, String path, JsonNode body, String requestId) {
    try {
      HttpRequest.Builder builder =
          HttpRequest.newBuilder()
              .uri(URI.create(baseUrl + path))
              .timeout(Duration.ofSeconds(30))
              .header("Authorization", "Bearer " + authService.getAccessToken())
              .header("Accept", "application/json")
              .header("Content-Type", "application/json")
              .header("Prefer", "return=representation");

      if (requestId != null && !requestId.isBlank()) {
        builder.header("PayPal-Request-Id", requestId);
      }

      if ("GET".equalsIgnoreCase(method)) {
        builder.GET();
      } else {
        String payload = body == null ? "{}" : objectMapper.writeValueAsString(body);
        builder.method(method, HttpRequest.BodyPublishers.ofString(payload));
      }

      HttpResponse<String> response =
          httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());

      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new PayPalApiException(
            response.statusCode(),
            "PayPal Orders API returned HTTP "
                + response.statusCode()
                + ": "
                + summarizeError(response.body()));
      }

      if (response.body() == null || response.body().isBlank()) {
        return objectMapper.createObjectNode();
      }
      return objectMapper.readTree(response.body());
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new PayPalApiException(502, "PayPal Orders request was interrupted.", exception);
    } catch (IOException exception) {
      throw new PayPalApiException(502, "Could not read the PayPal Orders response.", exception);
    }
  }

  private String summarizeError(String responseBody) {
    if (responseBody == null || responseBody.isBlank()) {
      return "No error details were provided.";
    }

    try {
      JsonNode error = objectMapper.readTree(responseBody);
      String name = error.path("name").asText("");
      String message = error.path("message").asText("");
      StringBuilder summary = new StringBuilder();

      if (!name.isBlank()) {
        summary.append(name);
      }
      if (!message.isBlank()) {
        if (!summary.isEmpty()) {
          summary.append(": ");
        }
        summary.append(message);
      }

      JsonNode details = error.path("details");
      if (details.isArray()) {
        for (JsonNode detail : details) {
          String issue = detail.path("issue").asText("");
          String field = detail.path("field").asText("");
          String description = detail.path("description").asText("");
          if (!issue.isBlank() || !field.isBlank() || !description.isBlank()) {
            summary.append(" [");
            summary.append(issue.isBlank() ? "DETAIL" : issue);
            if (!field.isBlank()) {
              summary.append(" at ").append(field);
            }
            if (!description.isBlank()) {
              summary.append(": ").append(description);
            }
            summary.append("]");
          }
        }
      }

      return summary.isEmpty() ? "PayPal rejected the request." : summary.toString();
    } catch (IOException ignored) {
      return "PayPal rejected the request and returned an unreadable error body.";
    }
  }

  private String safeOrderId(String orderId) {
    if (orderId == null || !orderId.matches("[A-Za-z0-9_-]{5,64}")) {
      throw new IllegalArgumentException("Invalid PayPal order ID.");
    }
    return orderId;
  }
}
