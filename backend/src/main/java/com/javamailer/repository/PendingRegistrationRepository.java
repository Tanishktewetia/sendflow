package com.javamailer.repository;

import com.javamailer.entity.PendingRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for PendingRegistration entity
 */
@Repository
public interface PendingRegistrationRepository extends JpaRepository<PendingRegistration, Long> {
    
    /**
     * Find pending registration by verification token
     */
    Optional<PendingRegistration> findByVerificationToken(String verificationToken);
    
    /**
     * Find pending registration by email
     */
    Optional<PendingRegistration> findByEmail(String email);
    
    /**
     * Delete pending registration by email
     * Used to clear old pending registrations when user re-registers
     */
    void deleteByEmail(String email);
    
    /**
     * Find all expired pending registrations
     */
    @Query("SELECT p FROM PendingRegistration p WHERE p.expiresAt < CURRENT_TIMESTAMP")
    List<PendingRegistration> findExpiredRegistrations();
    
    /**
     * Find unverified pending registrations created before a certain time
     */
    @Query("SELECT p FROM PendingRegistration p WHERE p.isVerified = false AND p.createdAt < :beforeTime")
    List<PendingRegistration> findUnverifiedBefore(LocalDateTime beforeTime);
}
