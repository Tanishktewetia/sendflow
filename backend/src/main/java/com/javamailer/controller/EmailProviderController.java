package com.javamailer.controller;

import com.javamailer.security.JwtUserDetails;
import com.javamailer.entity.EmailProvider;
import com.javamailer.service.EmailProviderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Email Provider Controller
 * Handles email provider management (SMTP, Gmail, Outlook, Resend)
 */
@RestController
@RequestMapping("/api/email-providers")
@RequiredArgsConstructor
public class EmailProviderController {
    
    private final EmailProviderService emailProviderService;
    
    /**
     * Create email provider
     * POST /api/email-providers
     */
    @PostMapping
    public ResponseEntity<?> createProvider(@RequestBody Map<String, String> request, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            String providerType = request.get("providerType"); // SMTP, GMAIL, OUTLOOK, RESEND
            String displayName = request.get("displayName");
            String fromEmail = request.get("fromEmail");
            String fromName = request.get("fromName");
            String encryptedConfig = request.get("encryptedConfig"); // JSON with credentials
            
            EmailProvider provider = emailProviderService.createEmailProvider(
                    userId, providerType, displayName, fromEmail, fromName, encryptedConfig
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Email provider created");
            response.put("providerId", provider.getId());
            response.put("isVerified", provider.getIsVerified());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Get all providers for user
     * GET /api/email-providers
     */
    @GetMapping
    public ResponseEntity<?> getProviders(Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            List<EmailProvider> providers = emailProviderService.getUserProviders(userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("providers", providers);
            response.put("total", providers.size());
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Get verified providers only
     * GET /api/email-providers/verified
     */
    @GetMapping("/verified")
    public ResponseEntity<?> getVerifiedProviders(Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            List<EmailProvider> providers = emailProviderService.getVerifiedProviders(userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("providers", providers);
            response.put("total", providers.size());
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Get provider by ID
     * GET /api/email-providers/{providerId}
     */
    @GetMapping("/{providerId}")
    public ResponseEntity<?> getProvider(@PathVariable Long providerId, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            EmailProvider provider = emailProviderService.getProviderByIdAndUserId(providerId, userId)
                    .orElseThrow(() -> new RuntimeException("Provider not found"));
            
            return ResponseEntity.ok(provider);
            
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Update provider
     * PUT /api/email-providers/{providerId}
     */
    @PutMapping("/{providerId}")
    public ResponseEntity<?> updateProvider(@PathVariable Long providerId,
                                           @RequestBody Map<String, String> request,
                                           Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            String displayName = request.get("displayName");
            String encryptedConfig = request.get("encryptedConfig");
            
            EmailProvider provider = emailProviderService.updateProvider(providerId, userId, displayName, encryptedConfig);
            
            return ResponseEntity.ok(Map.of("message", "Provider updated", "provider", provider));
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Verify provider credentials (test send)
     * POST /api/email-providers/{providerId}/verify
     */
    @PostMapping("/{providerId}/verify")
    public ResponseEntity<?> verifyProvider(@PathVariable Long providerId, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            EmailProvider provider = emailProviderService.verifyProvider(providerId, userId);
            
            return ResponseEntity.ok(Map.of("message", "Provider verified successfully", "isVerified", provider.getIsVerified()));
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Deactivate provider
     * POST /api/email-providers/{providerId}/deactivate
     */
    @PostMapping("/{providerId}/deactivate")
    public ResponseEntity<?> deactivateProvider(@PathVariable Long providerId, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            emailProviderService.deactivateProvider(providerId, userId);
            
            return ResponseEntity.ok(Map.of("message", "Provider deactivated"));
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Delete provider
     * DELETE /api/email-providers/{providerId}
     */
    @DeleteMapping("/{providerId}")
    public ResponseEntity<?> deleteProvider(@PathVariable Long providerId, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            emailProviderService.deleteProvider(providerId, userId);
            
            return ResponseEntity.ok(Map.of("message", "Provider deleted successfully"));
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
