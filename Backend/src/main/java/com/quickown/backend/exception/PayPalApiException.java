package com.quickown.backend.exception;

public class PayPalApiException extends RuntimeException {

  private final int statusCode;

  public PayPalApiException(int statusCode, String message) {
    super(message);
    this.statusCode = statusCode;
  }

  public PayPalApiException(int statusCode, String message, Throwable cause) {
    super(message, cause);
    this.statusCode = statusCode;
  }

  public int getStatusCode() {
    return statusCode;
  }
}
