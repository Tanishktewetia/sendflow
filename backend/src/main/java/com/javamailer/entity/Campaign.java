package com.javamailer.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Campaign entity representing an email marketing campaign
 * Maps to 'campaigns' table in PostgreSQL
 */
@Entity
@Table(name = "campaigns")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class Campaign {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "email_provider_id")
    private Long emailProviderId;
    
    @Column(name = "campaign_name", nullable = false, length = 255)
    private String campaignName;
    
    @Column(nullable = false, length = 255)
    private String subject;
    
    @Column(name = "email_body", nullable = false, columnDefinition = "TEXT")
    private String emailBody;
    
    @Column(length = 50)
    @Builder.Default
    private String status = "DRAFT";
    
    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;
    
    @Column(name = "started_at")
    private LocalDateTime startedAt;
    
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    
    @Column(name = "paused_at")
    private LocalDateTime pausedAt;
    
    @Column(name = "recipient_count")
    @Builder.Default
    private Integer recipientCount = 0;
    
    @Column(name = "send_delay_ms")
    @Builder.Default
    private Integer sendDelayMs = 0;
    
    @Column(name = "total_sent")
    @Builder.Default
    private Integer totalSent = 0;
    
    @Column(name = "total_failed")
    @Builder.Default
    private Integer totalFailed = 0;
    
    @Column(name = "total_pending")
    @Builder.Default
    private Integer totalPending = 0;
    
    @Column(name = "success_rate")
    @Builder.Default
    private Double successRate = 0.0;
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(nullable = false)
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = "DRAFT";
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
