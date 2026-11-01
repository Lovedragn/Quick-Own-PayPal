package com.quickown.backend.exception;

import com.quickown.backend.dto.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Central REST exception translation for all controllers.
 *
 * <p>Provider details and stack traces are logged server-side and never returned to clients.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(AiProviderException.class)
  public ResponseEntity<ApiErrorResponse> handleAiProvider(
      AiProviderException exception, HttpServletRequest request) {
    return response(
        exception.getHttpStatus(), exception.getErrorCode(), exception.getPublicMessage(), request);
  }

  @ExceptionHandler(PayPalNotConfiguredException.class)
  public ResponseEntity<ApiErrorResponse> handlePayPalNotConfigured(
      PayPalNotConfiguredException exception, HttpServletRequest request) {
    return response(
        HttpStatus.SERVICE_UNAVAILABLE.value(),
        "PAYPAL_NOT_CONFIGURED",
        exception.getMessage(),
        request);
  }

  @ExceptionHandler(PayPalApiException.class)
  public ResponseEntity<ApiErrorResponse> handlePayPalApi(
      PayPalApiException exception, HttpServletRequest request) {
    LOGGER.warn("PayPal integration failed: {}", exception.getMessage());
    return response(
        HttpStatus.BAD_GATEWAY.value(), "PAYPAL_API_ERROR", exception.getMessage(), request);
  }

  @ExceptionHandler(Channel3ApiException.class)
  public ResponseEntity<ApiErrorResponse> handleChannel3Api(
      Channel3ApiException exception, HttpServletRequest request) {
    LOGGER.warn("Channel3 integration failed: {}", exception.getMessage());
    return response(
        HttpStatus.BAD_GATEWAY.value(), "CHANNEL3_PROVIDER_ERROR", exception.getMessage(), request);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiErrorResponse> handleInvalidBody(
      MethodArgumentNotValidException exception, HttpServletRequest request) {
    String message =
        exception.getBindingResult().getFieldErrors().stream()
            .map(this::formatFieldError)
            .collect(Collectors.joining("; "));

    return response(
        HttpStatus.BAD_REQUEST.value(),
        "VALIDATION_ERROR",
        message.isBlank() ? "Request validation failed." : message,
        request);
  }

  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<ApiErrorResponse> handleConstraintViolation(
      ConstraintViolationException exception, HttpServletRequest request) {
    String message =
        exception.getConstraintViolations().stream()
            .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
            .collect(Collectors.joining("; "));

    return response(HttpStatus.BAD_REQUEST.value(), "VALIDATION_ERROR", message, request);
  }

  @ExceptionHandler({
    HttpMessageNotReadableException.class,
    MissingServletRequestParameterException.class,
    MethodArgumentTypeMismatchException.class
  })
  public ResponseEntity<ApiErrorResponse> handleMalformedRequest(
      Exception exception, HttpServletRequest request) {
    return response(
        HttpStatus.BAD_REQUEST.value(),
        "INVALID_REQUEST",
        "The request body or parameters are invalid.",
        request);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ApiErrorResponse> handleBadRequest(
      IllegalArgumentException exception, HttpServletRequest request) {
    return response(
        HttpStatus.BAD_REQUEST.value(), "INVALID_REQUEST", exception.getMessage(), request);
  }

  @ExceptionHandler(CheckoutConflictException.class)
  public ResponseEntity<ApiErrorResponse> handleCheckoutConflict(
      CheckoutConflictException exception, HttpServletRequest request) {
    return response(
        HttpStatus.CONFLICT.value(), "CHECKOUT_CONFLICT", exception.getMessage(), request);
  }

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<ApiErrorResponse> handleIllegalState(
      IllegalStateException exception, HttpServletRequest request) {
    return response(HttpStatus.CONFLICT.value(), "INVALID_STATE", exception.getMessage(), request);
  }

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  public ResponseEntity<ApiErrorResponse> handleMethodNotSupported(
      HttpRequestMethodNotSupportedException exception, HttpServletRequest request) {
    return response(
        HttpStatus.METHOD_NOT_ALLOWED.value(),
        "METHOD_NOT_ALLOWED",
        "The HTTP method is not supported for this endpoint.",
        request);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiErrorResponse> handleUnexpected(
      Exception exception, HttpServletRequest request) {
    LOGGER.error("Unhandled request failure for {}", request.getRequestURI(), exception);
    return response(
        HttpStatus.INTERNAL_SERVER_ERROR.value(),
        "INTERNAL_SERVER_ERROR",
        "An unexpected server error occurred.",
        request);
  }

  private String formatFieldError(FieldError error) {
    return error.getField() + ": " + error.getDefaultMessage();
  }

  private ResponseEntity<ApiErrorResponse> response(
      int status, String error, String message, HttpServletRequest request) {
    ApiErrorResponse body =
        new ApiErrorResponse(
            Instant.now(),
            status,
            error,
            message == null || message.isBlank() ? "Request could not be completed." : message,
            request.getRequestURI());
    return ResponseEntity.status(status).body(body);
  }
}
