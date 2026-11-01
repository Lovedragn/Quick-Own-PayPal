package com.quickown.backend.exception;

/** Raised when the Channel3 catalogue integration cannot fulfil a request. */
public class Channel3ApiException extends RuntimeException {

  public Channel3ApiException(String message) {
    super(message);
  }

  public Channel3ApiException(String message, Throwable cause) {
    super(message, cause);
  }
}
