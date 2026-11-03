package com.quickown.backend.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Explicit browser-origin allowlist for local development and the deployed frontend. */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

  private final List<String> frontendOrigins;

  public CorsConfig(
      @Value(
              "${cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173}")
          String configuredOrigins) {
    this.frontendOrigins =
        Arrays.stream(configuredOrigins.split(","))
            .map(String::trim)
            .filter(origin -> !origin.isBlank())
            .distinct()
            .toList();
    if (frontendOrigins.isEmpty()) {
      throw new IllegalArgumentException(
          "At least one explicit frontend origin must be configured in FRONTEND_ORIGINS.");
    }
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry
        .addMapping("/api/**")
        .allowedOrigins(frontendOrigins.toArray(String[]::new))
        .allowedMethods("GET", "POST", "OPTIONS")
        .allowedHeaders(
            "Content-Type",
            "Accept",
            "Authorization",
            "Idempotency-Key",
            "X-Requested-With")
        .exposedHeaders("Location")
        .allowCredentials(false)
        .maxAge(3600);
  }
}
