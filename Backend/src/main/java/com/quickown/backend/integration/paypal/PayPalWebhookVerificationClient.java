package com.quickown.backend.integration.paypal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.quickown.backend.exception.PayPalApiException;
import com.quickown.backend.exception.PayPalNotConfiguredException;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Verifies PayPal webhook signatures against PayPal's server-side verification API. */
@Component
public class PayPalWebhookVerificationClient {

  private final ObjectMapper mapper = new ObjectMapper();
  private final PayPalAuthService authService;
  private final String baseUrl;
  private final String webhookId;
  private final HttpClient httpClient;

  public PayPalWebhookVerificationClient(
      PayPalAuthService authService,
      @Value("${paypal.base-url:https://api-m.sandbox.paypal.com}") String baseUrl,
      @Value("${paypal.webhook-id:}") String webhookId) {
    this.authService = authService;
    this.baseUrl =
        baseUrl == null || baseUrl.isBlank()
            ? "https://api-m.sandbox.paypal.com"
            : baseUrl.replaceAll("[;/\\s]+$", "");
    this.webhookId = webhookId == null ? "" : webhookId.trim();
    this.httpClient =
        HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(10))
            .build();
  }

  public boolean verify(
      String transmissionId,
      String transmissionTime,
      String transmissionSignature,
      String certificateUrl,
      String authAlgorithm,
      JsonNode event) {
    if (webhookId.isBlank()) {
      throw new PayPalNotConfiguredException(
          "PayPal webhook verification is not configured. Set PAYPAL_WEBHOOK_ID.");
    }
    if (isBlank(transmissionId)
        || isBlank(transmissionTime)
        || isBlank(transmissionSignature)
        || isBlank(certificateUrl)
        || isBlank(authAlgorithm)
        || event == null
        || !event.isObject()) {
      return false;
    }

    try {
      ObjectNode payload = mapper.createObjectNode();
      payload.put("transmission_id", transmissionId);
      payload.put("transmission_time", transmissionTime);
      payload.put("transmission_sig", transmissionSignature);
      payload.put("cert_url", certificateUrl);
      payload.put("auth_algo", authAlgorithm);
      payload.put("webhook_id", webhookId);
      payload.set("webhook_event", event);

      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(baseUrl + "/v1/notifications/verify-webhook-signature"))
              .timeout(Duration.ofSeconds(20))
              .header("Authorization", "Bearer " + authService.getAccessToken())
              .header("Accept", "application/json")
              .header("Content-Type", "application/json")
              .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(payload)))
              .build();

      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new PayPalApiException(
            response.statusCode(),
            "PayPal webhook verification API returned HTTP " + response.statusCode() + ".");
      }

      JsonNode body = mapper.readTree(response.body());
      return "SUCCESS".equalsIgnoreCase(body.path("verification_status").asText());
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new PayPalApiException(502, "PayPal webhook verification was interrupted.", exception);
    } catch (IOException exception) {
      throw new PayPalApiException(502, "Could not read PayPal webhook verification response.", exception);
    }
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
