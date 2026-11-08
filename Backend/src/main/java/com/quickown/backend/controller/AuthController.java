package com.quickown.backend.controller;

import java.net.URI;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller handling authentication endpoints and delegating OAuth redirects to Supabase.
 */
@RestController
public class AuthController {

  private static final Logger LOGGER = LoggerFactory.getLogger(AuthController.class);

  private final String supabaseUrl;

  public AuthController(
      @Value("${supabase.url:https://thzyahamwbizvpcwaszx.supabase.co}") String supabaseUrl) {
    this.supabaseUrl = supabaseUrl;
  }

  /**
   * Graceful handler for /oauth2/authorization/google.
   * Redirects directly to Supabase Google OAuth endpoint to eliminate 500/404 errors.
   */
  @GetMapping("/oauth2/authorization/google")
  public ResponseEntity<Void> redirectToSupabaseGoogleOAuth() {
    String redirectUri = supabaseUrl + "/auth/v1/authorize?provider=google";
    LOGGER.info("Redirecting OAuth request to Supabase: {}", redirectUri);
    return ResponseEntity.status(HttpStatus.FOUND)
        .location(URI.create(redirectUri))
        .build();
  }

  /**
   * Informative endpoints for legacy /api/login and /api/signup calls.
   */
  @PostMapping("/api/login")
  public ResponseEntity<Map<String, String>> loginInfo(@RequestBody(required = false) Map<String, Object> body) {
    return ResponseEntity.status(HttpStatus.OK).body(Map.of(
        "provider", "supabase",
        "message", "Authentication is handled by Supabase Auth on frontend client."
    ));
  }

  @PostMapping("/api/signup")
  public ResponseEntity<Map<String, String>> signupInfo(@RequestBody(required = false) Map<String, Object> body) {
    return ResponseEntity.status(HttpStatus.OK).body(Map.of(
        "provider", "supabase",
        "message", "Registration is handled by Supabase Auth on frontend client."
    ));
  }
}

