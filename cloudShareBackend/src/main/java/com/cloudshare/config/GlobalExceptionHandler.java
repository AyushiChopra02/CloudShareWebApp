package com.cloudshare.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(RuntimeException.class)
  public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
    log.error("Runtime error: {}", ex.getMessage());

    HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
    if (ex.getMessage() != null) {
      String msg = ex.getMessage().toLowerCase();
      if (msg.contains("not found"))
        status = HttpStatus.NOT_FOUND;
      if (msg.contains("unauthorized"))
        status = HttpStatus.UNAUTHORIZED;
      if (msg.contains("limit reached"))
        status = HttpStatus.FORBIDDEN;
    }

    return ResponseEntity.status(status)
        .body(Map.of("error", ex.getMessage()));
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  public ResponseEntity<Map<String, String>> handleMaxSizeException(MaxUploadSizeExceededException ex) {
    return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
        .body(Map.of("error", "File size exceeds the maximum allowed size (50 MB)"));
  }
}
