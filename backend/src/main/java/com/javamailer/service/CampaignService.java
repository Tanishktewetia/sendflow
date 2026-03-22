package com.javamailer.service;

import com.javamailer.entity.Campaign;
import com.javamailer.entity.CampaignRecipient;
import com.javamailer.repository.CampaignRepository;
import com.javamailer.repository.CampaignRecipientRepository;
import com.javamailer.repository.EmailLogRepository;
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
     * Get campaign by ID (security: verify ownership)
     */
    public Optional<Campaign> getCampaignByIdAndUserId(Long campaignId, Long userId) {
        return campaignRepository.findByIdAndUserId(campaignId, userId);
    }
    
    /**
     * Get all campaigns for a user (paginated)
     */
    public Page<Campaign> getUserCampaigns(Long userId, Pageable pageable) {
        List<Campaign> campaigns = campaignRepository.findByUserIdOrderByCreatedAtDesc(userId);
        // Note: For true pagination with JpaRepository, you'd need a custom query
        // This is simplified; use @Query with Pageable in real implementation
        return Page.empty();
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
}
