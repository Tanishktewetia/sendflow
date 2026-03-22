package com.javamailer.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * CampaignRecipient entity representing recipients of a campaign
 * Maps to 'campaign_recipients' table in PostgreSQL
 * Also serves for personalization with {{tags}}
 */
@Entity
@Table(name = "campaign_recipients")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class CampaignRecipient {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "campaign_id", nullable = false)
    private Long campaignId;
    
    @Column(nullable = false, length = 255)
    private String name;
    
    @Column(nullable = false, length = 255)
    private String email;
    
    @Column(length = 255)
    private String company;
    
    @Column(name = "custom_field_1", length = 500)
    private String customField1;
    
    @Column(name = "custom_field_2", length = 500)
    private String customField2;
    
    @Column(length = 50)
    @Builder.Default
    private String status = "PENDING";
    
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;
    
    @Column(name = "error_code", length = 50)
    private String errorCode;
    
    @Column(name = "sent_at")
    private LocalDateTime sentAt;
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = "PENDING";
    }
}
