package com.javamailer.service;

import com.javamailer.entity.Campaign;
import com.javamailer.entity.CampaignRecipient;
import com.javamailer.entity.EmailLog;
import com.javamailer.entity.EmailProvider;
import com.javamailer.repository.CampaignRepository;
import com.javamailer.repository.CampaignRecipientRepository;
import com.javamailer.repository.EmailLogRepository;
import com.javamailer.repository.EmailProviderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Service class for campaign management operations
 * Handles campaign CRUD, execution, and statistics
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CampaignService {
    
    private final CampaignRepository campaignRepository;
    private final CampaignRecipientRepository campaignRecipientRepository;
    private final EmailLogRepository emailLogRepository;
    private final EmailProviderRepository emailProviderRepository;
    private final EmailService emailService;
    
    /**
     * Create new campaign
     */
    public Campaign createCampaign(Long userId, Long emailProviderId, String campaignName, 
                                   String subject, String emailBody) {
        Campaign campaign = Campaign.builder()
                .userId(userId)
                .emailProviderId(emailProviderId)
                .campaignName(campaignName)
                .subject(subject)
                .emailBody(emailBody)
                .status("DRAFT")
                .recipientCount(0)
                .totalSent(0)
                .totalFailed(0)
                .totalPending(0)
                .successRate(0.0)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        
        return campaignRepository.save(campaign);
    }
    
    /**
     * Create draft campaign (without email provider - optional until sending)
     */
    public Campaign createDraft(Long userId, String campaignName, String subject, String emailBody) {
        Campaign campaign = Campaign.builder()
                .userId(userId)
                .emailProviderId(null)  // optional for drafts
                .campaignName(campaignName)
                .subject(subject)
                .emailBody(emailBody)
                .status("DRAFT")
                .recipientCount(0)
                .totalSent(0)
                .totalFailed(0)
                .totalPending(0)
                .successRate(0.0)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        
        return campaignRepository.save(campaign);
    }
    
    /**
     * Get campaign by ID (security: verify ownership)
     */
    public Optional<Campaign> getCampaignByIdAndUserId(Long campaignId, Long userId) {
        return campaignRepository.findByIdAndUserId(campaignId, userId);
    }
    
    /**
     * Get all campaigns for a user (paginated)
     */
    public Page<Campaign> getUserCampaigns(Long userId, Pageable pageable) {
        return campaignRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }
    
    /**
     * Get campaigns by status
     */
    public List<Campaign> getCampaignsByStatus(Long userId, String status) {
        return campaignRepository.findByStatusAndUserId(status, userId);
    }
    
    /**
     * Update campaign (only if DRAFT or PAUSED)
     */
    public Campaign updateCampaign(Long campaignId, Long userId, String campaignName, 
                                   String subject, String emailBody) {
        Optional<Campaign> campaign = campaignRepository.findByIdAndUserId(campaignId, userId);
        if (campaign.isPresent()) {
            Campaign c = campaign.get();
            // Only update if DRAFT or PAUSED
            if (!c.getStatus().equals("DRAFT") && !c.getStatus().equals("PAUSED")) {
                throw new RuntimeException("Cannot update campaign that is " + c.getStatus());
            }
            c.setCampaignName(campaignName);
            c.setSubject(subject);
            c.setEmailBody(emailBody);
            c.setUpdatedAt(LocalDateTime.now());
            return campaignRepository.save(c);
        }
        throw new RuntimeException("Campaign not found: " + campaignId);
    }
    
    /**
     * Start campaign (change status from DRAFT/SCHEDULED to RUNNING)
     */
    public Campaign startCampaign(Long campaignId, Long userId) {
        Optional<Campaign> campaign = campaignRepository.findByIdAndUserId(campaignId, userId);
        if (campaign.isPresent()) {
            Campaign c = campaign.get();
            c.setStatus("RUNNING");
            c.setStartedAt(LocalDateTime.now());
            c.setUpdatedAt(LocalDateTime.now());
            return campaignRepository.save(c);
        }
        throw new RuntimeException("Campaign not found: " + campaignId);
    }
    
    /**
     * Pause campaign
     */
    public Campaign pauseCampaign(Long campaignId, Long userId) {
        Optional<Campaign> campaign = campaignRepository.findByIdAndUserId(campaignId, userId);
        if (campaign.isPresent()) {
            Campaign c = campaign.get();
            if (!c.getStatus().equals("RUNNING")) {
                throw new RuntimeException("Can only pause running campaigns");
            }
            c.setStatus("PAUSED");
            c.setPausedAt(LocalDateTime.now());
            c.setUpdatedAt(LocalDateTime.now());
            return campaignRepository.save(c);
        }
        throw new RuntimeException("Campaign not found: " + campaignId);
    }
    
    /**
     * Complete campaign
     */
    public Campaign completeCampaign(Long campaignId, Long userId) {
        Optional<Campaign> campaign = campaignRepository.findByIdAndUserId(campaignId, userId);
        if (campaign.isPresent()) {
            Campaign c = campaign.get();
            c.setStatus("COMPLETED");
            c.setCompletedAt(LocalDateTime.now());
            c.setUpdatedAt(LocalDateTime.now());
            return campaignRepository.save(c);
        }
        throw new RuntimeException("Campaign not found: " + campaignId);
    }
    
    /**
     * Delete campaign (only if DRAFT)
     */
    public void deleteCampaign(Long campaignId, Long userId) {
        Optional<Campaign> campaign = campaignRepository.findByIdAndUserId(campaignId, userId);
        if (campaign.isPresent()) {
            Campaign c = campaign.get();
            if (!c.getStatus().equals("DRAFT")) {
                throw new RuntimeException("Can only delete DRAFT campaigns");
            }
            campaignRecipientRepository.deleteByCampaignId(campaignId);
            emailLogRepository.deleteByCampaignId(campaignId);
            campaignRepository.delete(c);
        } else {
            throw new RuntimeException("Campaign not found: " + campaignId);
        }
    }
    
    /**
     * Update campaign statistics
     */
    public void updateCampaignStats(Long campaignId) {
        Optional<Campaign> campaign = campaignRepository.findById(campaignId);
        if (campaign.isPresent()) {
            Campaign c = campaign.get();
            
            long sent = campaignRecipientRepository.countByCampaignIdAndStatus(campaignId, "SENT");
            long failed = campaignRecipientRepository.countByCampaignIdAndStatus(campaignId, "FAILED");
            long pending = campaignRecipientRepository.countByCampaignIdAndStatus(campaignId, "PENDING");
            long total = sent + failed + pending;
            
            double successRate = total > 0 ? (sent * 100.0) / total : 0.0;
            
            c.setTotalSent((int) sent);
            c.setTotalFailed((int) failed);
            c.setTotalPending((int) pending);
            c.setSuccessRate(successRate);
            c.setUpdatedAt(LocalDateTime.now());
            
            campaignRepository.save(c);
        }
    }
    
    /**
     * Get pending recipients for a campaign (for email sending)
     */
    public List<CampaignRecipient> getPendingRecipients(Long campaignId) {
        return campaignRecipientRepository.findByCampaignIdAndStatusOrderByCreatedAtAsc(campaignId, "PENDING");
    }
    
    /**
     * Get campaign statistics
     */
    public Campaign getCampaignStats(Long campaignId, Long userId) {
        Optional<Campaign> campaign = campaignRepository.findByIdAndUserId(campaignId, userId);
        if (campaign.isPresent()) {
            updateCampaignStats(campaignId); // Refresh stats
            return campaignRepository.findById(campaignId).get();
        }
        throw new RuntimeException("Campaign not found: " + campaignId);
    }
    
    /**
     * Execute campaign - send emails to all pending recipients
     */
    public void executeCampaign(Long campaignId, Long userId) {
        Optional<Campaign> campaign = campaignRepository.findByIdAndUserId(campaignId, userId);
        if (campaign.isEmpty()) {
            throw new RuntimeException("Campaign not found: " + campaignId);
        }
        
        Campaign c = campaign.get();
        
        if (!c.getStatus().equals("RUNNING")) {
            throw new RuntimeException("Campaign must be in RUNNING status to execute");
        }
        
        // Get email provider
        Optional<EmailProvider> provider = emailProviderRepository.findById(c.getEmailProviderId());
        if (provider.isEmpty()) {
            throw new RuntimeException("Email provider not found for campaign");
        }
        
        // Get pending recipients
        List<CampaignRecipient> pendingRecipients = getPendingRecipients(campaignId);
        
        if (pendingRecipients.isEmpty()) {
            c.setStatus("COMPLETED");
            c.setCompletedAt(LocalDateTime.now());
            campaignRepository.save(c);
            return;
        }
        
        // Send email to each recipient
        for (CampaignRecipient recipient : pendingRecipients) {
            try {
                // Personalize email body with recipient data
                String personalizedBody = personalizeEmailBody(c.getEmailBody(), recipient);
                String personalizedSubject = personalizeEmailBody(c.getSubject(), recipient);
                
                // Send email and log
                EmailLog emailLog = emailService.sendAndLogEmail(
                        campaignId,
                        recipient.getId(),
                        recipient.getEmail(),
                        personalizedSubject,
                        personalizedBody,
                        provider.get()
                );
                
                // Add small delay to avoid rate limiting (configurable)
                if (c.getSendDelayMs() != null && c.getSendDelayMs() > 0) {
                    Thread.sleep(c.getSendDelayMs());
                }
                
            } catch (Exception e) {
                System.err.println("Error sending email to " + recipient.getEmail() + ": " + e.getMessage());
            }
        }
        
        // Update campaign statistics
        updateCampaignStats(campaignId);
    }
    
    /**
     * Personalize email body with recipient data
     * Replaces {{name}}, {{email}}, {{company}} with recipient values
     */
    private String personalizeEmailBody(String template, CampaignRecipient recipient) {
        if (template == null) {
            return "";
        }
        
        String result = template;
        
        // Replace personalization tags
        if (recipient.getName() != null) {
            result = result.replace("{{name}}", recipient.getName());
            result = result.replace("{{firstName}}", extractFirstName(recipient.getName()));
        }
        
        if (recipient.getEmail() != null) {
            result = result.replace("{{email}}", recipient.getEmail());
        }
        
        if (recipient.getCompany() != null) {
            result = result.replace("{{company}}", recipient.getCompany());
        }
        
        if (recipient.getCustomField1() != null) {
            result = result.replace("{{customField1}}", recipient.getCustomField1());
        }
        
        if (recipient.getCustomField2() != null) {
            result = result.replace("{{customField2}}", recipient.getCustomField2());
        }
        
        return result;
    }
    
    /**
     * Extract first name from full name
     */
    private String extractFirstName(String fullName) {
        if (fullName == null || fullName.isEmpty()) {
            return "";
        }
        int spaceIndex = fullName.indexOf(' ');
        return spaceIndex > 0 ? fullName.substring(0, spaceIndex) : fullName;
    }
    
    /**
     * Get email logs for a campaign
     */
    public List<EmailLog> getCampaignEmailLogs(Long campaignId) {
        return emailLogRepository.findByCampaignId(campaignId);
    }
    
    /**
     * Get paginated email logs for a campaign
     */
    public Page<EmailLog> getCampaignEmailLogs(Long campaignId, Pageable pageable) {
        return emailLogRepository.findByCampaignIdOrderBySentAtDesc(campaignId, pageable);
    }
    
    /**
     * Get paginated recipients for a campaign
     */
    public Page<CampaignRecipient> getCampaignRecipients(Long campaignId, Pageable pageable) {
        return campaignRecipientRepository.findByCampaignIdOrderByCreatedAtDesc(campaignId, pageable);
    }
    
    /**
     * Update recipient count for a campaign
     */
    public void updateRecipientCount(Long campaignId) {
        Optional<Campaign> campaign = campaignRepository.findById(campaignId);
        if (campaign.isPresent()) {
            Campaign c = campaign.get();
            long count = campaignRecipientRepository.countByCampaignId(campaignId);
            c.setRecipientCount((int) count);
            campaignRepository.save(c);
        }
    }
}
