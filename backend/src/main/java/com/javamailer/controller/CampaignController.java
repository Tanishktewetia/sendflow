package com.javamailer.controller;

import com.javamailer.security.JwtUserDetails;
import com.javamailer.entity.Campaign;
import com.javamailer.entity.CampaignRecipient;
import com.javamailer.entity.EmailLog;
import com.javamailer.service.CampaignService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Campaign Controller
 * Handles campaign CRUD, execution, and statistics
 */
@RestController
@RequestMapping("/campaigns")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
@RequiredArgsConstructor
public class CampaignController {
    
    private final CampaignService campaignService;
    
    /**
     * Save draft campaign (without email provider or recipients)
     * POST /api/campaigns/draft/save
     */
    @PostMapping("/draft/save")
    public ResponseEntity<?> saveDraft(@RequestBody Map<String, Object> request, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            String subject = (String) request.get("subject");
            String emailBody = (String) request.get("emailBody");
            String campaignName = request.containsKey("campaignName") ? (String) request.get("campaignName") : "Draft Campaign";
            
            if (subject == null || subject.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Subject is required"));
            }
            if (emailBody == null || emailBody.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email body is required"));
            }
            
            // Create campaign with DRAFT status (email provider is optional for drafts)
            Campaign campaign = campaignService.createDraft(userId, campaignName, subject, emailBody);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Draft saved successfully");
            response.put("campaignId", campaign.getId());
            response.put("status", campaign.getStatus());
            response.put("createdAt", campaign.getCreatedAt());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Get all campaigns for user
     * GET /api/campaigns
     */
    @GetMapping
    public ResponseEntity<?> getCampaigns(Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            Page<Campaign> campaigns = campaignService.getUserCampaigns(userId, PageRequest.of(0, 20));
            
            Map<String, Object> response = new HashMap<>();
            response.put("campaigns", campaigns.getContent());
            response.put("total", campaigns.getTotalElements());
            response.put("page", campaigns.getPageable().getPageNumber());
            response.put("size", campaigns.getPageable().getPageSize());
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Get campaign by ID
     * GET /api/campaigns/{campaignId}
     */
    @GetMapping("/{campaignId}")
    public ResponseEntity<?> getCampaign(@PathVariable Long campaignId, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            Campaign campaign = campaignService.getCampaignByIdAndUserId(campaignId, userId)
                    .orElseThrow(() -> new RuntimeException("Campaign not found"));
            
            return ResponseEntity.ok(campaign);
            
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Update campaign
     * PUT /api/campaigns/{campaignId}
     */
    @PutMapping("/{campaignId}")
    public ResponseEntity<?> updateCampaign(@PathVariable Long campaignId,
                                           @RequestBody Map<String, String> request,
                                           Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            String campaignName = request.get("campaignName");
            String subject = request.get("subject");
            String emailBody = request.get("emailBody");
            
            Campaign campaign = campaignService.updateCampaign(campaignId, userId, campaignName, subject, emailBody);
            
            return ResponseEntity.ok(Map.of("message", "Campaign updated", "campaign", campaign));
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Start campaign
     * POST /api/campaigns/{campaignId}/start
     */
    @PostMapping("/{campaignId}/start")
    public ResponseEntity<?> startCampaign(@PathVariable Long campaignId, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            Campaign campaign = campaignService.startCampaign(campaignId, userId);
            
            return ResponseEntity.ok(Map.of("message", "Campaign started", "status", campaign.getStatus()));
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Pause campaign
     * POST /api/campaigns/{campaignId}/pause
     */
    @PostMapping("/{campaignId}/pause")
    public ResponseEntity<?> pauseCampaign(@PathVariable Long campaignId, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            Campaign campaign = campaignService.pauseCampaign(campaignId, userId);
            
            return ResponseEntity.ok(Map.of("message", "Campaign paused", "status", campaign.getStatus()));
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Complete campaign
     * POST /api/campaigns/{campaignId}/complete
     */
    @PostMapping("/{campaignId}/complete")
    public ResponseEntity<?> completeCampaign(@PathVariable Long campaignId, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            Campaign campaign = campaignService.completeCampaign(campaignId, userId);
            
            return ResponseEntity.ok(Map.of("message", "Campaign completed", "status", campaign.getStatus()));
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Get campaign statistics
     * GET /api/campaigns/{campaignId}/stats
     */
    @GetMapping("/{campaignId}/stats")
    public ResponseEntity<?> getCampaignStats(@PathVariable Long campaignId, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            // Verify ownership and get stats
            Campaign campaign = campaignService.getCampaignStats(campaignId, userId);
            
            Map<String, Object> stats = new HashMap<>();
            stats.put("campaignId", campaign.getId());
            stats.put("campaignName", campaign.getCampaignName());
            stats.put("status", campaign.getStatus());
            stats.put("recipientCount", campaign.getRecipientCount());
            stats.put("totalSent", campaign.getTotalSent());
            stats.put("totalFailed", campaign.getTotalFailed());
            stats.put("totalPending", campaign.getTotalPending());
            stats.put("successRate", campaign.getSuccessRate());
            
            return ResponseEntity.ok(stats);
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Delete campaign
     * DELETE /api/campaigns/{campaignId}
     */
    @DeleteMapping("/{campaignId}")
    public ResponseEntity<?> deleteCampaign(@PathVariable Long campaignId, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            campaignService.deleteCampaign(campaignId, userId);
            
            return ResponseEntity.ok(Map.of("message", "Campaign deleted successfully"));
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Execute campaign - send emails to all pending recipients
     * POST /api/campaigns/{campaignId}/execute
     */
    @PostMapping("/{campaignId}/execute")
    public ResponseEntity<?> executeCampaign(@PathVariable Long campaignId, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            // Verify ownership
            Campaign campaign = campaignService.getCampaignByIdAndUserId(campaignId, userId)
                    .orElseThrow(() -> new RuntimeException("Campaign not found"));
            
            // Execute campaign (send emails asynchronously)
            // Running in a separate thread to avoid blocking the API response
            new Thread(() -> {
                try {
                    campaignService.executeCampaign(campaignId, userId);
                } catch (Exception e) {
                    System.err.println("Error executing campaign " + campaignId + ": " + e.getMessage());
                }
            }).start();
            
            return ResponseEntity.ok(Map.of(
                    "message", "Campaign execution started",
                    "campaignId", campaignId,
                    "status", "EXECUTING"
            ));
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Get campaign recipients with pagination
     * GET /api/campaigns/{campaignId}/recipients
     */
    @GetMapping("/{campaignId}/recipients")
    public ResponseEntity<?> getCampaignRecipients(
            @PathVariable Long campaignId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            // Verify ownership
            Campaign campaign = campaignService.getCampaignByIdAndUserId(campaignId, userId)
                    .orElseThrow(() -> new RuntimeException("Campaign not found"));
            
            Page<CampaignRecipient> recipients = campaignService.getCampaignRecipients(
                    campaignId,
                    PageRequest.of(page, size)
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("recipients", recipients.getContent());
            response.put("total", recipients.getTotalElements());
            response.put("page", recipients.getPageable().getPageNumber());
            response.put("size", recipients.getPageable().getPageSize());
            response.put("totalPages", recipients.getTotalPages());
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Get campaign email logs with pagination
     * GET /api/campaigns/{campaignId}/logs
     */
    @GetMapping("/{campaignId}/logs")
    public ResponseEntity<?> getCampaignLogs(
            @PathVariable Long campaignId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            // Verify ownership
            Campaign campaign = campaignService.getCampaignByIdAndUserId(campaignId, userId)
                    .orElseThrow(() -> new RuntimeException("Campaign not found"));
            
            Page<EmailLog> logs = campaignService.getCampaignEmailLogs(
                    campaignId,
                    PageRequest.of(page, size)
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("logs", logs.getContent());
            response.put("total", logs.getTotalElements());
            response.put("page", logs.getPageable().getPageNumber());
            response.put("size", logs.getPageable().getPageSize());
            response.put("totalPages", logs.getTotalPages());
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
