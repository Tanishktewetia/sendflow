package com.javamailer.controller;

import com.javamailer.entity.CsvUpload;
import com.javamailer.security.JwtUserDetails;
import com.javamailer.service.CsvQueueService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controller for CSV Queue Management endpoints
 * Handles queue operations: add, remove, reorder, view
 */
@RestController
@RequestMapping("/csv/queue")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
@Slf4j
@RequiredArgsConstructor
public class CsvQueueController {
    
    private final CsvQueueService csvQueueService;
    
    /**
     * Add CSV to queue
     * POST /api/csv/queue/{csvUploadId}
     */
    @PostMapping("/{csvUploadId}")
    public ResponseEntity<?> addToQueue(@PathVariable Long csvUploadId, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            log.info("[CSV QUEUE] addToQueue called - User: {}, csvUploadId: {} (type: {})", userId, csvUploadId, csvUploadId.getClass().getName());
            
            CsvUpload updated = csvQueueService.addToQueue(userId, csvUploadId);
                        log.info("[CSV QUEUE] CSV {} successfully added to queue for user {}", csvUploadId, userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "CSV added to queue successfully");
            response.put("csvId", updated.getId());
            response.put("queuePosition", updated.getQueuePosition());
            response.put("queueSize", csvQueueService.getQueueSize(userId));
                        response.put("status", updated.getStatus());
                        log.info("[CSV QUEUE] Returning successful response: {}", response);
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
                log.error("[CSV QUEUE] Error adding to queue - User: {}, csvUploadId: {}, Error: {}", 
                    authentication != null ? ((JwtUserDetails) authentication.getDetails()).getUserId() : "UNKNOWN",
                    csvUploadId, e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Get user's entire queue
     * GET /api/csv/queue
     */
    @GetMapping
    public ResponseEntity<?> getQueue(Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
                List<CsvUpload> queue = csvQueueService.getUserQueue(userId);
                List<CsvUpload> processed = csvQueueService.getRecentProcessedUploads(userId);
                List<CsvUpload> combined = new java.util.ArrayList<>();
                combined.addAll(queue);
                combined.addAll(processed.stream()
                    .filter(csv -> queue.stream().noneMatch(q -> q.getId().equals(csv.getId())))
                    .toList());

                log.info("[CSV QUEUE] getQueue: Retrieved {} active + {} processed items for user {}",
                    queue.size(), processed.size(), userId);
            
            // Transform to frontend-friendly format
                List<Map<String, Object>> queueData = combined.stream()
                    .map(csv -> {
                        Map<String, Object> item = new HashMap<>();
                        item.put("id", csv.getId());
                        item.put("name", csv.getFileName());
                        item.put("recipients", csv.getTotalRows() != null ? csv.getTotalRows() : 0);
                        item.put("status", csv.getStatus() != null ? csv.getStatus() : "QUEUED");
                        item.put("queuePosition", csv.getQueuePosition() != null ? csv.getQueuePosition() : -1);
                        item.put("uploadedAt", csv.getUploadedAt());
                        item.put("recipientCount", csv.getTotalRows());
                        log.info("[CSV QUEUE] getQueue item: id={}, name={}, status={}, position={}", 
                                item.get("id"), item.get("name"), item.get("status"), item.get("queuePosition"));
                        return item;
                    })
                    .collect(Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("queue", queueData);
            response.put("queueSize", queue.size());
            response.put("maxQueueSize", 5);
            response.put("isFull", csvQueueService.isQueueFull(userId));
            
            log.info("[CSV QUEUE] getQueue response: {}", response);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("[CSV QUEUE] Error retrieving queue: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Failed to retrieve queue"));
        }
    }
    
    /**
     * Remove CSV from queue
     * DELETE /api/csv/queue/{csvUploadId}
     */
    @DeleteMapping("/{csvUploadId}")
    public ResponseEntity<?> removeFromQueue(@PathVariable Long csvUploadId, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            log.info("[CSV QUEUE] User {} removing {} from queue", userId, csvUploadId);
            
            csvQueueService.removeFromQueue(userId, csvUploadId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "CSV removed from queue successfully");
            response.put("queueSize", csvQueueService.getQueueSize(userId));
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            log.error("[CSV QUEUE] Error removing from queue: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Reorder queue (move item to new position)
     * POST /api/csv/queue/reorder/{csvUploadId}
     * Request body: { "newPosition": 1 }
     */
    @PostMapping("/reorder/{csvUploadId}")
    public ResponseEntity<?> reorderQueue(@PathVariable Long csvUploadId, 
                                         @RequestBody Map<String, Integer> request,
                                         Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            Integer newPosition = request.get("newPosition");
            if (newPosition == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "newPosition is required"));
            }
            
            log.info("[CSV QUEUE] User {} moving {} to position {}", userId, csvUploadId, newPosition);
            
            csvQueueService.reorderQueue(userId, csvUploadId, newPosition);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Queue reordered successfully");
            response.put("csvId", csvUploadId);
            response.put("newPosition", newPosition);
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            log.error("[CSV QUEUE] Error reordering queue: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Clear entire queue
     * DELETE /api/csv/queue
     */
    @DeleteMapping
    public ResponseEntity<?> clearQueue(Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            log.info("[CSV QUEUE] User {} clearing entire queue", userId);
            
            csvQueueService.clearQueue(userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Queue cleared successfully");
            response.put("queueSize", 0);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("[CSV QUEUE] Error clearing queue: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Failed to clear queue"));
        }
    }
}
