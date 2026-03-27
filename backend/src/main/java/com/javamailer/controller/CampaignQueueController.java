package com.javamailer.controller;

import com.javamailer.entity.*;
import com.javamailer.service.*;
import com.javamailer.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

/**
 * CampaignQueueController - REST endpoints for campaign queue operations
 * Handles CSV uploads, campaign processing, queue management, and activity logging
 */
@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
@Slf4j
public class CampaignQueueController {
    
    private final CampaignService campaignService;
    private final QueueService queueService;
    private final CampaignExecutorService campaignExecutorService;
    private final ActivityLogService activityLogService;
    private final CampaignQueueRepository campaignQueueRepository;
    private final CsvUploadRepository csvUploadRepository;
    private final CampaignRepository campaignRepository;
    private final StorageService storageService;
    private final CSVParserService csvParserService;
    
    /**
     * Response DTOs
     */
    public record CampaignStatusResponse(
            Long queueId,
            Long campaignId,
            String status,
            Integer totalRecipients,
            Integer processedRecipients,
            Integer sentRecipients,
            Integer failedRecipients,
            Integer currentRow,
            Long elapsedMs,
            String errorMessage
    ) {}
    
    public record CampaignProgressResponse(
            Integer currentRow,
            Integer totalRows,
            Integer sent,
            Integer failed,
            Long elapsedMs,
            Double percentComplete
    ) {}
    
    /**
     * POST /campaigns/upload-csv - Upload and queue a CSV file
     * Creates campaign, uploads CSV, and enqueues for processing
     */
    @PostMapping("/upload-csv")
    public ResponseEntity<?> uploadCsv(
            @RequestParam("csvFile") MultipartFile csvFile,
            @RequestParam("campaignName") String campaignName,
            @RequestParam("subject") String subject,
            @RequestParam("body") String emailBody,
            @RequestParam("providerId") Long providerId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        try {
            if (csvFile.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "CSV file is empty"));
            }
            
            // Use hardcoded userId for now (would be from auth context)
            userId = userId != null ? userId : 1L;
            
            log.info("Processing CSV upload - User: {}, Campaign: {}", userId, campaignName);
            
            // Validate and parse CSV
            CSVParserService.CSVParseResult parseResult = csvParserService.parseAndValidateCsv(
                    csvFile.getInputStream()
            );
            
            if (parseResult.records.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "No valid records in CSV",
                        "invalidCount", parseResult.invalidEmails.size(),
                        "duplicateCount", parseResult.duplicateEmails.size()
                ));
            }
            
            // Create CSV upload record
            String storagePath = "csv/" + UUID.randomUUID() + ".csv";
            CsvUpload csvUpload = CsvUpload.builder()
                    .userId(userId)
                    .fileName(csvFile.getOriginalFilename())
                    .fileStoragePath(storagePath)
                    .totalRows(parseResult.records.size())
                    .validRows(parseResult.records.size())
                    .build();
            
            csvUpload = csvUploadRepository.save(csvUpload);
            log.info("CSV stored - Upload ID: {}, Recipients: {}", csvUpload.getId(), parseResult.records.size());
            
            // Upload file to storage
            storageService.uploadFile(csvFile.getBytes(), storagePath, csvFile.getContentType());
            
            // Create campaign
            Campaign campaign = Campaign.builder()
                    .userId(userId)
                    .campaignName(campaignName)
                    .subject(subject)
                    .emailBody(emailBody)
                    .emailProviderId(providerId)
                    .status("QUEUED")
                    .recipientCount(parseResult.records.size())
                    .build();
            
            campaign = campaignRepository.save(campaign);
            log.info("Campaign created - ID: {}, Subject: {}", campaign.getId(), subject);
            
            // Enqueue campaign for processing
            CampaignQueue queueEntry = queueService.enqueueCampaign(
                    campaign.getId(),
                    csvUpload.getId(),
                    parseResult.records.size()
            );
            
            // Log activity
            activityLogService.logCsvUpload(userId, csvUpload.getId(), 
                    csvFile.getOriginalFilename(), parseResult.records.size(), "CSV");
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("queueId", queueEntry.getId());
            response.put("campaignId", campaign.getId());
            response.put("csvUploadId", csvUpload.getId());
            response.put("totalRecipients", parseResult.records.size());
            response.put("queuePosition", queueEntry.getQueuePosition());
            response.put("status", "QUEUED");
            
            return ResponseEntity.ok(response);
            
        } catch (IOException e) {
            log.error("CSV upload error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to process CSV: " + e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error during CSV upload: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Server error: " + e.getMessage()));
        }
    }
    
    /**
     * POST /campaigns/start/{queueId} - Start processing a queued campaign
     */
    @PostMapping("/start/{queueId}")
    public ResponseEntity<?> startCampaign(@PathVariable Long queueId) {
        try {
            CampaignQueue queueEntry = campaignQueueRepository.findById(queueId)
                    .orElseThrow(() -> new IllegalArgumentException("Queue entry not found"));
            
            if (!queueEntry.getStatus().equals("QUEUED")) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Campaign is not in QUEUED status: " + queueEntry.getStatus()
                ));
            }
            
            // Check capacity
            if (!queueService.hasCapacity()) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                        "error", "Max concurrent campaigns reached (5 limit)",
                        "currentConcurrent", queueService.getConcurrentCount()
                ));
            }
            
            // Start processing
            queueService.startProcessing(queueId);
            
            // Execute campaign asynchronously
            campaignExecutorService.executeCampaign(queueId);
            
            CampaignQueue updated = campaignQueueRepository.findById(queueId).orElse(queueEntry);
            
            return ResponseEntity.ok(new CampaignStatusResponse(
                    updated.getId(),
                    updated.getCampaignId(),
                    updated.getStatus(),
                    updated.getTotalRecipients(),
                    updated.getProcessedRecipients(),
                    updated.getSentRecipients(),
                    updated.getFailedRecipients(),
                    updated.getCurrentRow(),
                    0L,
                    null
            ));
            
        } catch (Exception e) {
            log.error("Start campaign error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * POST /campaigns/{queueId}/pause - Pause a processing campaign
     */
    @PostMapping("/{queueId}/pause")
    public ResponseEntity<?> pauseCampaign(
            @PathVariable Long queueId,
            @RequestParam(value = "reason", defaultValue = "User paused") String reason
    ) {
        try {
            CampaignQueue updated = queueService.pauseCampaign(queueId, reason);
            
            return ResponseEntity.ok(new CampaignStatusResponse(
                    updated.getId(),
                    updated.getCampaignId(),
                    updated.getStatus(),
                    updated.getTotalRecipients(),
                    updated.getProcessedRecipients(),
                    updated.getSentRecipients(),
                    updated.getFailedRecipients(),
                    updated.getCurrentRow(),
                    null,
                    null
            ));
            
        } catch (Exception e) {
            log.error("Pause campaign error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * POST /campaigns/{queueId}/resume - Resume a paused campaign
     */
    @PostMapping("/{queueId}/resume")
    public ResponseEntity<?> resumeCampaign(@PathVariable Long queueId) {
        try {
            CampaignQueue updated = queueService.resumeCampaign(queueId);
            
            // Start async execution again
            campaignExecutorService.executeCampaign(queueId);
            
            return ResponseEntity.ok(new CampaignStatusResponse(
                    updated.getId(),
                    updated.getCampaignId(),
                    updated.getStatus(),
                    updated.getTotalRecipients(),
                    updated.getProcessedRecipients(),
                    updated.getSentRecipients(),
                    updated.getFailedRecipients(),
                    updated.getCurrentRow(),
                    null,
                    null
            ));
            
        } catch (Exception e) {
            log.error("Resume campaign error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * POST /campaigns/{queueId}/reprocess - Reprocess failed recipients
     */
    @PostMapping("/{queueId}/reprocess")
    public ResponseEntity<?> reprocessCampaign(@PathVariable Long queueId) {
        try {
            CampaignQueue updated = queueService.startReprocessing(queueId);
            
            // Start async reprocessing
            campaignExecutorService.reprocessCampaign(queueId);
            
            return ResponseEntity.ok(new CampaignStatusResponse(
                    updated.getId(),
                    updated.getCampaignId(),
                    updated.getStatus(),
                    updated.getTotalRecipients(),
                    updated.getProcessedRecipients(),
                    updated.getSentRecipients(),
                    updated.getFailedRecipients(),
                    updated.getCurrentRow(),
                    null,
                    null
            ));
            
        } catch (Exception e) {
            log.error("Reprocess campaign error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * GET /campaigns/{queueId}/status - Get campaign processing status (for real-time polling)
     */
    @GetMapping("/{queueId}/status")
    public ResponseEntity<?> getCampaignStatus(@PathVariable Long queueId) {
        try {
            CampaignQueue queueEntry = campaignQueueRepository.findById(queueId)
                    .orElseThrow(() -> new IllegalArgumentException("Queue entry not found"));
            
            Long elapsedMs = queueEntry.getStartedAt() != null ?
                    java.time.temporal.ChronoUnit.MILLIS.between(
                            queueEntry.getStartedAt(),
                            queueEntry.getCompletedAt() != null ? queueEntry.getCompletedAt() : java.time.LocalDateTime.now()
                    ) : 0L;
            
            Double percentComplete = queueEntry.getTotalRecipients() > 0 ?
                    (queueEntry.getProcessedRecipients() * 100.0) / queueEntry.getTotalRecipients() : 0.0;
            
            return ResponseEntity.ok(new CampaignProgressResponse(
                    queueEntry.getCurrentRow(),
                    queueEntry.getTotalRecipients(),
                    queueEntry.getSentRecipients(),
                    queueEntry.getFailedRecipients(),
                    elapsedMs,
                    percentComplete
            ));
            
        } catch (Exception e) {
            log.error("Get status error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Campaign not found"));
        }
    }
    
    /**
     * GET /activity-log - Get paginated activity log for user
     */
    @GetMapping("/activity-log")
    public ResponseEntity<?> getActivityLog(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        try {
            userId = userId != null ? userId : 1L;
            
            Pageable pageable = PageRequest.of(page, size);
            Page<ActivityLog> activityLogs = activityLogService.getUserActivityLog(userId, pageable);
            
            return ResponseEntity.ok(activityLogs);
            
        } catch (Exception e) {
            log.error("Activity log error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * DELETE /campaigns/{campaignId} - Delete a campaign and remove from queue
     */
    @DeleteMapping("/{campaignId}")
    public ResponseEntity<?> deleteCampaign(@PathVariable Long campaignId) {
        try {
            Campaign campaign = campaignRepository.findById(campaignId)
                    .orElseThrow(() -> new IllegalArgumentException("Campaign not found"));
            
            // Find and delete queue entry
            Optional<CampaignQueue> queueEntry = campaignQueueRepository.findByCampaignId(campaignId);
            if (queueEntry.isPresent()) {
                campaignQueueRepository.delete(queueEntry.get());
                log.info("Deleted queue entry for campaign: {}", campaignId);
            }
            
            // Log deletion
            activityLogService.logCampaignDeleted(campaign.getUserId(), campaignId, campaign.getSubject());
            
            // Delete campaign
            campaignRepository.delete(campaign);
            
            return ResponseEntity.ok(Map.of("success", true, "message", "Campaign deleted"));
            
        } catch (Exception e) {
            log.error("Delete campaign error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
