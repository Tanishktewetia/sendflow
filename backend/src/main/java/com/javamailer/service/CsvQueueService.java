package com.javamailer.service;

import com.javamailer.entity.CsvUpload;
import com.javamailer.repository.CampaignQueueRepository;
import com.javamailer.repository.CsvUploadRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service for managing CSV upload queue (FIFO with max 5 items)
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class CsvQueueService {
    
    private final CsvUploadRepository csvUploadRepository;
    private final CampaignQueueRepository campaignQueueRepository;
    private final SupabaseStorageService supabaseStorageService;
    
    private static final int MAX_QUEUE_SIZE = 5;
    
    /**
     * Add CSV upload to user's queue
     * @param userId User ID
     * @param csvUploadId CSV Upload ID to queue
     * @return Updated CsvUpload
     */
    public CsvUpload addToQueue(Long userId, Long csvUploadId) {
        log.info("[CSV QUEUE] Adding {} to queue for user {}", csvUploadId, userId);
        
        // Verify CSV exists and belongs to user
        CsvUpload csv = csvUploadRepository.findByIdAndUserId(csvUploadId, userId)
                .orElseThrow(() -> new RuntimeException("CSV upload not found"));
        
        // Check queue size (excluding this CSV if already queued)
        int currentQueueSize = (int) csvUploadRepository.findByUserIdAndIsQueuedTrue(userId)
                .stream()
                .filter(c -> !c.getId().equals(csvUploadId))
                .count();
        
        if (currentQueueSize >= MAX_QUEUE_SIZE) {
            throw new RuntimeException("Queue is full. Maximum " + MAX_QUEUE_SIZE + " items allowed.");
        }
        
        // Already in queue?
        if (csv.getIsQueued() != null && csv.getIsQueued()) {
            log.warn("[CSV QUEUE] CSV {} already in queue, resetting status to QUEUED", csvUploadId);
            // Reset status to QUEUED (for reprocessing completed CSVs)
            csv.setStatus("QUEUED");
            CsvUpload updated = csvUploadRepository.save(csv);
            log.info("[CSV QUEUE] CSV {} status reset to QUEUED for reprocessing", csvUploadId);
            return updated;
        }
        
        // Add to queue
        csv.setIsQueued(true);
        csv.setQueuePosition(currentQueueSize); // Append to end
        csv.setQueuedAt(LocalDateTime.now());
        csv.setStatus("QUEUED"); // Reset status to QUEUED when added (handles both new and completed CSVs)
        
        CsvUpload updated = csvUploadRepository.save(csv);
        log.info("[CSV QUEUE] CSV {} added to position {} for user {} with status QUEUED", csvUploadId, currentQueueSize, userId);
        
        return updated;
    }
    
    /**
     * Remove CSV upload from queue
     * @param userId User ID
     * @param csvUploadId CSV Upload ID to remove
     */
    public void removeFromQueue(Long userId, Long csvUploadId) {
        log.info("[CSV QUEUE] Deleting CSV {} for user {}", csvUploadId, userId);

        CsvUpload csv = csvUploadRepository.findByIdAndUserId(csvUploadId, userId)
                .orElseThrow(() -> new RuntimeException("CSV upload not found"));

        int removedPosition = (csv.getIsQueued() != null && csv.getIsQueued() && csv.getQueuePosition() != null)
                ? csv.getQueuePosition()
                : -1;

        // Delete file from storage (best effort).
        try {
            if (csv.getFileStoragePath() != null && !csv.getFileStoragePath().isEmpty()) {
                supabaseStorageService.deleteCsvFile(csv.getFileStoragePath());
                log.info("[CSV QUEUE] File deleted from storage: {}", csv.getFileStoragePath());
            }
        } catch (IOException e) {
            log.error("[CSV QUEUE] Failed to delete file from storage: {}", e.getMessage());
        }

        // Remove queue linkage rows referencing this CSV upload.
        campaignQueueRepository.deleteByCsvUploadId(csvUploadId);

        // Delete CSV upload record from database.
        csvUploadRepository.delete(csv);

        // Reorder remaining queued items if this item was an active queued entry.
        if (removedPosition >= 0) {
            List<CsvUpload> queuedItems = csvUploadRepository.findByUserIdAndIsQueuedTrue(userId)
                    .stream()
                    .filter(c -> c.getQueuePosition() != null && c.getQueuePosition() > removedPosition)
                    .sorted((a, b) -> Integer.compare(a.getQueuePosition(), b.getQueuePosition()))
                    .collect(Collectors.toList());

            for (CsvUpload item : queuedItems) {
                item.setQueuePosition(item.getQueuePosition() - 1);
                csvUploadRepository.save(item);
            }
        }

        log.info("[CSV QUEUE] CSV {} fully deleted for user {}", csvUploadId, userId);
    }

    /**
     * Get recently processed CSV uploads for history and reprocess actions.
     */
    public List<CsvUpload> getRecentProcessedUploads(Long userId) {
        return csvUploadRepository.findTop10ByUserIdAndIsQueuedFalseAndStatusInOrderByProcessedAtDesc(
                userId,
                Arrays.asList("COMPLETED", "FAILED")
        );
    }
    
    /**
     * Get user's entire queue
     * @param userId User ID
     * @return List of queued CSVs in order
     */
    public List<CsvUpload> getUserQueue(Long userId) {
        List<CsvUpload> queue = csvUploadRepository.findByUserIdAndIsQueuedTrue(userId)
                .stream()
                .sorted((a, b) -> {
                    Integer posA = a.getQueuePosition() != null ? a.getQueuePosition() : Integer.MAX_VALUE;
                    Integer posB = b.getQueuePosition() != null ? b.getQueuePosition() : Integer.MAX_VALUE;
                    return Integer.compare(posA, posB);
                })
                .collect(Collectors.toList());
        
        log.debug("[CSV QUEUE] Retrieved {} items for user {}", queue.size(), userId);
        return queue;
    }
    
    /**
     * Reorder queue (move item to new position)
     * @param userId User ID
     * @param csvUploadId CSV to move
     * @param newPosition New position in queue
     */
    public void reorderQueue(Long userId, Long csvUploadId, int newPosition) {
        log.info("[CSV QUEUE] Moving {} to position {} for user {}", csvUploadId, newPosition, userId);
        
        List<CsvUpload> queue = getUserQueue(userId);
        
        if (newPosition < 0 || newPosition >= queue.size()) {
            throw new RuntimeException("Invalid position. Queue size: " + queue.size());
        }
        
        // Find the item to move
        CsvUpload itemToMove = queue.stream()
                .filter(c -> c.getId().equals(csvUploadId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("CSV not found in queue"));
        
        int oldPosition = itemToMove.getQueuePosition();
        
        if (oldPosition == newPosition) {
            return; // No change needed
        }
        
        // Remove from queue list
        queue.remove(itemToMove);
        
        // Insert at new position
        queue.add(newPosition, itemToMove);
        
        // Update positions for all items
        for (int i = 0; i < queue.size(); i++) {
            queue.get(i).setQueuePosition(i);
            csvUploadRepository.save(queue.get(i));
        }
        
        log.info("[CSV QUEUE] CSV {} moved from position {} to {}", csvUploadId, oldPosition, newPosition);
    }
    
    /**
     * Clear entire queue
     * @param userId User ID
     */
    public void clearQueue(Long userId) {
        log.info("[CSV QUEUE] Clearing entire queue for user {}", userId);
        
        List<CsvUpload> queue = csvUploadRepository.findByUserIdAndIsQueuedTrue(userId);
        
        for (CsvUpload csv : queue) {
            csv.setIsQueued(false);
            csv.setQueuePosition(null);
            csv.setQueuedAt(null);
            csvUploadRepository.save(csv);
        }
        
        log.info("[CSV QUEUE] Cleared {} items from queue", queue.size());
    }
    
    /**
     * Get queue size for user
     * @param userId User ID
     * @return Number of items in queue
     */
    public int getQueueSize(Long userId) {
        return (int) csvUploadRepository.findByUserIdAndIsQueuedTrue(userId)
                .stream().count();
    }
    
    /**
     * Check if queue is full
     * @param userId User ID
     * @return True if queue has max items
     */
    public boolean isQueueFull(Long userId) {
        return getQueueSize(userId) >= MAX_QUEUE_SIZE;
    }
}
