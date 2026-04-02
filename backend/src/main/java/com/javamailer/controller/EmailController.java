package com.javamailer.controller;

import com.javamailer.entity.EmailProvider;
import com.javamailer.service.EmailProviderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Email Controller - REST API endpoints for email operations
 * Handles HTTP requests for email sending, status checks, and statistics
 */
@RestController
@RequestMapping("/emails")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class EmailController {
    
    private final EmailProviderService emailProviderService;

    /**
     * Health check endpoint
     * @return status message
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Java Mailer Backend is running!");
    }

    /**
     * Get all email providers for the logged-in user
     * @param userId User ID from header
     * @return list of email providers with sensitive data removed
     */
    @GetMapping("/providers")
    public ResponseEntity<?> getEmailProviders(
            @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        try {
            // Use hardcoded userId for now (would be from auth context)
            userId = userId != null ? userId : 1L;
            
            log.info("Fetching email providers for user: {}", userId);
            
            List<EmailProvider> providers = emailProviderService.getActiveUserProviders(userId);
            
            // Map to DTO to remove sensitive data (encrypted config)
            List<Map<String, Object>> response = providers.stream().map(p -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", p.getId());
                dto.put("providerType", p.getProviderType());
                dto.put("displayName", p.getDisplayName());
                dto.put("fromEmail", p.getFromEmail());
                dto.put("fromName", p.getFromName());
                dto.put("isActive", p.getIsActive());
                dto.put("isVerified", p.getIsVerified());
                dto.put("createdAt", p.getCreatedAt());
                return dto;
            }).collect(Collectors.toList());
            
            log.info("Found {} email providers for user {}", response.size(), userId);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error fetching email providers: ", e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Failed to fetch email providers",
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Get only verified email providers for the logged-in user
     * @param userId User ID from header
     * @return list of verified email providers
     */
    @GetMapping("/providers/verified")
    public ResponseEntity<?> getVerifiedEmailProviders(
            @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        try {
            userId = userId != null ? userId : 1L;
            
            log.info("Fetching verified email providers for user: {}", userId);
            
            List<EmailProvider> providers = emailProviderService.getVerifiedProviders(userId);
            
            // Map to DTO
            List<Map<String, Object>> response = providers.stream().map(p -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", p.getId());
                dto.put("providerType", p.getProviderType());
                dto.put("displayName", p.getDisplayName());
                dto.put("fromEmail", p.getFromEmail());
                dto.put("fromName", p.getFromName());
                dto.put("isActive", p.getIsActive());
                dto.put("isVerified", p.getIsVerified());
                dto.put("lastVerifiedAt", p.getLastVerifiedAt());
                return dto;
            }).collect(Collectors.toList());
            
            log.info("Found {} verified email providers for user {}", response.size(), userId);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error fetching verified email providers: ", e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Failed to fetch verified email providers",
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Send email endpoint
     * @return response status
     */
    @PostMapping("/send")
    public ResponseEntity<?> sendEmail() {
        // Implementation will be added in next phase
        return ResponseEntity.ok().build();
    }

    /**
     * Get campaign statistics endpoint
     * @return campaign stats
     */
    @GetMapping("/stats")
    public ResponseEntity<?> getStatistics() {
        // Implementation will be added in next phase
        return ResponseEntity.ok().build();
    }

    /**
     * Upload CSV file endpoint
     * @return upload status
     */
    @PostMapping("/upload-csv")
    public ResponseEntity<?> uploadCsv() {
        // Implementation will be added in next phase
        return ResponseEntity.ok().build();
    }
}
