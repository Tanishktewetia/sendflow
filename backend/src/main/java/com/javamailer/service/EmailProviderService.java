package com.javamailer.service;

import com.javamailer.entity.EmailProvider;
import com.javamailer.repository.EmailProviderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Service class for email provider management
 * Handles SMTP/Gmail/Outlook/Resend configuration and verification
 */
@Service
@RequiredArgsConstructor
@Transactional
public class EmailProviderService {
    
    private final EmailProviderRepository emailProviderRepository;
    
    /**
     * Create new email provider
     * Note: encryptedConfig should be encrypted before passing
     */
    public EmailProvider createEmailProvider(Long userId, String providerType, String displayName,
                                            String fromEmail, String fromName, String encryptedConfig) {
        EmailProvider provider = EmailProvider.builder()
                .userId(userId)
                .providerType(providerType)
                .displayName(displayName)
                .fromEmail(fromEmail)
                .fromName(fromName)
                .encryptedConfig(encryptedConfig)
                .isActive(true)
                .isVerified(false)
                .verificationAttempts(0)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        
        return emailProviderRepository.save(provider);
    }
    
    /**
     * Get provider by ID (security: verify ownership)
     */
    public Optional<EmailProvider> getProviderByIdAndUserId(Long providerId, Long userId) {
        return emailProviderRepository.findByIdAndUserId(providerId, userId);
    }
    
    /**
     * Get all providers for a user
     */
    public List<EmailProvider> getUserProviders(Long userId) {
        return emailProviderRepository.findByUserId(userId);
    }
    
    /**
     * Get active providers for a user
     */
    public List<EmailProvider> getActiveUserProviders(Long userId) {
        return emailProviderRepository.findByUserIdAndIsActiveTrue(userId);
    }
    
    /**
     * Get verified providers (ready to send)
     */
    public List<EmailProvider> getVerifiedProviders(Long userId) {
        return emailProviderRepository.findByUserIdAndIsVerifiedTrue(userId);
    }
    
    /**
     * Get provider by type for user (one per type)
     */
    public Optional<EmailProvider> getProviderByType(Long userId, String providerType) {
        return emailProviderRepository.findByUserIdAndProviderType(userId, providerType);
    }
    
    /**
     * Get default provider (most recently verified)
     */
    public Optional<EmailProvider> getDefaultProvider(Long userId) {
        return emailProviderRepository.findTopByUserIdAndIsActiveTrueOrderByLastVerifiedAtDesc(userId);
    }
    
    /**
     * Update provider configuration
     */
    public EmailProvider updateProvider(Long providerId, Long userId, String displayName, String encryptedConfig) {
        Optional<EmailProvider> provider = emailProviderRepository.findByIdAndUserId(providerId, userId);
        if (provider.isPresent()) {
            EmailProvider p = provider.get();
            p.setDisplayName(displayName);
            p.setEncryptedConfig(encryptedConfig);
            p.setUpdatedAt(LocalDateTime.now());
            return emailProviderRepository.save(p);
        }
        throw new RuntimeException("Email provider not found: " + providerId);
    }
    
    /**
     * Mark provider as verified (test email sent successfully)
     */
    public EmailProvider verifyProvider(Long providerId, Long userId) {
        Optional<EmailProvider> provider = emailProviderRepository.findByIdAndUserId(providerId, userId);
        if (provider.isPresent()) {
            EmailProvider p = provider.get();
            p.setIsVerified(true);
            p.setLastVerifiedAt(LocalDateTime.now());
            p.setVerificationAttempts(0);
            p.setLastVerificationError(null);
            p.setUpdatedAt(LocalDateTime.now());
            return emailProviderRepository.save(p);
        }
        throw new RuntimeException("Email provider not found: " + providerId);
    }
    
    /**
     * Record verification failure
     */
    public EmailProvider recordVerificationFailure(Long providerId, Long userId, String errorMessage) {
        Optional<EmailProvider> provider = emailProviderRepository.findByIdAndUserId(providerId, userId);
        if (provider.isPresent()) {
            EmailProvider p = provider.get();
            p.setVerificationAttempts(p.getVerificationAttempts() + 1);
            p.setLastVerificationError(errorMessage);
            p.setUpdatedAt(LocalDateTime.now());
            return emailProviderRepository.save(p);
        }
        throw new RuntimeException("Email provider not found: " + providerId);
    }
    
    /**
     * Deactivate provider
     */
    public void deactivateProvider(Long providerId, Long userId) {
        Optional<EmailProvider> provider = emailProviderRepository.findByIdAndUserId(providerId, userId);
        if (provider.isPresent()) {
            EmailProvider p = provider.get();
            p.setIsActive(false);
            p.setUpdatedAt(LocalDateTime.now());
            emailProviderRepository.save(p);
        }
    }
    
    /**
     * Delete provider (only if not used in active campaigns)
     */
    public void deleteProvider(Long providerId, Long userId) {
        Optional<EmailProvider> provider = emailProviderRepository.findByIdAndUserId(providerId, userId);
        if (provider.isPresent()) {
            emailProviderRepository.delete(provider.get());
        } else {
            throw new RuntimeException("Email provider not found: " + providerId);
        }
    }
}
