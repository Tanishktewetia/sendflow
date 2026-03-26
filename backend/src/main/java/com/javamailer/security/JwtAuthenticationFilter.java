package com.javamailer.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.ArrayList;

/**
 * JWT Authentication Filter
 * Intercepts HTTP requests and validates JWT tokens
 * Runs once per request to extract and validate token
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private final JwtTokenProvider jwtTokenProvider;
    
    /**
     * Filter method - validate JWT token on each request
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                  HttpServletResponse response,
                                  FilterChain filterChain) throws ServletException, IOException {
        try {
            String authorizationHeader = request.getHeader("Authorization");
            
            // Extract token from header
            String token = jwtTokenProvider.extractTokenFromHeader(authorizationHeader);
            
            if (token != null) {
                try {
                    // Validate token
                    if (jwtTokenProvider.validateToken(token)) {
                        // Extract user info from token
                        Long userId = jwtTokenProvider.getUserIdFromToken(token);
                        String email = jwtTokenProvider.getEmailFromToken(token);
                        
                        // Create authentication token
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(
                                        email,
                                        null,
                                        new ArrayList<>() // Empty authorities - add roles later
                                );
                        
                        // Store user ID and email in authentication object for later access
                        authentication.setDetails(new JwtUserDetails(userId, email));
                        
                        // Set authentication in security context
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        
                        log.debug("JWT Token validated for user: {}", email);
                    }
                } catch (RuntimeException e) {
                    log.error("JWT token validation failed: {}", e.getMessage());
                    // Continue without authentication - let controller handle
                }
            }
            
        } catch (Exception e) {
            log.error("Error processing JWT token: {}", e.getMessage());
        }
        
        // Continue with filter chain
        filterChain.doFilter(request, response);
    }
    
    /**
     * Skip filter for certain paths
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String path = request.getRequestURI();
        String contextPath = request.getContextPath();
        
        // Remove context path (/api) if present to get the actual endpoint path
        if (!contextPath.isEmpty() && path.startsWith(contextPath)) {
            path = path.substring(contextPath.length());
        }
        
        boolean shouldSkip = path.startsWith("/auth/login") ||
               path.startsWith("/auth/register") ||
               path.startsWith("/auth/verify-email") ||
               path.startsWith("/auth/verify-otp") ||
               path.startsWith("/auth/forgot-password") ||
               path.startsWith("/auth/resend-otp") ||
               path.startsWith("/auth/reset-password") ||
               path.startsWith("/emails/health") ||
               path.startsWith("/public");
        
        // Debug logging
        log.debug("JWT Filter shouldNotFilter - URI: {}, ContextPath: {}, CleanPath: {}, Skip: {}", 
                  request.getRequestURI(), contextPath, path, shouldSkip);
        
        return shouldSkip;
    }
}
