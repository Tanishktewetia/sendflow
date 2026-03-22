package com.javamailer.repository;

import com.javamailer.entity.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Spring Data JPA repository for EmailVerificationToken entity
 * Provides CRUD operations and custom queries for email verification tokens
 */
@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {
    
    /**
     * Find token by token string (unique)
     */
    Optional<EmailVerificationToken> findByToken(String token);
    
    /**
     * Find unused token for a user
     */
    Optional<EmailVerificationToken> findByUserIdAndIsUsedFalse(Long userId);
    
    /**
     * Find expired tokens (for cleanup)
     */
    java.util.List<EmailVerificationToken> findByExpiresAtBefore(LocalDateTime now);
    
    /**
     * Check if token exists and is valid
     */
    Optional<EmailVerificationToken> findByTokenAndIsUsedFalseAndExpiresAtAfter(String token, LocalDateTime now);
    
    /**
     * Delete expired tokens
     */
    void deleteByExpiresAtBefore(LocalDateTime now);
}
