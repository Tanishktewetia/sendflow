package com.javamailer.controller;

import com.javamailer.entity.*;
import com.javamailer.security.JwtUserDetails;
import com.javamailer.service.*;
import com.javamailer.repository.*;
import com.javamailer.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

/**
 * CampaignQueueController - REST endpoints for campaign queue operations
 * Handles CSV uploads, campaign processing, queue management, and activity logging
 */
@RestController
@RequestMapping("/campaign-queue")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
public class CampaignQueueController {
    
    private final CampaignService campaignService;
    private final QueueService queueService;
    private final CampaignExecutorService campaignExecutorService;
    private final ActivityLogService activityLogService;
        private final CampaignRuntimeEventService campaignRuntimeEventService;
        private final CampaignDashboardStatsService campaignDashboardStatsService;
    private final CampaignQueueRepository campaignQueueRepository;
    private final CsvUploadRepository csvUploadRepository;
    private final CampaignRepository campaignRepository;
        private final UserRepository userRepository;
        private final SupabaseStorageService supabaseStorageService;
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

    private record RangeSpec(Integer from, Integer to, Integer targetTotal) {}
    
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
                        @RequestHeader(value = "X-User-Id", required = false) Long userId,
                        Authentication authentication
    ) {
        try {
            if (csvFile.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "CSV file is empty"));
            }
            
                        userId = resolveUserId(authentication, userId);
            
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
            
            // Upload file to Supabase storage and store returned file path
            String storagePath = supabaseStorageService.uploadCsvFile(userId, csvFile);

            // Create CSV upload record
            CsvUpload csvUpload = CsvUpload.builder()
                    .userId(userId)
                    .fileName(csvFile.getOriginalFilename())
                    .fileStoragePath(storagePath)
                    .totalRows(parseResult.records.size())
                    .validRows(parseResult.records.size())
                    .build();
            
            csvUpload = csvUploadRepository.save(csvUpload);
            log.info("CSV stored - Upload ID: {}, Recipients: {}", csvUpload.getId(), parseResult.records.size());
            
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
         * POST /campaigns/start-from-csv-upload - Start campaign using an existing csv_uploads record
         */
        @PostMapping("/start-from-csv-upload")
        public ResponseEntity<?> startFromCsvUpload(
                        @RequestBody Map<String, Object> request,
                        @RequestHeader(value = "X-User-Id", required = false) Long userId,
                        Authentication authentication
        ) {
                try {
                        userId = resolveUserId(authentication, userId);

                        Long csvUploadId = Long.valueOf(String.valueOf(request.get("csvUploadId")));
                        Long providerId = Long.valueOf(String.valueOf(request.get("providerId")));
                        String campaignName = String.valueOf(request.getOrDefault("campaignName", "Campaign"));
                        String subject = String.valueOf(request.getOrDefault("subject", ""));
                        String emailBody = String.valueOf(request.getOrDefault("body", ""));

                        CsvUpload csvUpload = csvUploadRepository.findByIdAndUserId(csvUploadId, userId)
                                        .orElseThrow(() -> new IllegalArgumentException("CSV upload not found"));

                        Integer recipientCount = csvUpload.getTotalRows() != null ? csvUpload.getTotalRows() : 0;
                        if (recipientCount <= 0) {
                                return ResponseEntity.badRequest().body(Map.of("error", "CSV has no recipients"));
                        }

                        RangeSpec rangeSpec = resolveRange(request, recipientCount);

                        Campaign campaign = Campaign.builder()
                                        .userId(userId)
                                        .campaignName(campaignName)
                                        .subject(subject)
                                        .emailBody(emailBody)
                                        .emailProviderId(providerId)
                                        .status("QUEUED")
                                        .recipientCount(rangeSpec.targetTotal())
                                        .build();

                        campaign = campaignRepository.save(campaign);

                        CampaignQueue queueEntry = queueService.enqueueCampaign(
                                        campaign.getId(),
                                        csvUpload.getId(),
                                        rangeSpec.targetTotal()
                        );

                        queueService.startProcessing(queueEntry.getId());
                        campaignExecutorService.executeCampaign(queueEntry.getId(), rangeSpec.from(), rangeSpec.to());

                        Map<String, Object> response = new HashMap<>();
                        response.put("success", true);
                        response.put("queueId", queueEntry.getId());
                        response.put("campaignId", campaign.getId());
                        response.put("csvUploadId", csvUpload.getId());
                        response.put("totalRecipients", rangeSpec.targetTotal());
                        response.put("rangeFrom", rangeSpec.from());
                        response.put("rangeTo", rangeSpec.to());
                        response.put("status", "PROCESSING");
                        return ResponseEntity.ok(response);
                } catch (Exception e) {
                        log.error("Start from existing CSV upload error: {}", e.getMessage(), e);
                        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
                }
        }
    
    /**
     * POST /campaigns/start/{queueId} - Start processing a queued campaign
     */
    @PostMapping("/start/{queueId}")
        public ResponseEntity<?> startCampaign(
                        @PathVariable Long queueId,
                        @RequestBody(required = false) Map<String, Object> request
        ) {
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

                        CsvUpload csvUpload = csvUploadRepository.findById(queueEntry.getCsvUploadId())
                                        .orElseThrow(() -> new IllegalArgumentException("CSV not found"));
                        Integer totalRows = csvUpload.getTotalRows() != null ? csvUpload.getTotalRows() : 0;
                        RangeSpec rangeSpec = resolveRange(request, totalRows);

                        queueEntry.setTotalRecipients(rangeSpec.targetTotal());
                        campaignQueueRepository.save(queueEntry);
            
            // Start processing
            queueService.startProcessing(queueId);
            
            // Execute campaign asynchronously
                        campaignExecutorService.executeCampaign(queueId, rangeSpec.from(), rangeSpec.to());
            
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
         * POST /campaigns/{queueId}/reset - Force reset a stuck campaign back to queued state
         */
        @PostMapping("/{queueId}/reset")
        public ResponseEntity<?> resetCampaign(
                        @PathVariable Long queueId,
                        @RequestBody(required = false) Map<String, Object> request
        ) {
                try {
                        String reason = "Manual reset requested";
                        if (request != null && request.get("reason") != null) {
                                reason = String.valueOf(request.get("reason"));
                        }

                        CampaignQueue updated = queueService.resetStuckCampaign(queueId, reason);

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
                        log.error("Reset campaign error: {}", e.getMessage(), e);
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                        .body(Map.of("error", e.getMessage()));
                }
        }
    
    /**
     * POST /campaigns/{queueId}/resume - Resume a paused campaign
     */
    @PostMapping("/{queueId}/resume")
    public ResponseEntity<?> resumeCampaign(
            @PathVariable Long queueId,
            @RequestBody(required = false) Map<String, Object> request
    ) {
        try {
            CampaignQueue updated = queueService.resumeCampaign(queueId);

            CsvUpload csvUpload = csvUploadRepository.findById(updated.getCsvUploadId())
                    .orElseThrow(() -> new IllegalArgumentException("CSV not found"));
            Integer totalRows = csvUpload.getTotalRows() != null ? csvUpload.getTotalRows() : 0;
            RangeSpec rangeSpec = resolveRange(request, totalRows);
            
            // Start async execution again
            campaignExecutorService.executeCampaign(queueId, rangeSpec.from(), rangeSpec.to());
            
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

            Map<String, Object> response = new HashMap<>();
            response.put("queueId", queueEntry.getId());
            response.put("campaignId", queueEntry.getCampaignId());
            response.put("status", queueEntry.getStatus());
            response.put("currentRow", queueEntry.getCurrentRow());
            response.put("totalRows", queueEntry.getTotalRecipients());
            response.put("totalRecipients", queueEntry.getTotalRecipients());
            response.put("processedRecipients", queueEntry.getProcessedRecipients());
            response.put("sentRecipients", queueEntry.getSentRecipients());
            response.put("failedRecipients", queueEntry.getFailedRecipients());
            response.put("sent", queueEntry.getSentRecipients());
            response.put("failed", queueEntry.getFailedRecipients());
            response.put("elapsedMs", elapsedMs);
            response.put("percentComplete", percentComplete);
            response.put("errorMessage", queueEntry.getErrorMessage());

            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Get status error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Campaign not found"));
        }
    }

        /**
         * GET /campaigns/{queueId}/events - Get runtime execution events for frontend log terminal
         */
        @GetMapping("/{queueId}/events")
        public ResponseEntity<?> getCampaignRuntimeEvents(
                        @PathVariable Long queueId,
                        @RequestParam(value = "afterSeq", defaultValue = "0") long afterSeq,
                        @RequestParam(value = "limit", defaultValue = "100") int limit
        ) {
                try {
                        List<CampaignRuntimeEventService.RuntimeEvent> events =
                                        campaignRuntimeEventService.getEvents(queueId, afterSeq, limit);

                        long nextSeq = events.isEmpty() ? afterSeq : events.get(events.size() - 1).seq();
                        return ResponseEntity.ok(Map.of(
                                        "queueId", queueId,
                                        "afterSeq", afterSeq,
                                        "nextSeq", nextSeq,
                                        "events", events
                        ));
                } catch (Exception e) {
                        log.error("Get campaign runtime events error: {}", e.getMessage(), e);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body(Map.of("error", e.getMessage()));
                }
        }

        /**
         * GET /campaigns/events/recent - Get recent persisted runtime events for authenticated user
         */
        @GetMapping("/events/recent")
        public ResponseEntity<?> getRecentCampaignRuntimeEvents(
                        @RequestParam(value = "limit", defaultValue = "200") int limit,
                        @RequestHeader(value = "X-User-Id", required = false) Long fallbackUserId,
                        Authentication authentication
        ) {
                try {
                        Long userId = resolveUserId(authentication, fallbackUserId);

                        List<CampaignRuntimeEventService.RuntimeEvent> events =
                                        campaignRuntimeEventService.getRecentEventsForUser(userId, limit);

                        return ResponseEntity.ok(Map.of(
                                        "userId", userId,
                                        "count", events.size(),
                                        "events", events
                        ));
                } catch (Exception e) {
                        log.error("Get recent campaign runtime events error: {}", e.getMessage(), e);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body(Map.of("error", e.getMessage()));
                }
        }

        /**
         * GET /campaign-queue/events/export - Export persisted campaign logs as text file.
         */
        @GetMapping("/events/export")
        public ResponseEntity<?> exportCampaignRuntimeEvents(
                        @RequestParam(value = "queueId", required = false) Long queueId,
                        @RequestParam(value = "limit", defaultValue = "5000") int limit,
                        @RequestHeader(value = "X-User-Id", required = false) Long fallbackUserId,
                        Authentication authentication
        ) {
                try {
                        Long userId = resolveUserId(authentication, fallbackUserId);
                        List<CampaignRuntimeEventService.RuntimeEvent> events =
                                        campaignRuntimeEventService.getEventsForExport(userId, queueId, limit);

                        StringBuilder buffer = new StringBuilder();
                        buffer.append("Campaign Logs Export\n");
                        buffer.append("User ID: ").append(userId).append("\n");
                        if (queueId != null) {
                                buffer.append("Queue ID: ").append(queueId).append("\n");
                        }
                        buffer.append("Generated At: ").append(java.time.LocalDateTime.now()).append("\n");
                        buffer.append("========================================\n");

                        for (CampaignRuntimeEventService.RuntimeEvent event : events) {
                                buffer.append("[").append(event.timestamp()).append("] ");
                                buffer.append("[").append(String.valueOf(event.level()).toUpperCase()).append("] ");
                                if (event.queueId() != null) {
                                        buffer.append("[queue:").append(event.queueId()).append("] ");
                                }
                                if (event.row() != null) {
                                        buffer.append("[row:").append(event.row()).append("] ");
                                }
                                buffer.append(event.message());
                                if (event.recipientEmail() != null && !event.recipientEmail().isBlank()) {
                                        buffer.append(" (").append(event.recipientEmail()).append(")");
                                }
                                buffer.append("\n");
                        }

                        String fileName = queueId == null
                                ? "campaign-logs-all.txt"
                                : "campaign-logs-queue-" + queueId + ".txt";

                        return ResponseEntity.ok()
                                .contentType(MediaType.TEXT_PLAIN)
                                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                                .body(buffer.toString());
                } catch (Exception e) {
                        log.error("Export campaign runtime events error: {}", e.getMessage(), e);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body(Map.of("error", e.getMessage()));
                }
        }

        /**
         * DELETE /campaign-queue/events - Clear persisted runtime events for current user.
         */
        @DeleteMapping("/events")
        public ResponseEntity<?> clearCampaignRuntimeEvents(
                        @RequestParam(value = "queueId", required = false) Long queueId,
                        @RequestHeader(value = "X-User-Id", required = false) Long fallbackUserId,
                        Authentication authentication
        ) {
                try {
                        Long userId = resolveUserId(authentication, fallbackUserId);
                        long deleted = campaignRuntimeEventService.clearEventsForUser(userId, queueId);

                        Map<String, Object> response = new HashMap<>();
                        response.put("userId", userId);
                        response.put("queueId", queueId);
                        response.put("deleted", deleted);
                        return ResponseEntity.ok(response);
                } catch (Exception e) {
                        log.error("Clear campaign runtime events error: {}", e.getMessage(), e);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body(Map.of("error", e.getMessage()));
                }
        }

        /**
         * GET /campaign-queue/dashboard-stats - Get DB-backed daily and YTD stats for dashboard cards.
         */
        @GetMapping("/dashboard-stats")
        public ResponseEntity<?> getDashboardStats(
                        @RequestHeader(value = "X-User-Id", required = false) Long fallbackUserId,
                        Authentication authentication
        ) {
                try {
                        Long userId = resolveUserId(authentication, fallbackUserId);

                        Map<String, Object> stats = campaignDashboardStatsService.getDashboardStats(userId);
                        return ResponseEntity.ok(stats);
                } catch (Exception e) {
                        log.error("Get dashboard stats error: {}", e.getMessage(), e);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body(Map.of("error", e.getMessage()));
                }
        }

        /**
         * DELETE /campaign-queue/dashboard-stats - Clear all persisted dashboard stats for current user.
         */
        @DeleteMapping("/dashboard-stats")
        public ResponseEntity<?> clearDashboardStats(
                        @RequestHeader(value = "X-User-Id", required = false) Long fallbackUserId,
                        Authentication authentication
        ) {
                try {
                        Long userId = resolveUserId(authentication, fallbackUserId);
                        Map<String, Object> deleted = campaignDashboardStatsService.clearDashboardStatsForUser(userId);

                        Map<String, Object> response = new HashMap<>();
                        response.put("success", true);
                        response.put("userId", userId);
                        response.putAll(deleted);
                        return ResponseEntity.ok(response);
                } catch (Exception e) {
                        log.error("Clear dashboard stats error: {}", e.getMessage(), e);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body(Map.of("error", e.getMessage()));
                }
        }

        private Long resolveUserId(Authentication authentication, Long fallback) {
                if (authentication != null) {
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
                                Optional<User> user = userRepository.findByEmail(emailCandidate);
                                if (user.isPresent()) {
                                        return user.get().getId();
                                }
                        }
                }

                if (fallback != null && fallback > 0) {
                        return fallback;
                }

                throw new IllegalStateException("Unable to resolve authenticated user id for request");
        }

        private RangeSpec resolveRange(Map<String, Object> request, Integer totalRows) {
                int safeTotal = totalRows != null ? Math.max(0, totalRows) : 0;
                if (safeTotal == 0) {
                        return new RangeSpec(1, 0, 0);
                }

                if (request == null || request.isEmpty()) {
                        return new RangeSpec(1, safeTotal, safeTotal);
                }

                String sendTo = String.valueOf(request.getOrDefault("sendTo", "all")).toLowerCase();
                Integer from = parsePositiveInt(request.get("rangeFrom"));
                Integer to = parsePositiveInt(request.get("rangeTo"));

                if (!"range".equals(sendTo)) {
                        return new RangeSpec(1, safeTotal, safeTotal);
                }

                int safeFrom = from != null ? Math.max(1, from) : 1;
                int safeTo = to != null ? Math.max(safeFrom, to) : safeTotal;
                safeFrom = Math.min(safeFrom, safeTotal);
                safeTo = Math.min(safeTo, safeTotal);

                return new RangeSpec(safeFrom, safeTo, (safeTo - safeFrom + 1));
        }

        private Integer parsePositiveInt(Object raw) {
                if (raw == null) {
                        return null;
                }
                try {
                        int value = Integer.parseInt(String.valueOf(raw));
                        return value > 0 ? value : null;
                } catch (NumberFormatException ignored) {
                        return null;
                }
        }
    
    /**
     * GET /activity-log - Get paginated activity log for user
     */
    @GetMapping("/activity-log")
    public ResponseEntity<?> getActivityLog(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            Authentication authentication
    ) {
        try {
            userId = resolveUserId(authentication, userId);
            
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
