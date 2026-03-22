package com.javamailer.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.SecretKey;
import java.util.Date;

/**
 * JWT Token Provider for generating and validating JWT tokens
 * Used for stateless authentication across API requests
 */
@Component
@RequiredArgsConstructor
public class JwtTokenProvider {
    
    @Value("${jwt.secret:your-secret-key-change-this-in-production-minimum-32-characters}")
    private String jwtSecret;
    
    @Value("${jwt.expiration:86400000}")
    private long jwtExpirationMs; // Default: 24 hours
    
    /**
     * Generate JWT token for authenticated user
     */
    public String generateToken(Long userId, String email) {
        return createToken(userId, email, jwtExpirationMs);
    }
    
    /**
     * Generate refresh token with longer expiration
     */
    public String generateRefreshToken(Long userId, String email) {
        long refreshTokenExpiry = jwtExpirationMs * 7; // 7 days
        return createToken(userId, email, refreshTokenExpiry);
    }
    
    /**
     * Create JWT token
     */
    private String createToken(Long userId, String email, long expirationTime) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationTime);
        
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
        
        return Jwts.builder()
                .subject(email)
                .claim("userId", userId)
                .claim("email", email)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key, SignatureAlgorithm.HS512)
                .compact();
    }
    
    /**
     * Get user ID from token
     */
    public Long getUserIdFromToken(String token) {
        try {
            Claims claims = getAllClaimsFromToken(token);
            return claims.get("userId", Long.class);
        } catch (JwtException | IllegalArgumentException e) {
            throw new RuntimeException("Invalid JWT token: " + e.getMessage());
        }
    }
    
    /**
     * Get email from token
     */
    public String getEmailFromToken(String token) {
        return getAllClaimsFromToken(token).getSubject();
    }
    
    /**
     * Validate token expiration
     */
    public boolean isTokenExpired(String token) {
        try {
            Claims claims = getAllClaimsFromToken(token);
            return claims.getExpiration().before(new Date());
        } catch (ExpiredJwtException e) {
            return true;
        }
    }
    
    /**
     * Validate token signature and claims
     */
    public boolean validateToken(String token) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
            Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token);
            
            return !isTokenExpired(token);
        } catch (SecurityException e) {
            throw new RuntimeException("Invalid JWT signature: " + e.getMessage());
        } catch (MalformedJwtException e) {
            throw new RuntimeException("Invalid JWT token: " + e.getMessage());
        } catch (ExpiredJwtException e) {
            throw new RuntimeException("Expired JWT token: " + e.getMessage());
        } catch (UnsupportedJwtException e) {
            throw new RuntimeException("Unsupported JWT token: " + e.getMessage());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("JWT claims string is empty: " + e.getMessage());
        }
    }
    
    /**
     * Extract all claims from token
     */
    private Claims getAllClaimsFromToken(String token) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
    
    /**
     * Extract token from authorization header
     */
    public String extractTokenFromHeader(String authorizationHeader) {
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            return authorizationHeader.substring(7);
        }
        return null;
    }
}
