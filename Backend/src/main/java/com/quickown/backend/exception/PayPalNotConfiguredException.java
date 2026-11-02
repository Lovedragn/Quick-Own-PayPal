package com.quickown.backend.exception;

/** Raised when PayPal checkout is called before Sandbox credentials are configured. */
public class PayPalNotConfiguredException extends RuntimeException {

  public PayPalNotConfiguredException(String message) {
    super(message);
  }
}
