package com.quickown.backend.integration.paypal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickown.backend.exception.PayPalNotConfiguredException;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PayPalWebhookVerificationClientTest {

  private final ObjectMapper mapper = new ObjectMapper();
  private final AtomicReference<JsonNode> verificationRequest = new AtomicReference<>();
  private final AtomicReference<String> verificationStatus = new AtomicReference<>("SUCCESS");
  private HttpServer server;
  private String baseUrl;
  private PayPalWebhookVerificationClient client;

  @BeforeEach
  void setUp() throws IOException {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();

    server.createContext("/v1/oauth2/token", this::handleToken);
    server.createContext(
        "/v1/notifications/verify-webhook-signature", this::handleVerification);
    server.start();

    PayPalAuthService auth =
        new PayPalAuthService("test-client-id", "test-client-secret", baseUrl);
    client = new PayPalWebhookVerificationClient(auth, baseUrl, "SANDBOX-WEBHOOK-123");
  }

  @AfterEach
  void tearDown() {
    if (server != null) {
      server.stop(0);
    }
  }

  @Test
  void sendsAllRequiredFieldsToPayPalAndAcceptsSuccess() throws Exception {
    JsonNode event =
        mapper.readTree(
            """
            {"id":"WH-123","event_type":"PAYMENT.CAPTURE.COMPLETED","resource":{"id":"CAPTURE123"}}
            """);

    boolean verified =
        client.verify(
            "transmission-id",
            "2026-11-01T10:00:00Z",
            "signed-value",
            "https://api.paypal.com/cert",
            "SHA256withRSA",
            event);

    assertTrue(verified);
    JsonNode sent = verificationRequest.get();
    assertEquals("transmission-id", sent.path("transmission_id").asText());
    assertEquals("2026-11-01T10:00:00Z", sent.path("transmission_time").asText());
    assertEquals("signed-value", sent.path("transmission_sig").asText());
    assertEquals("https://api.paypal.com/cert", sent.path("cert_url").asText());
    assertEquals("SHA256withRSA", sent.path("auth_algo").asText());
    assertEquals("SANDBOX-WEBHOOK-123", sent.path("webhook_id").asText());
    assertEquals("WH-123", sent.path("webhook_event").path("id").asText());
  }

  @Test
  void rejectsWebhookWhenPayPalVerificationSaysFailure() throws Exception {
    verificationStatus.set("FAILURE");
    JsonNode event = mapper.readTree("{\"event_type\":\"PAYMENT.CAPTURE.COMPLETED\"}");

    assertFalse(
        client.verify("transmission-id", "time", "signature", "cert", "SHA256withRSA", event));
  }

  @Test
  void refusesToVerifyWhenWebhookIdIsNotConfigured() throws Exception {
    PayPalAuthService auth =
        new PayPalAuthService("test-client-id", "test-client-secret", baseUrl);
    PayPalWebhookVerificationClient unconfigured =
        new PayPalWebhookVerificationClient(auth, baseUrl, "");
    JsonNode event = mapper.readTree("{\"event_type\":\"PAYMENT.CAPTURE.COMPLETED\"}");

    assertThrows(
        PayPalNotConfiguredException.class,
        () -> unconfigured.verify("id", "time", "sig", "cert", "SHA256withRSA", event));
  }

  private void handleToken(HttpExchange exchange) throws IOException {
    respond(
        exchange,
        200,
        """
        {"access_token":"test-access-token","token_type":"Bearer","expires_in":3600}
        """);
  }

  private void handleVerification(HttpExchange exchange) throws IOException {
    assertEquals(
        "Bearer test-access-token", exchange.getRequestHeaders().getFirst("Authorization"));
    verificationRequest.set(mapper.readTree(exchange.getRequestBody().readAllBytes()));
    respond(
        exchange,
        200,
        "{\"verification_status\":\"" + verificationStatus.get() + "\"}");
  }

  private void respond(HttpExchange exchange, int status, String body) throws IOException {
    byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
    exchange.getResponseHeaders().add("Content-Type", "application/json");
    exchange.sendResponseHeaders(status, bytes.length);
    try (var output = exchange.getResponseBody()) {
      output.write(bytes);
    }
  }
}
