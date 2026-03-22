package com.javamailer.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * EmailProvider entity for storing SMTP/Gmail/Outlook/Resend credentials
 * Maps to 'email_providers' table in PostgreSQL
 * Note: encrypted_config stores AES-256 encrypted JSON with credentials
 */
@Entity
@Table(name = "email_providers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class EmailProvider {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "provider_type", nullable = false, length = 50)
    private String providerType; // SMTP, GMAIL, OUTLOOK, RESEND
    
    @Column(name = "display_name", length = 255)
    private String displayName;
    
    @Column(name = "from_email", nullable = false, length = 255)
    private String fromEmail;
    
    @Column(name = "from_name", length = 255)
    private String fromName;
    
    @Column(name = "encrypted_config", nullable = false, columnDefinition = "TEXT")
    private String encryptedConfig; // AES-256 encrypted JSON
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean isVerified = false;
    
    @Column(name = "verification_attempts")
    @Builder.Default
    private Integer verificationAttempts = 0;
    
    @Column(name = "last_verified_at")
    private LocalDateTime lastVerifiedAt;
    
    @Column(name = "last_verification_error", columnDefinition = "TEXT")
    private String lastVerificationError;
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(nullable = false)
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
