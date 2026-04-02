package com.javamailer.service;

import com.javamailer.entity.User;
import com.javamailer.entity.Campaign;
import com.javamailer.entity.CsvUpload;
import com.javamailer.repository.ActivityLogRepository;
import com.javamailer.repository.AuditLogRepository;
import com.javamailer.repository.CampaignQueueRepository;
import com.javamailer.repository.CampaignRecipientRepository;
import com.javamailer.repository.CampaignRepository;
import com.javamailer.repository.CampaignRuntimeEventRepository;
import com.javamailer.repository.CampaignStatsDailyRepository;
import com.javamailer.repository.CampaignStatsYearlyRepository;
import com.javamailer.repository.CsvUploadRepository;
import com.javamailer.repository.EmailLogRepository;
import com.javamailer.repository.EmailProviderRepository;
import com.javamailer.repository.EmailVerificationTokenRepository;
import com.javamailer.repository.PasswordResetTokenRepository;
import com.javamailer.repository.PendingRegistrationRepository;
import com.javamailer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Service class for user management operations
 * Handles user CRUD, profile updates, and password management
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class UserService {
    
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final SupabaseStorageService supabaseStorageService;
    private final CampaignRepository campaignRepository;
    private final CampaignRecipientRepository campaignRecipientRepository;
    private final EmailLogRepository emailLogRepository;
    private final CampaignQueueRepository campaignQueueRepository;
    private final CampaignRuntimeEventRepository campaignRuntimeEventRepository;
    private final CampaignStatsDailyRepository campaignStatsDailyRepository;
    private final CampaignStatsYearlyRepository campaignStatsYearlyRepository;
    private final EmailProviderRepository emailProviderRepository;
    private final CsvUploadRepository csvUploadRepository;
    private final ActivityLogRepository activityLogRepository;
    private final AuditLogRepository auditLogRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PendingRegistrationRepository pendingRegistrationRepository;
    
    /**
     * Create new user with encrypted password
     */
    public User createUser(String email, String password, String fullName) {
        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .fullName(fullName)
                .isActive(true)
                .isEmailVerified(false)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        
        return userRepository.save(user);
    }
    
    /**
     * Get user by email
     */
    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }
    
    /**
     * Get active user by email (for login)
     */
    public Optional<User> getActiveUserByEmail(String email) {
        return userRepository.findByEmailAndIsActiveTrue(email);
    }
    
    /**
     * Get user by ID
     */
    public Optional<User> getUserById(Long userId) {
        return userRepository.findById(userId);
    }
    
    /**
     * Check if email is already taken
     */
    public boolean isEmailTaken(String email) {
        return userRepository.existsByEmail(email);
    }
    
    /**
     * Verify user's email (after clicking verification link)
     */
    public void verifyUserEmail(Long userId) {
        Optional<User> user = userRepository.findById(userId);
        if (user.isPresent()) {
            User u = user.get();
            u.setIsEmailVerified(true);
            u.setEmailVerifiedAt(LocalDateTime.now());
            userRepository.save(u);
        }
    }
    
    /**
     * Update user profile
     */
    public User updateUserProfile(Long userId, String fullName, String displayName) {
        Optional<User> user = userRepository.findById(userId);
        if (user.isPresent()) {
            User u = user.get();
            u.setFullName(fullName);
            u.setUpdatedAt(LocalDateTime.now());
            return userRepository.save(u);
        }
        throw new RuntimeException("User not found: " + userId);
    }
    
    /**
     * Update user avatar
     */
    public User updateUserAvatar(Long userId, String fileName, Long fileSize, String mimeType, String storagePath) {
        Optional<User> user = userRepository.findById(userId);
        if (user.isPresent()) {
            User u = user.get();
            u.setAvatarFileName(fileName);
            u.setAvatarFileSize(fileSize);
            u.setAvatarMimeType(mimeType);
            u.setAvatarStoragePath(storagePath);
            u.setUpdatedAt(LocalDateTime.now());
            return userRepository.save(u);
        }
        throw new RuntimeException("User not found: " + userId);
    }
    
    /**
     * Update user password
     */
    public void updatePassword(Long userId, String oldPassword, String newPassword) {
        Optional<User> user = userRepository.findById(userId);
        if (user.isPresent()) {
            User u = user.get();
            // Verify old password
            if (!passwordEncoder.matches(oldPassword, u.getPasswordHash())) {
                throw new RuntimeException("Old password is incorrect");
            }
            // Set new password
            u.setPasswordHash(passwordEncoder.encode(newPassword));
            u.setUpdatedAt(LocalDateTime.now());
            userRepository.save(u);
        } else {
            throw new RuntimeException("User not found: " + userId);
        }
    }
    
    /**
     * Reset password (without old password verification)
     */
    public void resetPassword(Long userId, String newPassword) {
        Optional<User> user = userRepository.findById(userId);
        if (user.isPresent()) {
            User u = user.get();
            u.setPasswordHash(passwordEncoder.encode(newPassword));
            u.setUpdatedAt(LocalDateTime.now());
            userRepository.save(u);
        } else {
            throw new RuntimeException("User not found: " + userId);
        }
    }
    
    /**
     * Update last login timestamp
     */
    public void updateLastLogin(Long userId) {
        Optional<User> user = userRepository.findById(userId);
        if (user.isPresent()) {
            User u = user.get();
            u.setLastLoginAt(LocalDateTime.now());
            userRepository.save(u);
        }
    }
    
    /**
     * Deactivate user account
     */
    public void deactivateUser(Long userId) {
        Optional<User> user = userRepository.findById(userId);
        if (user.isPresent()) {
            User u = user.get();
            u.setIsActive(false);
            u.setUpdatedAt(LocalDateTime.now());
            userRepository.save(u);
        }
    }

    /**
     * Permanently delete user account and all related data
     * Explicitly removes user-owned storage objects and every user-owned row across the app.
     */
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        String email = user.getEmail();

        if (user.getAvatarStoragePath() != null && !user.getAvatarStoragePath().isBlank()) {
            try {
                supabaseStorageService.deleteAvatarFile(user.getAvatarStoragePath());
            } catch (Exception ex) {
                log.warn("Failed to delete avatar file for user {}: {}", userId, ex.getMessage());
            }
        }

        List<CsvUpload> uploads = csvUploadRepository.findByUserIdOrderByUploadedAtDesc(userId);
        for (CsvUpload upload : uploads) {
            if (upload.getFileStoragePath() != null && !upload.getFileStoragePath().isBlank()) {
                try {
                    supabaseStorageService.deleteCsvFile(upload.getFileStoragePath());
                } catch (Exception ex) {
                    log.warn("Failed to delete CSV file {} for user {}: {}", upload.getFileStoragePath(), userId, ex.getMessage());
                }
            }
        }

        List<Campaign> campaigns = campaignRepository.findByUserIdOrderByCreatedAtDesc(userId);
        for (Campaign campaign : campaigns) {
            Long campaignId = campaign.getId();
            campaignRecipientRepository.deleteByCampaignId(campaignId);
            emailLogRepository.deleteByCampaignId(campaignId);
            campaignQueueRepository.deleteByCampaignId(campaignId);
        }

        campaignStatsDailyRepository.deleteByUserId(userId);
        campaignStatsYearlyRepository.deleteByUserId(userId);
        campaignRuntimeEventRepository.deleteByUserId(userId);
        activityLogRepository.deleteByUserId(userId);
        auditLogRepository.deleteByUserId(userId);
        emailProviderRepository.deleteByUserId(userId);
        csvUploadRepository.deleteByUserId(userId);
        campaignQueueRepository.deleteByUserId(userId);
        campaignRepository.deleteByUserId(userId);
        emailVerificationTokenRepository.deleteByUserId(userId);
        passwordResetTokenRepository.deleteByUserId(userId);
        pendingRegistrationRepository.deleteByEmail(email);

        userRepository.delete(user);
    }
    
    /**
     * Verify password (for login)
     */
    public boolean verifyPassword(String rawPassword, String hashedPassword) {
        return passwordEncoder.matches(rawPassword, hashedPassword);
    }

    /**
     * Clear user avatar metadata
     */
    public void clearUserAvatar(Long userId) {
        Optional<User> user = userRepository.findById(userId);
        if (user.isPresent()) {
            User u = user.get();
            u.setAvatarFileName(null);
            u.setAvatarFileSize(null);
            u.setAvatarMimeType(null);
            u.setAvatarStoragePath(null);
            u.setUpdatedAt(LocalDateTime.now());
            userRepository.save(u);
        } else {
            throw new RuntimeException("User not found: " + userId);
        }
    }

    /**
     * Set user's default email provider
     */
    public void setDefaultEmailProvider(Long userId, Long providerId) {
        Optional<User> user = userRepository.findById(userId);
        if (user.isPresent()) {
            User u = user.get();
            u.setDefaultEmailProviderId(providerId);
            u.setUpdatedAt(LocalDateTime.now());
            userRepository.save(u);
            System.out.println("[DEBUG] Default email provider set to " + providerId + " for user " + userId);
        } else {
            throw new RuntimeException("User not found: " + userId);
        }
    }

    /**
     * Get user's default email provider ID
     */
    public Long getDefaultEmailProviderId(Long userId) {
        Optional<User> user = userRepository.findById(userId);
        if (user.isPresent()) {
            Long defaultProviderId = user.get().getDefaultEmailProviderId();
            System.out.println("[DEBUG] Retrieved default email provider for user " + userId + ": " + defaultProviderId);
            return defaultProviderId;
        }
        throw new RuntimeException("User not found: " + userId);
    }

    /**
     * Set user's email selection preference
     * @param userId User ID
     * @param preference "default" or "prompt"
     */
    public void setEmailSelectionPreference(Long userId, String preference) {
        if (!preference.equals("default") && !preference.equals("prompt")) {
            throw new IllegalArgumentException("Invalid preference. Must be 'default' or 'prompt'");
        }
        Optional<User> user = userRepository.findById(userId);
        if (user.isPresent()) {
            User u = user.get();
            u.setEmailSelectionPreference(preference);
            u.setUpdatedAt(LocalDateTime.now());
            userRepository.save(u);
            System.out.println("[DEBUG] Email selection preference set to " + preference + " for user " + userId);
        } else {
            throw new RuntimeException("User not found: " + userId);
        }
    }

    /**
     * Get user's email selection preference
     * @param userId User ID
     * @return "default" or "prompt"
     */
    public String getEmailSelectionPreference(Long userId) {
        Optional<User> user = userRepository.findById(userId);
        if (user.isPresent()) {
            String preference = user.get().getEmailSelectionPreference();
            System.out.println("[DEBUG] Retrieved email selection preference for user " + userId + ": " + preference);
            return preference != null ? preference : "default";
        }
        throw new RuntimeException("User not found: " + userId);
    }
}
