package com.javamailer.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * AuditLog entity for tracking user actions
 * Maps to 'audit_logs' table in PostgreSQL
 * Used for compliance and security monitoring
 */
@Entity
@Table(name = "audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class AuditLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id")
    private Long userId;
    
    @Column(length = 100)
    private String action; // LOGIN, CAMPAIGN_STARTED, EMAIL_PROVIDER_ADDED, etc.
    
    @Column(name = "resource_type", length = 100)
    private String resourceType; // campaign, email_provider, user, etc.
    
    @Column(name = "resource_id")
    private Long resourceId;
    
    @Column(columnDefinition = "TEXT")
    private String details; // JSON with additional details
    
    @Column(name = "ip_address", length = 50)
    private String ipAddress;
    
    @Column(name = "user_agent", length = 500)
    private String userAgent;
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
