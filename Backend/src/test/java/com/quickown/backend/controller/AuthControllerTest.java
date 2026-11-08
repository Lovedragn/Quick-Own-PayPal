package com.quickown.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class AuthControllerTest {

  private final AuthController controller =
      new AuthController("https://thzyahamwbizvpcwaszx.supabase.co");

  @Test
  void redirectsOAuthToSupabase() {
    ResponseEntity<Void> response = controller.redirectToSupabaseGoogleOAuth();

    assertEquals(HttpStatus.FOUND, response.getStatusCode());
    assertNotNull(response.getHeaders().getLocation());
    assertEquals(
        "https://thzyahamwbizvpcwaszx.supabase.co/auth/v1/authorize?provider=google",
        response.getHeaders().getLocation().toString());
  }

  @Test
  void returnsLoginInfo() {
    ResponseEntity<Map<String, String>> response = controller.loginInfo(Map.of());

    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertEquals("supabase", response.getBody().get("provider"));
  }
}

