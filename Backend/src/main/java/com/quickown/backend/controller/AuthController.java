package com.quickown.backend.controller;

import java.net.URI;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Legacy authentication endpoints. Supabase remains the OAuth authority; this controller only
 * creates a safe provider redirect and never handles or stores user credentials.
 */
@RestController
public class AuthController {

  private static final Logger LOGGER = LoggerFactory.getLogger(AuthController.class);

  private final String supabaseUrl;
  private final String frontendBaseUrl;
  private final Set<String> allowedRedirectOrigins;

  @Autowired
  public AuthController(
      @Value("${supabase.url:https://thzyahamwbizvpcwaszx.supabase.co}") String supabaseUrl,
      @Value("${auth.frontend-base-url:http://localhost:3000}") String frontendBaseUrl,
      @Value("${cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173}")
          String allowedOrigins) {
    this.supabaseUrl = trimTrailingSlash(supabaseUrl);
    this.frontendBaseUrl = trimTrailingSlash(frontendBaseUrl);
    this.allowedRedirectOrigins =
        Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .map(this::normalizeOrigin)
            .filter(origin -> origin != null)
            .collect(Collectors.toUnmodifiableSet());
  }

  /** Test-friendly constructor retaining the local frontend defaults. */
  public AuthController(String supabaseUrl) {
    this(
        supabaseUrl,
        "http://localhost:3000",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173");
  }

  /**
   * Graceful handler for the legacy /oauth2/authorization/google endpoint.
   * Redirects to Supabase with an allowlisted frontend callback, preserving the PKCE callback URL.
   */
  @GetMapping("/oauth2/authorization/google")
  public ResponseEntity<Void> redirectToSupabaseGoogleOAuth(
      @RequestParam(value = "redirect_to", required = false) String requestedRedirect) {
    String callback = requestedRedirect;
    if (callback == null || callback.isBlank()) {
      callback = frontendBaseUrl + "/auth/callback";
    }

    URI callbackUri;
    try {
      callbackUri = URI.create(callback).normalize();
    } catch (IllegalArgumentException exception) {
      return ResponseEntity.badRequest().build();
    }

    if (callbackUri.getRawQuery() != null || callbackUri.getRawFragment() != null) {
      return ResponseEntity.badRequest().build();
    }

    String origin = normalizeOrigin(callbackUri.toString());
    if (origin == null || !allowedRedirectOrigins.contains(origin)) {
      LOGGER.warn("Rejected OAuth callback outside the configured frontend origins.");
      return ResponseEntity.badRequest().build();
    }

    URI authorizeUri =
        UriComponentsBuilder.fromUriString(supabaseUrl + "/auth/v1/authorize")
            .queryParam("provider", "google")
            .queryParam("redirect_to", callbackUri.toString())
            .build()
            .encode()
            .toUri();

    LOGGER.info("Redirecting legacy Google OAuth request to Supabase.");
    return ResponseEntity.status(HttpStatus.FOUND).location(authorizeUri).build();
  }

  private String normalizeOrigin(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    try {
      URI uri = URI.create(value.trim());
      String scheme = uri.getScheme();
      String host = uri.getHost();
      if (scheme == null
          || host == null
          || uri.getUserInfo() != null
          || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
        return null;
      }
      int port = uri.getPort();
      String normalized =
          scheme.toLowerCase() + "://" + host.toLowerCase();
      if (port != -1
          && !(scheme.equalsIgnoreCase("http") && port == 80)
          && !(scheme.equalsIgnoreCase("https") && port == 443)) {
        normalized += ":" + port;
      }
      return normalized;
    } catch (IllegalArgumentException exception) {
      return null;
    }
  }

  private String trimTrailingSlash(String value) {
    return value == null ? "" : value.replaceAll("/+$", "");
  }

  /** Informative endpoints for legacy /api/login and /api/signup calls. */
  @PostMapping("/api/login")
  public ResponseEntity<Map<String, String>> loginInfo(
      @RequestBody(required = false) Map<String, Object> body) {
    return ResponseEntity.ok(
        Map.of(
            "provider", "supabase",
            "message", "Authentication is handled by Supabase Auth on frontend client."));
  }

  @PostMapping("/api/signup")
  public ResponseEntity<Map<String, String>> signupInfo(
      @RequestBody(required = false) Map<String, Object> body) {
    return ResponseEntity.ok(
        Map.of(
            "provider", "supabase",
            "message", "Registration is handled by Supabase Auth on frontend client."));
  }
}
