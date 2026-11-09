package com.quickown.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.net.URI;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.util.UriComponentsBuilder;

class AuthControllerTest {

  private final AuthController controller =
      new AuthController("https://thzyahamwbizvpcwaszx.supabase.co");

  @Test
  void redirectsOAuthToSupabaseWithFrontendCallback() {
    ResponseEntity<Void> response = controller.redirectToSupabaseGoogleOAuth(null);

    assertEquals(HttpStatus.FOUND, response.getStatusCode());
    URI location = response.getHeaders().getLocation();
    assertNotNull(location);
    assertEquals(
        "https://thzyahamwbizvpcwaszx.supabase.co/auth/v1/authorize",
        location.getScheme() + "://" + location.getAuthority() + location.getPath());
    assertEquals(
        "google",
        UriComponentsBuilder.fromUri(location).build().getQueryParams().getFirst("provider"));
    assertEquals(
        "http://localhost:3000/auth/callback",
        UriComponentsBuilder.fromUri(location)
            .build()
            .getQueryParams()
            .getFirst("redirect_to"));
  }

  @Test
  void acceptsAnAllowlistedFrontendCallback() {
    ResponseEntity<Void> response =
        controller.redirectToSupabaseGoogleOAuth("http://localhost:3000/auth/callback");

    assertEquals(HttpStatus.FOUND, response.getStatusCode());
    assertEquals(
        "http://localhost:3000/auth/callback",
        UriComponentsBuilder.fromUri(response.getHeaders().getLocation())
            .build()
            .getQueryParams()
            .getFirst("redirect_to"));
  }

  @Test
  void rejectsNestedCallbackQueryOverrides() {
    ResponseEntity<Void> response =
        controller.redirectToSupabaseGoogleOAuth(
            "http://localhost:3000/auth/callback?next=https://attacker.example");

    assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
  }

  @Test
  void rejectsExternalOAuthCallbackRedirects() {
    ResponseEntity<Void> response =
        controller.redirectToSupabaseGoogleOAuth("https://attacker.example/callback");

    assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
  }

  @Test
  void returnsLoginInfo() {
    ResponseEntity<Map<String, String>> response = controller.loginInfo(Map.of());

    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertEquals("supabase", response.getBody().get("provider"));
  }
}
