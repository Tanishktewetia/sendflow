package com.javamailer.service;

import com.javamailer.entity.Campaign;
import com.javamailer.entity.CampaignQueue;
import com.javamailer.entity.CsvUpload;
import com.javamailer.repository.CampaignQueueRepository;
import com.javamailer.repository.CampaignRepository;
import com.javamailer.repository.CsvUploadRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * QueueService - Manage FIFO queue for campaigns
 * Enforces max 5 concurrent campaigns
 * Handles queue position, status transitions, and next-campaign selection
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class QueueService {
    
    private static final int MAX_CONCURRENT = 5;
    
    private final CampaignQueueRepository campaignQueueRepository;
    private final CampaignRepository campaignRepository;
    private final CsvUploadRepository csvUploadRepository;
    private final ActivityLogService activityLogService;
    
    /**
     * Enqueue a campaign (add to queue)
     * Assigns queue position and sets status to QUEUED
     */
    public CampaignQueue enqueueCampaign(Long campaignId, Long csvUploadId, Integer totalRecipients) {
        try {
            // Check if campaign already queued
            Optional<CampaignQueue> existing = campaignQueueRepository.findByCampaignId(campaignId);
            if (existing.isPresent()) {
                throw new IllegalStateException("Campaign already in queue: " + campaignId);
            }
            
            // Get campaign and CSV data
            Campaign campaign = campaignRepository.findById(campaignId)
                    .orElseThrow(() -> new IllegalArgumentException("Campaign not found: " + campaignId));
            
            CsvUpload csvUpload = csvUploadRepository.findById(csvUploadId)
                    .orElseThrow(() -> new IllegalArgumentException("CSV not found: " + csvUploadId));
            
            // Calculate queue position
            Integer nextPosition = calculateNextQueuePosition();
            
            // Create queue entry
            CampaignQueue queueEntry = CampaignQueue.builder()
                    .userId(campaign.getUserId())
                    .csvUploadId(csvUploadId)
                    .campaignId(campaignId)
                    .status("QUEUED")
                    .queuePosition(nextPosition)
                    .totalRecipients(totalRecipients)
                    .processedRecipients(0)
                    .failedRecipients(0)
                    .sentRecipients(0)
                    .currentRow(0)
                    .retryCount(0)
                    .build();
            
            CampaignQueue saved = campaignQueueRepository.save(queueEntry);
            
            // Log activity
            activityLogService.logCampaignStart(campaign.getUserId(), campaignId, csvUploadId,
                    campaign.getSubject(), totalRecipients);
            
            log.info("Campaign enqueued - ID: {}, Position: {}, Recipients: {}",
                    campaignId, nextPosition, totalRecipients);
            
            return saved;
        } catch (Exception e) {
            log.error("Error enqueueing campaign: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    /**
     * Get next campaign to process
     * Returns null if no campaigns queued or max concurrent reached
     */
    @Transactional(readOnly = true)
    public Optional<CampaignQueue> getNextCampaignToProcess() {
        // Check if we can process more campaigns
        long processingCount = campaignQueueRepository.countConcurrentCampaigns();
        
        if (processingCount >= MAX_CONCURRENT) {
            log.debug("Max concurrent campaigns reached ({}/{})", processingCount, MAX_CONCURRENT);
            return Optional.empty();
        }
        
        return campaignQueueRepository.findNextQueuedCampaign();
    }
    
    /**
     * Start processing a campaign (transition from QUEUED to PROCESSING)
     */
    public CampaignQueue startProcessing(Long queueId) {
        CampaignQueue queueEntry = campaignQueueRepository.findById(queueId)
                .orElseThrow(() -> new IllegalArgumentException("Queue entry not found: " + queueId));
        
        if (!queueEntry.getStatus().equals("QUEUED")) {
            throw new IllegalStateException("Campaign not in QUEUED status: " + queueEntry.getStatus());
        }
        
        queueEntry.setStatus("PROCESSING");
        queueEntry.setStartedAt(LocalDateTime.now());
        queueEntry.setCurrentRow(0);
        queueEntry.setProcessedRecipients(0);
        queueEntry.setSentRecipients(0);
        queueEntry.setFailedRecipients(0);
        
        CampaignQueue updated = campaignQueueRepository.save(queueEntry);
        log.info("Campaign processing started - QueueID: {}, CampaignID: {}", queueId, queueEntry.getCampaignId());
        
        return updated;
    }
    
    /**
     * Pause campaign processing
     */
    public CampaignQueue pauseCampaign(Long queueId, String reason) {
        CampaignQueue queueEntry = campaignQueueRepository.findById(queueId)
                .orElseThrow(() -> new IllegalArgumentException("Queue entry not found: " + queueId));
        
        if (!queueEntry.getStatus().equals("PROCESSING")) {
            throw new IllegalStateException("Can only pause PROCESSING campaigns");
        }
        
        queueEntry.setStatus("PAUSED");
        queueEntry.setPauseReason(reason);
        
        CampaignQueue updated = campaignQueueRepository.save(queueEntry);
        
        // Log activity
        activityLogService.logCampaignPaused(queueEntry.getUserId(), queueEntry.getCampaignId(), reason);
        
        log.info("Campaign paused - QueueID: {}, Reason: {}", queueId, reason);
        return updated;
    }
    
    /**
     * Resume campaign processing
     */
    public CampaignQueue resumeCampaign(Long queueId) {
        CampaignQueue queueEntry = campaignQueueRepository.findById(queueId)
                .orElseThrow(() -> new IllegalArgumentException("Queue entry not found: " + queueId));
        
        if (!queueEntry.getStatus().equals("PAUSED")) {
            throw new IllegalStateException("Can only resume PAUSED campaigns");
        }
        
        queueEntry.setStatus("PROCESSING");
        queueEntry.setPauseReason(null);
        
        CampaignQueue updated = campaignQueueRepository.save(queueEntry);
        
        // Log activity
        activityLogService.logCampaignResumed(queueEntry.getUserId(), queueEntry.getCampaignId());
        
        log.info("Campaign resumed - QueueID: {}", queueId);
        return updated;
    }
    
    /**
     * Mark campaign as completed
     */
    public CampaignQueue completeCampaign(Long queueId) {
        CampaignQueue queueEntry = campaignQueueRepository.findById(queueId)
                .orElseThrow(() -> new IllegalArgumentException("Queue entry not found: " + queueId));
        
        queueEntry.setStatus("COMPLETED");
        queueEntry.setCompletedAt(LocalDateTime.now());
        
        CampaignQueue updated = campaignQueueRepository.save(queueEntry);
        
        // Calculate elapsed time
        Long elapsedMs = queueEntry.getStartedAt() != null ? 
                java.time.temporal.ChronoUnit.MILLIS.between(queueEntry.getStartedAt(), queueEntry.getCompletedAt()) : 0L;
        
        // Log activity
        activityLogService.logCampaignCompleted(queueEntry.getUserId(), queueEntry.getCampaignId(),
                queueEntry.getSentRecipients(), queueEntry.getFailedRecipients(), elapsedMs);
        
        log.info("Campaign completed - QueueID: {}, Sent: {}, Failed: {}", 
                queueId, queueEntry.getSentRecipients(), queueEntry.getFailedRecipients());
        
        return updated;
    }
    
    /**
     * Mark campaign as failed
     */
    public CampaignQueue failCampaign(Long queueId, String errorMessage) {
        CampaignQueue queueEntry = campaignQueueRepository.findById(queueId)
                .orElseThrow(() -> new IllegalArgumentException("Queue entry not found: " + queueId));
        
        queueEntry.setStatus("FAILED");
        queueEntry.setErrorMessage(errorMessage);
        queueEntry.setCompletedAt(LocalDateTime.now());
        
        CampaignQueue updated = campaignQueueRepository.save(queueEntry);
        
        log.error("Campaign failed - QueueID: {}, Error: {}", queueId, errorMessage);
        return updated;
    }
    
    /**
     * Start reprocessing failed recipients
     */
    public CampaignQueue startReprocessing(Long queueId) {
        CampaignQueue queueEntry = campaignQueueRepository.findById(queueId)
                .orElseThrow(() -> new IllegalArgumentException("Queue entry not found: " + queueId));
        
        if (!queueEntry.getStatus().equals("COMPLETED")) {
            throw new IllegalStateException("Can only reprocess COMPLETED campaigns");
        }
        
        if (queueEntry.getFailedRecipients() == 0) {
            throw new IllegalStateException("No failed recipients to reprocess");
        }
        
        // Re-enqueue for processing
        queueEntry.setStatus("REPROCESSING");
        queueEntry.setRetryCount(queueEntry.getRetryCount() + 1);
        queueEntry.setStartedAt(null); // Will be set when processing starts
        queueEntry.setCompletedAt(null);
        
        CampaignQueue updated = campaignQueueRepository.save(queueEntry);
        
        // Log activity
        activityLogService.logCampaignReprocess(queueEntry.getUserId(), queueEntry.getCampaignId(),
                queueEntry.getFailedRecipients());
        
        log.info("Reprocessing started - QueueID: {}, Failed Recipients: {}", 
                queueId, queueEntry.getFailedRecipients());
        
        return updated;
    }
    
    /**
     * Update campaign progress
     */
    public CampaignQueue updateProgress(Long queueId, Integer currentRow, Integer sentCount, Integer failedCount) {
        CampaignQueue queueEntry = campaignQueueRepository.findById(queueId)
                .orElseThrow(() -> new IllegalArgumentException("Queue entry not found: " + queueId));
        
        queueEntry.setCurrentRow(currentRow);
        queueEntry.setProcessedRecipients(sentCount + failedCount);
        queueEntry.setSentRecipients(sentCount);
        queueEntry.setFailedRecipients(failedCount);
        
        return campaignQueueRepository.save(queueEntry);
    }
    
    /**
     * Get user's queued/processing campaigns
     */
    @Transactional(readOnly = true)
    public List<CampaignQueue> getUserActiveCampaigns(Long userId) {
        return campaignQueueRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, "PROCESSING");
    }
    
    /**
     * Get all campaigns for a user
     */
    @Transactional(readOnly = true)
    public List<CampaignQueue> getUserAllCampaigns(Long userId) {
        return campaignQueueRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
    
    /**
     * Check if processing capacity available
     */
    @Transactional(readOnly = true)
    public boolean hasCapacity() {
        return campaignQueueRepository.countConcurrentCampaigns() < MAX_CONCURRENT;
    }
    
    /**
     * Get current concurrent campaign count
     */
    @Transactional(readOnly = true)
    public long getConcurrentCount() {
        return campaignQueueRepository.countConcurrentCampaigns();
    }
    
    /**
     * Calculate next queue position (increment)
     */
    private Integer calculateNextQueuePosition() {
        Integer maxPos = campaignQueueRepository.findMaxQueuePosition();
        return (maxPos != null ? maxPos : 0) + 1;
    }
}
