package com.javamailer.controller;

import com.javamailer.security.JwtUserDetails;
import com.javamailer.entity.EmailProvider;
import com.javamailer.service.EmailProviderService;
import com.fasterxml.jackson.databind.ObjectMapper;
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
@RequestMapping("/email-providers")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
@RequiredArgsConstructor
public class EmailProviderController {
    
    private final EmailProviderService emailProviderService;
    
    /**
     * Create email provider
     * POST /api/email-providers
     */
    @PostMapping
    public ResponseEntity<?> createProvider(@RequestBody Map<String, Object> request, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            String providerType = (String) request.get("providerType"); // SMTP, GMAIL, OUTLOOK, RESEND
            String displayName = (String) request.get("displayName");
            String fromEmail = (String) request.get("fromEmail");
            String fromName = (String) request.get("fromName");
            
            // Extract credentials from encryptedConfig (it's actually raw config at this point)
            @SuppressWarnings("unchecked")
            Map<String, Object> rawConfig = (Map<String, Object>) request.get("encryptedConfig");
            
            if (rawConfig == null) {
                rawConfig = new HashMap<>();
            }
            
            EmailProvider provider = emailProviderService.createEmailProvider(
                    userId, providerType, displayName, fromEmail, fromName, rawConfig
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
     * Verify email provider credentials by sending test email
     * POST /api/email-providers/verify
     * Request body: { type, name, email, credentials }
     * Sends a test email to the provided address to verify the provider works
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyProvider(@RequestBody Map<String, Object> request, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            String providerType = (String) request.get("type");
            String email = (String) request.get("email");
            @SuppressWarnings("unchecked")
            Map<String, Object> credentials = (Map<String, Object>) request.get("credentials");
            
            // Validate inputs
            if (providerType == null || providerType.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Provider type is required"));
            }
            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email address is required"));
            }
            if (credentials == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Credentials are required"));
            }
            
            // Send test email using the provider
            boolean verified = emailProviderService.verifyProviderWithTestEmail(userId, providerType, email, credentials);
            
            Map<String, Object> response = new HashMap<>();
            response.put("verified", verified);
            response.put("message", verified ? "Test email sent successfully to " + email : "Verification failed");
            
            return verified ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("verified", false, "error", "Verification failed: " + e.getMessage()));
        }
    }
    
    /**
     * Verify provider credentials (test send to user's email)
     * POST /api/email-providers/verify/test
     * Request body: { providerType, config, toEmail }
     */
    @PostMapping("/verify/test")
    public ResponseEntity<?> verifyProviderWithTestEmail(@RequestBody Map<String, Object> request, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            String toEmail = (String) request.get("toEmail");
            String providerType = (String) request.get("providerType");
            Map<String, Object> config = (Map<String, Object>) request.get("config");
            
            if (toEmail == null || toEmail.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email address for verification is required"));
            }
            
            if (providerType == null || providerType.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Provider type is required"));
            }
            
            if (config == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Provider configuration is required"));
            }
            
            // Send test email using provider configuration
            String verificationToken = emailProviderService.sendTestEmailAndGetToken(userId, providerType, config, toEmail);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Test email sent successfully");
            response.put("verificationToken", verificationToken);
            response.put("status", "Test email sent to " + toEmail);
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Verification failed: " + e.getMessage()));
        }
    }
    
    /**
     * Confirm email provider addition after successful verification
     * POST /api/email-providers/confirm
     * Request body: { providerType, displayName, fromEmail, fromName, encryptedConfig, verificationToken }
     */
    @PostMapping("/confirm")
    public ResponseEntity<?> confirmAndAddProvider(@RequestBody Map<String, Object> request, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            String providerType = (String) request.get("providerType");
            String displayName = (String) request.get("displayName");
            String fromEmail = (String) request.get("fromEmail");
            String fromName = (String) request.get("fromName");
            String verificationToken = (String) request.get("verificationToken");
            
            // Extract credentials from encryptedConfig (it's actually raw config at this point)
            // Handle both Map and JSON string formats for backward compatibility
            Map<String, Object> rawConfig = null;
            Object configObj = request.get("encryptedConfig");
            
            if (configObj instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> configMap = (Map<String, Object>) configObj;
                rawConfig = configMap;
            } else if (configObj instanceof String) {
                // If received as JSON string, parse it to Map
                String configJson = (String) configObj;
                if (!configJson.isEmpty()) {
                    try {
                        ObjectMapper mapper = new ObjectMapper();
                        @SuppressWarnings("unchecked")
                        Map<String, Object> parsedConfig = mapper.readValue(configJson, Map.class);
                        rawConfig = parsedConfig;
                    } catch (Exception e) {
                        System.err.println("[WARN] Failed to parse encryptedConfig JSON string: " + e.getMessage());
                        rawConfig = new HashMap<>();
                    }
                }
            }
            
            if (rawConfig == null) {
                rawConfig = new HashMap<>();
            }
            
            if (verificationToken == null || verificationToken.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Verification token is required. Please verify the email first."));
            }
            
            // Create verified provider (service will encrypt the config)
            EmailProvider provider = emailProviderService.createVerifiedEmailProvider(
                    userId, providerType, displayName, fromEmail, fromName, rawConfig, verificationToken
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Email provider added and verified successfully");
            response.put("providerId", provider.getId());
            response.put("isVerified", provider.getIsVerified());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (Exception e) {
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
    
    /**
     * Verify Resend email provider
     * POST /api/email-providers/verify/resend
     * Request body: { name, email, apiKey }
     */
    @PostMapping("/verify/resend")
    public ResponseEntity<?> verifyResend(@RequestBody Map<String, Object> request, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            String name = (String) request.get("name");
            String email = (String) request.get("email");
            String apiKey = (String) request.get("apiKey");
            
            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Test email address is required"));
            }
            if (apiKey == null || apiKey.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "API key is required"));
            }
            
            // Prepare credentials map
            Map<String, Object> credentials = new HashMap<>();
            credentials.put("apiKey", apiKey);
            // Use Sendflow's verified test domain for sending test emails
            // User's email will be the recipient (to address)
            credentials.put("fromEmail", "verification@sendflow.dev");
            
            // Verify using Resend service (sends test email TO the user's email)
            String verificationToken = emailProviderService.sendTestEmailAndGetToken(userId, "RESEND", credentials, email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("verified", true);
            response.put("message", "Test email sent successfully to " + email);
            response.put("verificationToken", verificationToken);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("verified", false, "error", e.getMessage()));
        }
    }
    
    /**
     * Verify SMTP email provider
     * POST /api/email-providers/verify/smtp
     * Request body: { name, email, host, port, username, password }
     */
    @PostMapping("/verify/smtp")
    public ResponseEntity<?> verifySMTP(@RequestBody Map<String, Object> request, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            String name = (String) request.get("name");
            String email = (String) request.get("email");
            String host = (String) request.get("host");
            Integer port = ((Number) request.get("port")).intValue();
            String username = (String) request.get("username");
            String password = (String) request.get("password");
            
            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Test email address is required"));
            }
            if (host == null || host.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "SMTP host is required"));
            }
            if (port == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "SMTP port is required"));
            }
            if (username == null || username.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "SMTP username is required"));
            }
            if (password == null || password.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "SMTP password is required"));
            }
            
            // Prepare credentials map
            Map<String, Object> credentials = new HashMap<>();
            credentials.put("host", host);
            credentials.put("port", port);
            credentials.put("username", username);
            credentials.put("password", password);
            
            // Verify using SMTP service
            String verificationToken = emailProviderService.sendTestEmailAndGetToken(userId, "SMTP", credentials, email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("verified", true);
            response.put("message", "Test email sent successfully to " + email);
            response.put("verificationToken", verificationToken);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("verified", false, "error", e.getMessage()));
        }
    }
    
    /**
     * Verify Outlook email provider
     * POST /api/email-providers/verify/outlook
     * Request body: { name, email, appPassword }
     */
    @PostMapping("/verify/outlook")
    public ResponseEntity<?> verifyOutlook(@RequestBody Map<String, Object> request, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            String name = (String) request.get("name");
            String email = (String) request.get("email");
            String appPassword = (String) request.get("appPassword");
            
            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Test email address is required"));
            }
            if (appPassword == null || appPassword.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "App password is required"));
            }
            
            // Prepare credentials map for Outlook (using SMTP to smtp-mail.outlook.com)
            Map<String, Object> credentials = new HashMap<>();
            credentials.put("host", "smtp-mail.outlook.com");
            credentials.put("port", 587);
            credentials.put("username", email);
            credentials.put("password", appPassword);
            
            // Verify using SMTP service (Outlook uses SMTP protocol)
            String verificationToken = emailProviderService.sendTestEmailAndGetToken(userId, "OUTLOOK", credentials, email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("verified", true);
            response.put("message", "Test email sent successfully to " + email);
            response.put("verificationToken", verificationToken);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("verified", false, "error", e.getMessage()));
        }
    }
}
