package com.javamailer.service;

import com.javamailer.entity.EmailProvider;
import com.javamailer.entity.Campaign;
import com.javamailer.repository.EmailProviderRepository;
import com.javamailer.repository.CampaignRepository;
import com.javamailer.util.EncryptionUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Service class for email provider management
 * Handles SMTP/Gmail/Outlook/Resend configuration and verification
 */
@Service
@RequiredArgsConstructor
@Transactional
public class EmailProviderService {
    
    private final EmailProviderRepository emailProviderRepository;
    private final CampaignRepository campaignRepository;
    private final EmailTestService emailTestService;
    
    /**
     * Create new email provider with encrypted credentials
     * @param userId User ID
     * @param providerType Type of provider (SMTP, RESEND, OUTLOOK)
     * @param displayName Display name for the provider
     * @param fromEmail From email address
     * @param fromName From name
     * @param rawConfig Raw unencrypted config (will be encrypted before storage)
     */
    public EmailProvider createEmailProvider(Long userId, String providerType, String displayName,
                                            String fromEmail, String fromName, Map<String, Object> rawConfig) {
        try {
            // Serialize config to JSON and encrypt it
            ObjectMapper mapper = new ObjectMapper();
            String configJson = mapper.writeValueAsString(rawConfig);
            String encryptedConfig = EncryptionUtil.encrypt(configJson);
            
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
        } catch (Exception e) {
            System.err.println("[ERROR] Failed to create email provider: " + e.getMessage());
            throw new RuntimeException("Failed to create email provider: " + e.getMessage(), e);
        }
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
        // Verify provider exists and belongs to user
        Optional<EmailProvider> provider = emailProviderRepository.findByIdAndUserId(providerId, userId);
        if (!provider.isPresent()) {
            throw new RuntimeException("Email provider not found or you don't have permission to delete it");
        }
        
        // Check if provider is used in any active or running campaigns
        List<Campaign> activeCampaigns = campaignRepository.findByEmailProviderIdAndStatus(providerId, "RUNNING");
        if (!activeCampaigns.isEmpty()) {
            throw new RuntimeException("Cannot delete email provider: it is currently being used in " + activeCampaigns.size() + " active campaign(s). Please stop the campaigns first.");
        }
        
        // Delete the provider
        try {
            emailProviderRepository.delete(provider.get());
            System.out.println("[DEBUG] Email provider deleted successfully - ID: " + providerId + ", Name: " + provider.get().getDisplayName());
        } catch (Exception e) {
            System.err.println("[ERROR] Failed to delete email provider: " + e.getMessage());
            throw new RuntimeException("Failed to delete email provider: " + e.getMessage(), e);
        }
    }
    
    /**
     * Get decrypted configuration for a provider
     * @param provider Email provider with encrypted config
     * @return Decrypted configuration as Map
     */
    public Map<String, Object> getDecryptedConfig(EmailProvider provider) {
        try {
            String encryptedConfig = provider.getEncryptedConfig();
            if (encryptedConfig == null || encryptedConfig.isEmpty()) {
                return new HashMap<>();
            }
            
            String decryptedJson = EncryptionUtil.decrypt(encryptedConfig);
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(decryptedJson, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            System.err.println("[ERROR] Failed to decrypt config for provider " + provider.getId() + ": " + e.getMessage());
            throw new RuntimeException("Failed to decrypt email provider config: " + e.getMessage(), e);
        }
    }
    
    /**
     * Send test email using provider credentials and return verification token
     * Uses EmailTestService to attempt sending via the provider's actual credentials
     * If email sends successfully, returns a verification token
     */
    public String sendTestEmailAndGetToken(Long userId, String providerType, Map<String, Object> config, String toEmail) {
        try {
            // Attempt to send test email using actual provider credentials
            return emailTestService.sendTestEmailAndVerify(providerType, config, toEmail, userId);
        } catch (Exception e) {
            throw new RuntimeException("Test email verification failed: " + e.getMessage());
        }
    }
    
    /**
     * Create verified email provider (after passing verification)
     * Raw config is encrypted before storage
     */
    public EmailProvider createVerifiedEmailProvider(Long userId, String providerType, String displayName,
                                                     String fromEmail, String fromName, Map<String, Object> rawConfig,
                                                     String verificationToken) {
        // In production, verify the token is valid and recent
        if (verificationToken == null || !verificationToken.startsWith("verify_")) {
            throw new RuntimeException("Invalid verification token");
        }
        
        try {
            // Serialize config to JSON and encrypt it
            ObjectMapper mapper = new ObjectMapper();
            String configJson = mapper.writeValueAsString(rawConfig);
            String encryptedConfig = EncryptionUtil.encrypt(configJson);
            
            EmailProvider provider = EmailProvider.builder()
                    .userId(userId)
                    .providerType(providerType)
                    .displayName(displayName)
                    .fromEmail(fromEmail)
                    .fromName(fromName)
                    .encryptedConfig(encryptedConfig)
                    .isActive(true)
                    .isVerified(true)  // Mark as verified since it passed test
                    .verificationAttempts(0)
                    .lastVerifiedAt(LocalDateTime.now())
                    .lastVerificationError(null)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            
            return emailProviderRepository.save(provider);
        } catch (Exception e) {
            System.err.println("[ERROR] Failed to create verified email provider: " + e.getMessage());
            throw new RuntimeException("Failed to create verified email provider: " + e.getMessage(), e);
        }
    }
    
    /**
     * Verify provider credentials by sending a test email
     * @param userId User ID
     * @param providerType Type of provider (smtp, resend, outlook, gmail)
     * @param toEmail Email address to send test email to
     * @param credentials Provider credentials (apiKey for Resend, password for SMTP/Outlook, etc.)
     * @return true if test email sent successfully, false otherwise
     */
    public boolean verifyProviderWithTestEmail(Long userId, String providerType, String toEmail, Map<String, Object> credentials) {
        try {
            // Use the EmailTestService to send a test email
            // The test service will know how to handle each provider type
            String verificationToken = emailTestService.sendTestEmailAndVerify(providerType, credentials, toEmail, userId);
            
            if (verificationToken != null && !verificationToken.isEmpty()) {
                System.out.println("[DEBUG] Verification test email sent successfully to " + toEmail + " via " + providerType);
                return true;
            } else {
                System.out.println("[DEBUG] Verification test email failed for " + toEmail + " via " + providerType);
                return false;
            }
        } catch (Exception e) {
            System.err.println("[ERROR] Provider verification failed: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
}
