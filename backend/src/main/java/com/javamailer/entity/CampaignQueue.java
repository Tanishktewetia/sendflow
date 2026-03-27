package com.javamailer.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * CampaignQueue entity for managing FIFO queue of campaigns
 * Enforces max 5 concurrent campaigns (max_concurrent=5)
 * Tracks queue position and campaign status
 */
@Entity
@Table(name = "campaign_queue", indexes = {
    @Index(name = "idx_status", columnList = "status"),
    @Index(name = "idx_queue_position", columnList = "queue_position"),
    @Index(name = "idx_user_id_status", columnList = "user_id, status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class CampaignQueue {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "csv_upload_id", nullable = false)
    private Long csvUploadId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "csv_upload_id", insertable = false, updatable = false)
    private CsvUpload csvUpload;
    
    @Column(name = "campaign_id", nullable = false)
    private Long campaignId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", insertable = false, updatable = false)
    private Campaign campaign;
    
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "QUEUED"; // QUEUED, PROCESSING, PAUSED, COMPLETED, FAILED, REPROCESSING
    
    @Column(name = "queue_position", nullable = false)
    private Integer queuePosition; // Position in queue (lower = higher priority)
    
    @Column(name = "total_recipients")
    private Integer totalRecipients; // Total rows in the CSV
    
    @Column(name = "processed_recipients")
    @Builder.Default
    private Integer processedRecipients = 0; // Rows sent so far
    
    @Column(name = "failed_recipients")
    @Builder.Default
    private Integer failedRecipients = 0; // Failed rows
    
    @Column(name = "sent_recipients")
    @Builder.Default
    private Integer sentRecipients = 0; // Successfully sent
    
    @Column(name = "current_row")
    @Builder.Default
    private Integer currentRow = 0; // Current row being processed
    
    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "started_at")
    private LocalDateTime startedAt; // When processing started
    
    @Column(name = "completed_at")
    private LocalDateTime completedAt; // When processing finished
    
    @Column(name = "error_message")
    private String errorMessage; // If processing failed
    
    @Column(name = "pause_reason")
    private String pauseReason; // Why it was paused
    
    @Column(name = "retry_count")
    @Builder.Default
    private Integer retryCount = 0; // Number of reprocessing attempts
}
