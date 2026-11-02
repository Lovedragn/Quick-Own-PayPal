package com.quickown.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

  private final String frontendOrigin;

  public CorsConfig(@Value("${cors.allowed-origin:http://localhost:3000}") String frontendOrigin) {
    this.frontendOrigin = frontendOrigin;
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry
        .addMapping("/api/**")
        .allowedOrigins(frontendOrigin)
        .allowedMethods("GET", "POST", "OPTIONS")
        .allowedHeaders("Content-Type", "Accept", "Authorization", "Idempotency-Key")
        .allowCredentials(false)
        .maxAge(3600);
  }
}
