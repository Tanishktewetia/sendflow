package com.javamailer.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "campaign_stats_yearly", uniqueConstraints = {
        @UniqueConstraint(name = "uq_campaign_stats_yearly_user_year", columnNames = {"user_id", "stat_year"})
}, indexes = {
        @Index(name = "idx_campaign_stats_yearly_user_year", columnList = "user_id, stat_year DESC")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class CampaignStatsYearly {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "stat_year", nullable = false)
    private Integer statYear;

    @Column(name = "sent_count", nullable = false)
    @Builder.Default
    private Long sentCount = 0L;

    @Column(name = "failed_count", nullable = false)
    @Builder.Default
    private Long failedCount = 0L;

    @Column(name = "total_count", nullable = false)
    @Builder.Default
    private Long totalCount = 0L;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void touch() {
        updatedAt = LocalDateTime.now();
    }
}
