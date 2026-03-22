package com.javamailer.controller;

import com.javamailer.security.JwtUserDetails;
import com.javamailer.entity.User;
import com.javamailer.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

/**
 * User Profile Controller
 * Handles user profile management, password changes
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;
    
    /**
     * Get user profile
     * GET /api/users/profile
     */
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Authentication authentication) {
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
            response.put("lastLoginAt", user.getLastLoginAt());
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Update user profile
     * PUT /api/users/profile
     */
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> request, Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }
            
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            String fullName = request.get("fullName");
            String displayName = request.getOrDefault("displayName", "");
            
            if (fullName == null || fullName.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "fullName is required"));
            }
            
            User user = userService.updateUserProfile(userId, fullName, displayName);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Profile updated successfully");
            response.put("userId", user.getId());
            response.put("fullName", user.getFullName());
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Change password
     * POST /api/users/change-password
     */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> request, Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }
            
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            String oldPassword = request.get("oldPassword");
            String newPassword = request.get("newPassword");
            
            if (oldPassword == null || newPassword == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Missing oldPassword or newPassword"));
            }
            
            userService.updatePassword(userId, oldPassword, newPassword);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Password changed successfully");
            response.put("userId", userId);
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Deactivate account
     * POST /api/users/deactivate
     */
    @PostMapping("/deactivate")
    public ResponseEntity<?> deactivateAccount(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }
            
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            userService.deactivateUser(userId);
            
            return ResponseEntity.ok(Map.of("message", "Account deactivated successfully"));
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
