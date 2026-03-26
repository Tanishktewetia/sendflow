package com.javamailer.controller;

import com.javamailer.security.JwtTokenProvider;
import com.javamailer.security.JwtUserDetails;
import com.javamailer.entity.User;
import com.javamailer.entity.EmailVerificationToken;
import com.javamailer.service.AuthService;
import com.javamailer.service.UserService;
import com.javamailer.service.SystemEmailService;
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
@RequestMapping("/auth")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
@RequiredArgsConstructor
public class AuthController {
    
    private final AuthService authService;
    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;
    private final SystemEmailService systemEmailService;
    
    /**
     * Register new user - Step 1
     * POST /api/auth/register
     * 
     * Request: { "email": "user@example.com", "password": "Pass123", "fullName": "John Doe" }
     * Response: OTP sent to email, user stored in memory only (NOT database yet)
     * 
     * Takes user through validation and sends OTP to email
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String password = request.get("password");
            String fullName = request.get("fullName");
            
            // Normalize email
            if (email != null) {
                email = email.toLowerCase().trim();
            }
            if (fullName != null) {
                fullName = fullName.trim();
            }
            
            // Validate input
            if (email == null || password == null || fullName == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Missing required fields: email, password, fullName"));
            }
            
            // Register user: validate + send OTP (stored in memory only)
            Map<String, String> regData = authService.registerUser(email, password, fullName);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", regData.get("message"));
            response.put("email", email);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Verify OTP and Create User - Step 2
     * POST /api/auth/verify-otp
     * 
     * Request: { "email": "user@example.com", "otp": "123456" }
     * Response: User created in database, ready to login
     * 
     * Verifies OTP matches and creates user in users table
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String otp = request.get("otp");
            
            if (email == null || otp == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Missing email or OTP"));
            }
            
            email = email.toLowerCase().trim();
            
            // Verify OTP and create user in database
            Map<String, String> result = authService.verifyOtpAndCreateUser(email, otp);
            
            return ResponseEntity.ok(Map.of(
                "message", result.get("message"),
                "email", result.get("email")
            ));
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Resend OTP with 60-second throttle
     * POST /api/auth/resend-otp
     * Request body: { "email": "user@example.com" }
     * 
     * Generates new OTP and resends to email
     * Only allows resend after 60 seconds since last resend
     */
    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            
            if (email == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Missing email"));
            }
            
            email = email.toLowerCase().trim();
            
            // Resend OTP with throttle check
            Map<String, String> result = authService.resendOtp(email);
            
            return ResponseEntity.ok(Map.of("message", result.get("message")));
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Legacy endpoint - kept for backward compatibility
     * @deprecated Use /register and /verify-otp instead
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
            
            // Normalize email
            if (email != null) {
                email = email.toLowerCase().trim();
            }
            
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
            
            // Normalize email
            if (email != null) {
                email = email.toLowerCase().trim();
            }
            
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
     * Verify OTP for password reset
     * POST /api/auth/verify-password-reset-otp
     */
    @PostMapping("/verify-password-reset-otp")
    public ResponseEntity<?> verifyPasswordResetOtp(@RequestBody Map<String, String> request) {
        try {
            String token = request.get("resetToken");
            String otp = request.get("otp");
            
            if (token == null || otp == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Missing resetToken or otp"));
            }
            
            // Note: We validate OTP in the reset-password endpoint
            // Here we just confirm the OTP format is correct
            if (otp.length() != 6 || !otp.matches("\\d+")) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Invalid OTP format. Must be 6 digits."));
            }
            
            return ResponseEntity.ok(Map.of("message", "OTP format is valid. Proceed to reset password."));
            
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
     * Resend OTP for password reset (with 1-minute throttling)
     * POST /api/auth/resend-password-reset-otp
     */
    @PostMapping("/resend-password-reset-otp")
    public ResponseEntity<?> resendPasswordResetOtp(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            
            // Normalize email
            if (email != null) {
                email = email.toLowerCase().trim();
            }
            
            if (email == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Missing email"));
            }
            
            String resetToken = authService.resendPasswordResetOtp(email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "OTP resent successfully. Check your email.");
            response.put("resetToken", resetToken);
            response.put("throttleSeconds", 60);
            response.put("expiryMinutes", 5);
            
            return ResponseEntity.ok(response);
            
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
