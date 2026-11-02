package com.quickown.backend.integration.paypal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickown.backend.exception.PayPalApiException;
import com.quickown.backend.exception.PayPalNotConfiguredException;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Server-side PayPal OAuth client-credentials flow with a short-lived token cache. */
@Service
public class PayPalAuthService {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final String clientId;
  private final String clientSecret;
  private final String baseUrl;
  private final HttpClient httpClient;
  private volatile CachedToken cachedToken;

  public PayPalAuthService(
      @Value("${paypal.client-id:}") String clientId,
      @Value("${paypal.client-secret:}") String clientSecret,
      @Value("${paypal.base-url:https://api-m.sandbox.paypal.com}") String baseUrl) {
    this.clientId = clientId == null ? "" : clientId.trim();
    this.clientSecret = clientSecret == null ? "" : clientSecret.trim();
    this.baseUrl =
        baseUrl == null ? "https://api-m.sandbox.paypal.com" : baseUrl.replaceAll("/+$", "");
    this.httpClient =
        HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(java.time.Duration.ofSeconds(10))
            .build();
  }

  public boolean isConfigured() {
    return !clientId.isBlank() && !clientSecret.isBlank();
  }

  public String getAccessToken() {
    if (!isConfigured()) {
      throw new PayPalNotConfiguredException(
          "PayPal Sandbox credentials are not configured. Set PAYPAL_CLIENT_ID and"
              + " PAYPAL_CLIENT_SECRET.");
    }

    CachedToken current = cachedToken;
    if (current != null && current.expiresAt().isAfter(Instant.now().plusSeconds(30))) {
      return current.value();
    }

    synchronized (this) {
      current = cachedToken;
      if (current != null && current.expiresAt().isAfter(Instant.now().plusSeconds(30))) {
        return current.value();
      }
      cachedToken = requestNewToken();
      return cachedToken.value();
    }
  }

  private CachedToken requestNewToken() {
    try {
      String credentials = clientId + ":" + clientSecret;
      String basicAuth =
          Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));

      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(baseUrl + "/v1/oauth2/token"))
              .timeout(java.time.Duration.ofSeconds(20))
              .header("Authorization", "Basic " + basicAuth)
              .header("Content-Type", "application/x-www-form-urlencoded")
              .header("Accept", "application/json")
              .POST(
                  HttpRequest.BodyPublishers.ofString(
                      "grant_type="
                          + URLEncoder.encode("client_credentials", StandardCharsets.UTF_8)))
              .build();

      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString());

      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new PayPalApiException(
            response.statusCode(),
            "PayPal OAuth token request failed with HTTP " + response.statusCode() + ".");
      }

      JsonNode body = objectMapper.readTree(response.body());
      String token = body.path("access_token").asText("");
      long expiresIn = body.path("expires_in").asLong(0);
      if (token.isBlank() || expiresIn <= 0) {
        throw new PayPalApiException(
            502, "PayPal OAuth response did not contain a usable access token.");
      }

      long cacheSeconds = Math.max(30, expiresIn - 60);
      return new CachedToken(token, Instant.now().plusSeconds(cacheSeconds));
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new PayPalApiException(502, "PayPal OAuth request was interrupted.", exception);
    } catch (IOException exception) {
      throw new PayPalApiException(502, "Could not read the PayPal OAuth response.", exception);
    }
  }

  private record CachedToken(String value, Instant expiresAt) {}
}
