package com.javamailer.service;

import com.javamailer.entity.User;
import com.javamailer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Service class for user management operations
 * Handles user CRUD, profile updates, and password management
 */
@Service
@RequiredArgsConstructor
@Transactional
public class UserService {
    
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    
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
     * Foreign key constraints with ON DELETE CASCADE will remove:
     * - All campaigns
     * - All email providers
     * - All CSV uploads
     * - All email verification tokens
     * - All password reset tokens
     * - Any other user-related data
     */
    public void deleteUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("User not found: " + userId);
        }
        userRepository.deleteById(userId);
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
}
