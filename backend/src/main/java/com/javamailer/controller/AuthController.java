package com.javamailer.controller;

import com.javamailer.security.JwtTokenProvider;
import com.javamailer.security.JwtUserDetails;
import com.javamailer.entity.User;
import com.javamailer.service.AuthService;
import com.javamailer.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

/**
 * Authentication Controller
 * Handles user registration, login, email verification, and password reset
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final AuthService authService;
    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;
    
    /**
     * Register new user
     * POST /api/auth/register
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String password = request.get("password");
            String fullName = request.get("fullName");
            
            // Validate input
            if (email == null || password == null || fullName == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Missing required fields: email, password, fullName"));
            }
            
            // Register user
            User user = authService.registerUser(email, password, fullName);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Registration successful");
            response.put("userId", user.getId());
            response.put("email", user.getEmail());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Verify email with token
     * POST /api/auth/verify-email
     */
    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestBody Map<String, String> request) {
        try {
            String token = request.get("token");
            
            if (token == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Missing verification token"));
            }
            
            boolean verified = authService.verifyEmailToken(token);
            
            if (verified) {
                return ResponseEntity.ok(Map.of("message", "Email verified successfully. You can now login."));
            } else {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Email verification failed"));
            }
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Login user
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String password = request.get("password");
            
            if (email == null || password == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Missing email or password"));
            }
            
            // Authenticate user
            User user = authService.loginUser(email, password);
            
            // Generate JWT token
            String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail());
            String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId(), user.getEmail());
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Login successful");
            response.put("token", token);
            response.put("refreshToken", refreshToken);
            response.put("userId", user.getId());
            response.put("email", user.getEmail());
            response.put("fullName", user.getFullName());
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Request password reset (send OTP)
     * POST /api/auth/forgot-password
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            
            if (email == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Missing email"));
            }
            
            String resetToken = authService.requestPasswordReset(email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Password reset token generated. Check your email for OTP.");
            response.put("resetToken", resetToken);
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Reset password with OTP
     * POST /api/auth/reset-password
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        try {
            String token = request.get("resetToken");
            String otp = request.get("otp");
            String newPassword = request.get("newPassword");
            
            if (token == null || otp == null || newPassword == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Missing required fields: resetToken, otp, newPassword"));
            }
            
            boolean reset = authService.resetPassword(token, otp, newPassword);
            
            if (reset) {
                return ResponseEntity.ok(Map.of("message", "Password reset successfully. You can now login with new password."));
            } else {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Password reset failed"));
            }
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Get current authenticated user
     * GET /api/auth/me
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }
            
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            User user = userService.getUserById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            Map<String, Object> response = new HashMap<>();
            response.put("userId", user.getId());
            response.put("email", user.getEmail());
            response.put("fullName", user.getFullName());
            response.put("isEmailVerified", user.getIsEmailVerified());
            response.put("isActive", user.getIsActive());
            response.put("createdAt", user.getCreatedAt());
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
