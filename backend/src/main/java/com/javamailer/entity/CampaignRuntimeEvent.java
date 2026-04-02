package com.javamailer.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Persistent runtime execution logs for campaign terminal visibility.
 */
@Entity
@Table(name = "campaign_runtime_events", indexes = {
        @Index(name = "idx_campaign_runtime_events_user_time", columnList = "user_id, event_time DESC"),
        @Index(name = "idx_campaign_runtime_events_queue_time", columnList = "queue_id, event_time DESC")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class CampaignRuntimeEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "campaign_id")
    private Long campaignId;

    @Column(name = "queue_id", nullable = false)
    private Long queueId;

    @Column(name = "seq_no", nullable = false)
    private Long seq;

    @Column(name = "event_time", nullable = false)
    private LocalDateTime eventTime;

    @Column(name = "level", nullable = false, length = 20)
    private String level;

    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "row_number")
    private Integer row;

    @Column(name = "recipient_email", length = 320)
    private String recipientEmail;

    @PrePersist
    protected void onCreate() {
        if (eventTime == null) {
            eventTime = LocalDateTime.now();
        }
    }
}
