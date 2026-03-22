package com.javamailer.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * EmailLog entity for audit trail of all emails sent
 * Maps to 'email_logs' table in PostgreSQL
 * Tracks SMTP responses for debugging and analytics
 */
@Entity
@Table(name = "email_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class EmailLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "campaign_id", nullable = false)
    private Long campaignId;
    
    @Column(name = "recipient_id")
    private Long recipientId;
    
    @Column(name = "recipient_email", nullable = false, length = 255)
    private String recipientEmail;
    
    @Column(name = "subject_sent", length = 255)
    private String subjectSent;
    
    @Column(length = 50)
    @Builder.Default
    private String status = "SENT"; // SENT, FAILED, BOUNCED, OPENED, CLICKED
    
    @Column(name = "smtp_response_code")
    private Integer smtpResponseCode;
    
    @Column(name = "smtp_response_message", columnDefinition = "TEXT")
    private String smtpResponseMessage;
    
    @Column(name = "opened_at")
    private LocalDateTime openedAt;
    
    @Column(name = "clicked_at")
    private LocalDateTime clickedAt;
    
    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (sentAt == null) sentAt = LocalDateTime.now();
        if (status == null) status = "SENT";
    }
}
