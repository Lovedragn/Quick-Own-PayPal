package com.quickown.backend.dto;

import java.time.Instant;

/** Consistent error response returned by the REST API. */
public record ApiErrorResponse(
    Instant timestamp, int status, String error, String message, String path) {}
