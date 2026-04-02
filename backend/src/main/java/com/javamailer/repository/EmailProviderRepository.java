package com.javamailer.repository;

import com.javamailer.entity.EmailProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for EmailProvider entity
 * Provides CRUD operations and custom queries for email provider data access
 */
@Repository
public interface EmailProviderRepository extends JpaRepository<EmailProvider, Long> {
    
    /**
     * Find all providers for a user
     */
    List<EmailProvider> findByUserId(Long userId);
    
    /**
     * Find active providers for a user
     */
    List<EmailProvider> findByUserIdAndIsActiveTrue(Long userId);
    
    /**
     * Find provider by ID and user ID (security: can't access other users' providers)
     */
    Optional<EmailProvider> findByIdAndUserId(Long id, Long userId);
    
    /**
     * Find provider by user and type (one per type per user)
     */
    Optional<EmailProvider> findByUserIdAndProviderType(Long userId, String providerType);
    
    /**
     * Find verified providers for a user
     */
    List<EmailProvider> findByUserIdAndIsVerifiedTrue(Long userId);
    
    /**
     * Find unverified providers requiring attention
     */
    List<EmailProvider> findByUserIdAndIsVerifiedFalse(Long userId);

    long deleteByUserId(Long userId);
    
    /**
     * Get default provider for user (most recently verified)
     */
    Optional<EmailProvider> findTopByUserIdAndIsActiveTrueOrderByLastVerifiedAtDesc(Long userId);
}
