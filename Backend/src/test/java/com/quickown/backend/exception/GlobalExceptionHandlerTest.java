package com.quickown.backend.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.quickown.backend.dto.ApiErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

class GlobalExceptionHandlerTest {

  private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
  private final MockHttpServletRequest request = new MockHttpServletRequest();

  @Test
  void mapsPayPalConfigurationFailureToServiceUnavailable() {
    request.setRequestURI("/api/checkout/orders");

    ResponseEntity<ApiErrorResponse> response =
        handler.handlePayPalNotConfigured(
            new PayPalNotConfiguredException("Sandbox credentials are missing."), request);

    assertEquals(503, response.getStatusCode().value());
    assertEquals("PAYPAL_NOT_CONFIGURED", response.getBody().error());
    assertEquals("/api/checkout/orders", response.getBody().path());
  }

  @Test
  void mapsGeminiQuotaFailureToTooManyRequests() {
    request.setRequestURI("/api/ai/test");

    ResponseEntity<ApiErrorResponse> response =
        handler.handleAiProvider(
            new AiProviderException(
                429,
                "GEMINI_QUOTA_EXCEEDED",
                "Gemini quota is exhausted.",
                new RuntimeException("quota")),
            request);

    assertEquals(429, response.getStatusCode().value());
    assertEquals("GEMINI_QUOTA_EXCEEDED", response.getBody().error());
  }

  @Test
  void mapsChannel3FailureToBadGateway() {
    request.setRequestURI("/api/products/search");

    ResponseEntity<ApiErrorResponse> response =
        handler.handleChannel3Api(new Channel3ApiException("Channel3 unavailable."), request);

    assertEquals(502, response.getStatusCode().value());
    assertEquals("CHANNEL3_PROVIDER_ERROR", response.getBody().error());
  }

  @Test
  void mapsCheckoutConflictToConflict() {
    request.setRequestURI("/api/checkout/orders/test/capture");

    ResponseEntity<ApiErrorResponse> response =
        handler.handleCheckoutConflict(
            new CheckoutConflictException("Order is not approved."), request);

    assertEquals(409, response.getStatusCode().value());
    assertEquals("CHECKOUT_CONFLICT", response.getBody().error());
    assertNotNull(response.getBody().timestamp());
  }

  @Test
  void mapsNoResourceFoundToNotFound() {
    request.setRequestURI("/some/missing/path");

    org.springframework.web.servlet.resource.NoResourceFoundException ex =
        new org.springframework.web.servlet.resource.NoResourceFoundException(
            org.springframework.http.HttpMethod.GET, "some/missing/path", "Resource not found");

    ResponseEntity<ApiErrorResponse> response = handler.handleNoResourceFound(ex, request);

    assertEquals(404, response.getStatusCode().value());
    assertEquals("RESOURCE_NOT_FOUND", response.getBody().error());
    assertEquals("/some/missing/path", response.getBody().path());
  }
}
