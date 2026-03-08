package com.cloudshare.config;

import com.auth0.jwk.*;
import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URL;
import java.security.interfaces.RSAPublicKey;
import java.time.Duration;

/**
 * Filter that verifies Clerk JWT tokens from the Authorization header.
 * Extends OncePerRequestFilter for proper Spring Boot lifecycle.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class ClerkAuthFilter extends OncePerRequestFilter {

  private static final Logger log = LoggerFactory.getLogger(ClerkAuthFilter.class);

  @Value("${clerk.jwks-url}")
  private String jwksUrl;

  @Value("${clerk.issuer}")
  private String issuer;

  private JwkProvider jwkProvider;

  @PostConstruct
  public void initialize() {
    try {
      jwkProvider = new JwkProviderBuilder(new URL(jwksUrl))
          .cached(10, Duration.ofHours(1))
          .build();
      log.info("ClerkAuthFilter initialized - JWKS: {}, Issuer: {}", jwksUrl, issuer);
    } catch (Exception e) {
      log.error("Failed to initialize ClerkAuthFilter: {}", e.getMessage(), e);
      throw new RuntimeException("Failed to initialize ClerkAuthFilter", e);
    }
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    String method = request.getMethod();

    // Skip preflight
    if ("OPTIONS".equalsIgnoreCase(method))
      return true;
    // Skip public endpoints
    if (path.startsWith("/api/files/public/"))
      return true;
    // Skip health endpoint
    if (path.equals("/api/health"))
      return true;
    // Skip non-API requests
    if (!path.startsWith("/api/"))
      return true;

    return false;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {

    String path = request.getRequestURI();
    String method = request.getMethod();

    log.info("Auth filter processing: {} {}", method, path);

    // Extract token
    String authHeader = request.getHeader("Authorization");
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      log.warn("Missing Authorization header for {} {}", method, path);
      sendError(request, response, HttpServletResponse.SC_UNAUTHORIZED,
          "Missing or invalid Authorization header");
      return;
    }

    String token = authHeader.substring(7).trim();
    if (token.isEmpty()) {
      log.warn("Empty token for {} {}", method, path);
      sendError(request, response, HttpServletResponse.SC_UNAUTHORIZED, "Empty token");
      return;
    }

    try {
      // Decode (without verification) to get the key ID
      DecodedJWT jwt = JWT.decode(token);
      String keyId = jwt.getKeyId();
      log.info("Token decoded - kid: {}, iss: {}, sub: {}, exp: {}",
          keyId, jwt.getIssuer(), jwt.getSubject(), jwt.getExpiresAt());

      // Get public key from Clerk JWKS
      Jwk jwk = jwkProvider.get(keyId);
      RSAPublicKey publicKey = (RSAPublicKey) jwk.getPublicKey();

      // Build verifier with clock skew tolerance
      Algorithm algorithm = Algorithm.RSA256(publicKey, null);
      JWTVerifier verifier = JWT.require(algorithm)
          .withIssuer(issuer)
          .acceptLeeway(120) // 2 minutes tolerance for clock skew
          .build();

      DecodedJWT verified = verifier.verify(token);

      // Extract Clerk user ID from "sub" claim
      String userId = verified.getSubject();
      request.setAttribute("userId", userId);

      log.info("Auth SUCCESS: user={} for {} {}", userId, method, path);
      filterChain.doFilter(request, response);

    } catch (Exception e) {
      log.error("Auth FAILED for {} {}: [{}] {}", method, path,
          e.getClass().getSimpleName(), e.getMessage());
      sendError(request, response, HttpServletResponse.SC_UNAUTHORIZED,
          "Invalid or expired token");
    }
  }

  private void sendError(HttpServletRequest request, HttpServletResponse response, int status, String message)
      throws IOException {
    // Ensure CORS headers are present on error responses
    String origin = request.getHeader("Origin");
    if (origin != null && !response.containsHeader("Access-Control-Allow-Origin")) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Access-Control-Allow-Credentials", "true");
    }
    response.setStatus(status);
    response.setContentType("application/json");
    response.setCharacterEncoding("UTF-8");
    response.getWriter().write("{\"error\":\"" + message + "\"}");
    response.getWriter().flush();
  }
}
