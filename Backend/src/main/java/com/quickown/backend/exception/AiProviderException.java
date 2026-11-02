package com.quickown.backend.exception;

/** Normalized exception raised when the configured AI provider fails. */
public class AiProviderException extends RuntimeException {

  private final int httpStatus;
  private final String errorCode;
  private final String publicMessage;

  public AiProviderException(
      int httpStatus, String errorCode, String publicMessage, Throwable cause) {
    super(publicMessage, cause);
    this.httpStatus = httpStatus;
    this.errorCode = errorCode;
    this.publicMessage = publicMessage;
  }

  public int getHttpStatus() {
    return httpStatus;
  }

  public String getErrorCode() {
    return errorCode;
  }

  public String getPublicMessage() {
    return publicMessage;
  }
}
