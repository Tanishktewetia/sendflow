package com.javamailer.repository;

import com.javamailer.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for PasswordResetToken entity
 * Provides CRUD operations and custom queries for password reset tokens
 */
@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    
    /**
     * Find token by token string (unique)
     */
    Optional<PasswordResetToken> findByToken(String token);
    
    /**
     * Find token by OTP (6-digit code sent to email)
     */
    Optional<PasswordResetToken> findByOtp(String otp);
    
    /**
     * Find unused token for a user
     */
    Optional<PasswordResetToken> findByUserIdAndIsUsedFalse(Long userId);
    
    /**
     * Find the most recent tokens for a user (for throttle checking in resend)
     * Orders by createdAt descending to get the latest token first
     */
    List<PasswordResetToken> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    /**
     * Find token by token and validate it's unused and not expired
     */
    Optional<PasswordResetToken> findByTokenAndIsUsedFalseAndExpiresAtAfter(String token, LocalDateTime now);
    
    /**
     * Find token by OTP and validate it's unused and not expired
     */
    Optional<PasswordResetToken> findByOtpAndIsUsedFalseAndExpiresAtAfter(String otp, LocalDateTime now);

    long deleteByUserId(Long userId);
    
    /**
     * Find expired tokens (for cleanup)
     */
    List<PasswordResetToken> findByExpiresAtBefore(LocalDateTime now);
    
    /**
     * Delete expired tokens
     */
    void deleteByExpiresAtBefore(LocalDateTime now);
}
