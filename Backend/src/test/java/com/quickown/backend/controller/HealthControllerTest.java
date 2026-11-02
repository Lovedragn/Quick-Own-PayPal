package com.quickown.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class HealthControllerTest {

  @Test
  void returnsServiceHealth() {
    var response = new HealthController().health();

    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertEquals("UP", response.getBody().get("status"));
    assertEquals("quick-own-backend", response.getBody().get("service"));
  }
}
