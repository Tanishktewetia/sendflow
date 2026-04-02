package com.javamailer.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * User entity representing a SendFlow user account
 * Maps to 'users' table in PostgreSQL
 */
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false, length = 255)
    private String email;
    
    @Column(nullable = false, length = 255)
    private String passwordHash;
    
    @Column(length = 255)
    private String fullName;
    
    // Avatar file storage
    @Column(name = "avatar_file_name", length = 255)
    private String avatarFileName;
    
    @Column(name = "avatar_file_size")
    private Long avatarFileSize;
    
    @Column(name = "avatar_mime_type", length = 100)
    private String avatarMimeType;
    
    @Column(name = "avatar_storage_path", length = 500)
    private String avatarStoragePath;
    
    @Column(name = "default_email_provider_id")
    private Long defaultEmailProviderId;
    
    @Column(name = "email_selection_preference", length = 50)
    @Builder.Default
    private String emailSelectionPreference = "default";
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean isEmailVerified = false;
    
    @Column(name = "email_verified_at")
    private LocalDateTime emailVerifiedAt;
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(nullable = false)
    private LocalDateTime updatedAt;
    
    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;
    
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
