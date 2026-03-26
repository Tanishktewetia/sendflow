package com.javamailer.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * PendingRegistration entity - stores temporary registration data
 * User data is held here until OTP verification succeeds
 * After OTP verification, data is moved to Users table and this record is deleted
 */
@Entity
@Table(name = "pending_registrations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class PendingRegistration {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false, length = 255)
    private String email;
    
    @Column(nullable = false, length = 255)
    private String passwordHash;
    
    @Column(length = 255)
    private String fullName;
    
    @Column(nullable = false, length = 255)
    private String verificationToken;
    
    @Column(nullable = false, length = 6)
    private String otp;
    
    @Column(nullable = false)
    private LocalDateTime expiresAt;
    
    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean isVerified = false;
    
    @Column
    private LocalDateTime verifiedAt;
}
