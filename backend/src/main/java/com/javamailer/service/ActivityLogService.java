package com.javamailer.service;

import com.javamailer.entity.ActivityLog;
import com.javamailer.repository.ActivityLogRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * ActivityLogService - Comprehensive activity tracking service
 * Logs all user actions: uploads, campaigns, provider changes, email sends, etc
 * Provides methods for querying activity history
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ActivityLogService {
    
    private final ActivityLogRepository activityLogRepository;
    private final ObjectMapper objectMapper;
    
    /**
     * Log a user action with all details
     */
    public ActivityLog logActivity(Long userId, String actionType, String actionTitle, 
                                   String resourceType, Long resourceId, String description) {
        return logActivity(userId, actionType, actionTitle, resourceType, resourceId, description, null, "SUCCESS");
    }
    
    /**
     * Log a user action with metadata
     */
    public ActivityLog logActivity(Long userId, String actionType, String actionTitle,
                                   String resourceType, Long resourceId, String description,
                                   Map<String, Object> metadata) {
        return logActivity(userId, actionType, actionTitle, resourceType, resourceId, description, metadata, "SUCCESS");
    }
    
    /**
     * Log a user action with full details including status
     */
    public ActivityLog logActivity(Long userId, String actionType, String actionTitle,
                                   String resourceType, Long resourceId, String description,
                                   Map<String, Object> metadata, String status) {
        try {
            JsonNode metadataNode = metadata != null ? objectMapper.valueToTree(metadata) : null;
            
            ActivityLog activityLog = ActivityLog.builder()
                    .userId(userId)
                    .actionType(actionType)
                    .actionTitle(actionTitle)
                    .actionDescription(description)
                    .resourceType(resourceType)
                    .resourceId(resourceId)
                    .metadata(metadataNode)
                    .status(status)
                    .createdAt(LocalDateTime.now())
                    .build();
            
            ActivityLog saved = activityLogRepository.save(activityLog);
            log.info("Activity logged - Type: {}, User: {}, Resource: {}/{}", 
                    actionType, userId, resourceType, resourceId);
            return saved;
        } catch (Exception e) {
            log.error("Error logging activity: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to log activity", e);
        }
    }
    
    /**
     * Log a failed action with error message
     */
    public ActivityLog logFailedActivity(Long userId, String actionType, String actionTitle,
                                         String resourceType, Long resourceId, 
                                         String description, String errorMessage) {
        try {
            ActivityLog log = ActivityLog.builder()
                    .userId(userId)
                    .actionType(actionType)
                    .actionTitle(actionTitle)
                    .actionDescription(description)
                    .resourceType(resourceType)
                    .resourceId(resourceId)
                    .status("FAILED")
                    .errorMessage(errorMessage)
                    .createdAt(LocalDateTime.now())
                    .build();
            
            return activityLogRepository.save(log);
        } catch (Exception e) {
            log.error("Error logging failed activity: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to log activity", e);
        }
    }
    
    /**
     * Get paginated activity log for a user
     */
    @Transactional(readOnly = true)
    public Page<ActivityLog> getUserActivityLog(Long userId, Pageable pageable) {
        return activityLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }
    
    /**
     * Get activity logs for a specific action type
     */
    @Transactional(readOnly = true)
    public Page<ActivityLog> getUserActivityByType(Long userId, String actionType, Pageable pageable) {
        return activityLogRepository.findByUserIdAndActionTypeOrderByCreatedAtDesc(userId, actionType, pageable);
    }
    
    /**
     * Get recent activity logs for a user (non-paginated, max 50)
     */
    @Transactional(readOnly = true)
    public List<ActivityLog> getRecentActivity(Long userId) {
        return activityLogRepository.findRecentActivityByUserId(userId);
    }
    
    /**
     * Get activity for a specific resource
     */
    @Transactional(readOnly = true)
    public Page<ActivityLog> getResourceActivity(String resourceType, Long resourceId, Pageable pageable) {
        return activityLogRepository.findByResourceTypeAndResourceIdOrderByCreatedAtDesc(resourceType, resourceId, pageable);
    }
    
    /**
     * Get failed activities for error tracking
     */
    @Transactional(readOnly = true)
    public Page<ActivityLog> getFailedActivities(Long userId, Pageable pageable) {
        return activityLogRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, "FAILED", pageable);
    }
    
    /**
     * Log CSV upload action
     */
    public ActivityLog logCsvUpload(Long userId, Long csvUploadId, String fileName, 
                                    Integer rowCount, String emailProvider) {
        Map<String, Object> metadata = Map.of(
                "fileName", fileName,
                "rowCount", rowCount,
                "emailProvider", emailProvider
        );
        return logActivity(userId, "CSV_UPLOADED", "CSV file uploaded",
                "CSV", csvUploadId, "Uploaded CSV with " + rowCount + " recipients", metadata);
    }
    
    /**
     * Log campaign start action
     */
    public ActivityLog logCampaignStart(Long userId, Long campaignId, Long csvUploadId, 
                                        String subject, Integer totalRecipients) {
        Map<String, Object> metadata = Map.of(
                "csvUploadId", csvUploadId,
                "subject", subject,
                "totalRecipients", totalRecipients
        );
        return logActivity(userId, "CAMPAIGN_STARTED", "Campaign started",
                "CAMPAIGN", campaignId, "Starting campaign to send " + totalRecipients + " emails", metadata);
    }
    
    /**
     * Log campaign completion
     */
    public ActivityLog logCampaignCompleted(Long userId, Long campaignId, Integer sent, 
                                            Integer failed, Long elapsedMs) {
        Map<String, Object> metadata = Map.of(
                "sent", sent,
                "failed", failed,
                "elapsedMs", elapsedMs
        );
        return logActivity(userId, "CAMPAIGN_COMPLETED", "Campaign completed",
                "CAMPAIGN", campaignId, "Campaign completed: " + sent + " sent, " + failed + " failed", metadata);
    }
    
    /**
     * Log campaign reprocessing
     */
    public ActivityLog logCampaignReprocess(Long userId, Long campaignId, Integer failedCount) {
        Map<String, Object> metadata = Map.of(
                "failedCount", failedCount
        );
        return logActivity(userId, "CAMPAIGN_REPROCESSING", "Campaign reprocessing started",
                "CAMPAIGN", campaignId, "Reprocessing failed emails: " + failedCount + " emails", metadata);
    }
    
    /**
     * Log campaign pause
     */
    public ActivityLog logCampaignPaused(Long userId, Long campaignId, String reason) {
        Map<String, Object> metadata = Map.of(
                "reason", reason
        );
        return logActivity(userId, "CAMPAIGN_PAUSED", "Campaign paused",
                "CAMPAIGN", campaignId, "Campaign paused: " + reason, metadata);
    }
    
    /**
     * Log campaign resume
     */
    public ActivityLog logCampaignResumed(Long userId, Long campaignId) {
        return logActivity(userId, "CAMPAIGN_RESUMED", "Campaign resumed",
                "CAMPAIGN", campaignId, "Campaign processing resumed", null);
    }
    
    /**
     * Log email provider change
     */
    public ActivityLog logProviderChanged(Long userId, Long campaignId, String oldProvider, String newProvider) {
        Map<String, Object> metadata = Map.of(
                "oldProvider", oldProvider,
                "newProvider", newProvider
        );
        return logActivity(userId, "PROVIDER_CHANGED", "Email provider changed",
                "CAMPAIGN", campaignId, "Changed provider from " + oldProvider + " to " + newProvider, metadata);
    }
    
    /**
     * Log campaign deletion
     */
    public ActivityLog logCampaignDeleted(Long userId, Long campaignId, String subject) {
        return logActivity(userId, "CAMPAIGN_DELETED", "Campaign deleted",
                "CAMPAIGN", campaignId, "Deleted campaign: " + subject, null);
    }
    
    /**
     * Log email send action
     */
    public ActivityLog logEmailSent(Long userId, Long campaignId, String recipientEmail, boolean success) {
        Map<String, Object> metadata = Map.of(
                "recipientEmail", recipientEmail,
                "success", success
        );
        return logActivity(userId, success ? "EMAIL_SENT" : "EMAIL_FAILED", 
                success ? "Email sent" : "Email failed",
                "EMAIL", null, 
                "Email sent to " + recipientEmail, metadata,
                success ? "SUCCESS" : "FAILED");
    }
}
