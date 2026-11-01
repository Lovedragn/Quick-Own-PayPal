package com.quickown.backend.exception;

/** Raised when checkout state conflicts with the requested operation. */
public class CheckoutConflictException extends RuntimeException {

  public CheckoutConflictException(String message) {
    super(message);
  }
}
