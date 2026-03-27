package com.javamailer.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

/**
 * ActivityLog entity for tracking all user actions
 * Maps to 'activity_logs' table in PostgreSQL
 * Logs every significant action: uploads, campaigns, provider changes, etc
 */
@Entity
@Table(name = "activity_logs", indexes = {
    @Index(name = "idx_user_id", columnList = "user_id"),
    @Index(name = "idx_created_at", columnList = "created_at DESC")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class ActivityLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "action_type", nullable = false, length = 50)
    private String actionType; // CSV_UPLOADED, CAMPAIGN_STARTED, CAMPAIGN_COMPLETED, etc
    
    @Column(name = "action_title", length = 255)
    private String actionTitle; // Human-readable title
    
    @Column(name = "action_description", columnDefinition = "TEXT")
    private String actionDescription; // Detailed description
    
    @Column(name = "resource_type", length = 50)
    private String resourceType; // CSV, CAMPAIGN, EMAIL_PROVIDER, etc
    
    @Column(name = "resource_id")
    private Long resourceId; // ID of the resource being acted upon
    
    @Column(columnDefinition = "jsonb", name = "metadata")
    @org.hibernate.annotations.JdbcTypeCode(SqlTypes.JSON)
    private JsonNode metadata; // Additional JSON data for context
    
    @Column(name = "status", length = 20)
    @Builder.Default
    private String status = "SUCCESS"; // SUCCESS, FAILED, PENDING
    
    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "error_message")
    private String errorMessage; // If status is FAILED
}
