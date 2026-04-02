package com.javamailer.controller;

import com.javamailer.security.JwtUserDetails;
import com.javamailer.entity.User;
import com.javamailer.service.UserService;
import com.javamailer.service.SupabaseStorageService;
import com.javamailer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * User Profile Controller
 * Handles user profile management, password changes
 */
@Slf4j
@RestController
@RequestMapping("/users")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;
    private final SupabaseStorageService supabaseStorageService;
    private final UserRepository userRepository;
    
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
            response.put("avatarStoragePath", user.getAvatarStoragePath());
            
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
            
            String oldPassword = request.get("currentPassword");
            if (oldPassword == null) {
                oldPassword = request.get("oldPassword");
            }
            String newPassword = request.get("newPassword");
            
            if (oldPassword == null || newPassword == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Missing currentPassword/oldPassword or newPassword"));
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
            
            Long userId = resolveAuthenticatedUserId(authentication);
            
            userService.deactivateUser(userId);
            
            return ResponseEntity.ok(Map.of("message", "Account deactivated successfully"));
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Delete account permanently
     * All user data will be deleted from all tables (cascade delete)
     * DELETE /api/users/delete-account
     */
    @DeleteMapping("/delete-account")
    public ResponseEntity<?> deleteAccount(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }
            
            Long userId = resolveAuthenticatedUserId(authentication);
            
            userService.deleteUser(userId);
            
            return ResponseEntity.ok(Map.of("message", "Account deleted successfully"));
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    private Long resolveAuthenticatedUserId(Authentication authentication) {
        Object details = authentication.getDetails();
        if (details instanceof JwtUserDetails userDetails) {
            return userDetails.getUserId();
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof JwtUserDetails userDetails) {
            return userDetails.getUserId();
        }

        String emailCandidate = null;
        if (principal instanceof String p && !p.isBlank() && !"anonymousUser".equalsIgnoreCase(p)) {
            emailCandidate = p;
        } else if (authentication.getName() != null
                && !authentication.getName().isBlank()
                && !"anonymousUser".equalsIgnoreCase(authentication.getName())) {
            emailCandidate = authentication.getName();
        }

        if (emailCandidate != null) {
            return userRepository.findByEmail(emailCandidate)
                    .map(User::getId)
                    .orElseThrow(() -> new RuntimeException("Unable to resolve authenticated user"));
        }

        throw new RuntimeException("Unable to resolve authenticated user");
    }

    /**
     * Upload user avatar/profile picture
     * POST /api/users/avatar/upload
     * Uploads to Supabase Storage bucket: avatar_img
     */
    @PostMapping("/avatar/upload")
    public ResponseEntity<?> uploadAvatar(@RequestParam("file") MultipartFile file, 
                                         Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }
            
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            // Validate file
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "File is empty"));
            }
            
            // Validate file size (max 5MB for avatars)
            long maxSize = 5 * 1024 * 1024; // 5MB
            if (file.getSize() > maxSize) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Avatar file size exceeds 5MB limit. Current size: " + 
                                     (file.getSize() / 1024 / 1024) + "MB"));
            }
            
            // Validate file type (only images)
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "File must be an image (jpeg, png, gif, webp)"));
            }
            
            // Get current user to check for existing avatar
            User user = userService.getUserById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            // Delete old avatar file from Supabase if it exists
            if (user.getAvatarStoragePath() != null && !user.getAvatarStoragePath().isEmpty()) {
                try {
                    supabaseStorageService.deleteAvatarFile(user.getAvatarStoragePath());
                    log.info("Deleted old avatar for user {}: {}", userId, user.getAvatarStoragePath());
                } catch (IOException e) {
                    log.warn("Failed to delete old avatar: {}", e.getMessage());
                    // Continue with upload even if delete fails
                }
            }
            
            // Upload to Supabase Storage
            String storagePath = supabaseStorageService.uploadAvatarFile(userId, file);
            
            // Save avatar metadata to user
            user = userService.updateUserAvatar(userId, file.getOriginalFilename(), 
                                                     file.getSize(), contentType, storagePath);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Avatar uploaded successfully");
            response.put("userId", userId);
            response.put("avatarFileName", user.getAvatarFileName());
            response.put("avatarStoragePath", user.getAvatarStoragePath());
            response.put("publicUrl", supabaseStorageService.getPublicUrl("avatar_img", storagePath));
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (IOException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Upload failed: " + e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Error: " + e.getMessage()));
        }
    }

    /**
     * Delete user avatar
     * DELETE /api/users/avatar
     * Deletes from Supabase Storage bucket: avatar_img
     */
    @DeleteMapping("/avatar")
    public ResponseEntity<?> deleteAvatar(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }
            
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            User user = userService.getUserById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            if (user.getAvatarStoragePath() == null || user.getAvatarStoragePath().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "No avatar to delete"));
            }
            
            // Delete from Supabase Storage
            supabaseStorageService.deleteAvatarFile(user.getAvatarStoragePath());
            
            // Clear avatar metadata from user
            userService.clearUserAvatar(userId);
            
            return ResponseEntity.ok(Map.of("message", "Avatar deleted successfully"));
            
        } catch (IOException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Delete failed: " + e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Error: " + e.getMessage()));
        }
    }

    /**
     * Set email selection preference
     * POST /api/users/email-selection-preference
     */
    @PostMapping("/email-selection-preference")
    public ResponseEntity<?> setEmailSelectionPreference(
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }

            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            String preference = request.get("preference");

            if (preference == null || preference.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "preference is required"));
            }

            userService.setEmailSelectionPreference(userId, preference);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Email selection preference updated successfully");
            response.put("preference", preference);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Error: " + e.getMessage()));
        }
    }

    /**
     * Get email selection preference
     * GET /api/users/email-selection-preference
     */
    @GetMapping("/email-selection-preference")
    public ResponseEntity<?> getEmailSelectionPreference(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }

            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();

            String preference = userService.getEmailSelectionPreference(userId);

            Map<String, Object> response = new HashMap<>();
            response.put("preference", preference);

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Error: " + e.getMessage()));
        }
    }
}
