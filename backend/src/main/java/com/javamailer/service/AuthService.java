package com.javamailer.service;

import com.javamailer.entity.EmailVerificationToken;
import com.javamailer.entity.PasswordResetToken;
import com.javamailer.entity.User;
import com.javamailer.repository.EmailVerificationTokenRepository;
import com.javamailer.repository.PasswordResetTokenRepository;
import com.javamailer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.Random;

/**
 * Service class for authentication and authorization
 * Handles user registration, login, password reset, email verification
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {
    
    private final UserRepository userRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final UserService userService;
    private final EmailService emailService;
    private final SystemEmailService systemEmailService;
    
    private static final int PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = 60;
    private static final int VERIFICATION_TOKEN_EXPIRY_MINUTES = 24 * 60; // 24 hours
    
    /**
     * Register new user (step 1: create account)
     */
    public User registerUser(String email, String password, String fullName) {
        // Check if email already exists
        if (userService.isEmailTaken(email)) {
            throw new RuntimeException("Email already registered: " + email);
        }
        
        // Validate password strength (min 8 chars, 1 uppercase, 1 number)
        if (!isPasswordStrong(password)) {
            throw new RuntimeException("Password must be at least 8 characters with 1 uppercase letter and 1 number");
        }
        
        // Create user
        User user = userService.createUser(email, password, fullName);
        user.setIsEmailVerified(false);
        
        return userRepository.save(user);
    }
    
    /**
     * Generate email verification token
     */
    public EmailVerificationToken generateEmailVerificationToken(User user) {
        String token = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(VERIFICATION_TOKEN_EXPIRY_MINUTES);
        
        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .userId(user.getId())
                .token(token)
                .expiresAt(expiresAt)
                .isUsed(false)
                .build();
        
        return emailVerificationTokenRepository.save(verificationToken);
    }
    
    /**
     * Verify email token and mark user as verified
     */
    public boolean verifyEmailToken(String token) {
        Optional<EmailVerificationToken> verificationToken = emailVerificationTokenRepository.findByToken(token);
        
        if (verificationToken.isEmpty()) {
            return false;
        }
        
        EmailVerificationToken vToken = verificationToken.get();
        
        // Check if token is already used
        if (vToken.getIsUsed()) {
            return false;
        }
        
        // Check if token is expired
        if (LocalDateTime.now().isAfter(vToken.getExpiresAt())) {
            return false;
        }
        
        // Mark token as used
        vToken.setIsUsed(true);
        vToken.setUsedAt(LocalDateTime.now());
        emailVerificationTokenRepository.save(vToken);
        
        // Mark user as verified
            Optional<User> user = userRepository.findById(vToken.getUserId());
            if (user.isPresent()) {
                User u = user.get();
                u.setIsEmailVerified(true);
                u.setEmailVerifiedAt(LocalDateTime.now());
                u.setUpdatedAt(LocalDateTime.now());
                userRepository.save(u);
                return true;
            }
        }
        return false;
    }
    
    /**
     * Authenticate user (login)
     */
    public User loginUser(String email, String password) {
        Optional<User> user = userService.getActiveUserByEmail(email);
        
        if (user.isEmpty()) {
            throw new RuntimeException("Invalid email or password");
        }
        
        User u = user.get();
        
        if (!u.getIsEmailVerified()) {
            throw new RuntimeException("Email not verified. Please check your email.");
        }
        
        // Verify password
        if (!userService.verifyPassword(password, u.getPasswordHash())) {
            throw new RuntimeException("Invalid email or password");
        }
        
        // Update last login
        userService.updateLastLogin(u.getId());
        
        return u;
    }
    
    /**
     * Request password reset (generates OTP)
     */
    public String requestPasswordReset(String email) {
        Optional<User> user = userRepository.findByEmail(email);
        
        if (user.isEmpty()) {
            throw new RuntimeException("User not found with email: " + email);
        }
        
        User u = user.get();
        String otp = generateOtp();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(PASSWORD_RESET_TOKEN_EXPIRY_MINUTES);
        
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .userId(u.getId())
                .token(UUID.randomUUID().toString())
                .otp(otp)
                .expiresAt(expiresAt)
                .isUsed(false)
                .build();
        
        PasswordResetToken savedToken = passwordResetTokenRepository.save(resetToken);
        
        // Send OTP via Resend email service
        try {
            systemEmailService.sendOtpEmail(u.getEmail(), otp);
        } catch (Exception e) {
            // Log error but don't fail the request
            System.err.println("Failed to send password reset OTP email: " + e.getMessage());
        }
        
        return savedToken.getToken();
    }
    
    /**
     * Reset password with OTP verification
     */
    public boolean resetPassword(String token, String otp, String newPassword) {
        Optional<PasswordResetToken> resetToken = passwordResetTokenRepository.findByToken(token);
        
        if (resetToken.isEmpty()) {
            throw new RuntimeException("Invalid password reset token");
        }
        
        PasswordResetToken rToken = resetToken.get();
        
        // Check if token is already used
        if (rToken.getIsUsed()) {
            throw new RuntimeException("Password reset token already used");
        }
        
        // Check if token is expired
        if (LocalDateTime.now().isAfter(rToken.getExpiresAt())) {
            throw new RuntimeException("Password reset token has expired");
        }
        
        // Verify OTP
        if (!rToken.getOtp().equals(otp)) {
            throw new RuntimeException("Invalid OTP");
        }
        
        // Validate new password
        if (!isPasswordStrong(newPassword)) {
            throw new RuntimeException("Password must be at least 8 characters with 1 uppercase letter and 1 number");
        }
        
        // Mark token as used
        rToken.setIsUsed(true);
        rToken.setUsedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(rToken);
        
        // Update user password (without old password verification)
        userService.resetPassword(rToken.getUserId(), newPassword);
        
        return true;
    }
    
    /**
     * Validate password strength
     */
    private boolean isPasswordStrong(String password) {
        if (password == null || password.length() < 8) {
            return false;
        }
        
        boolean hasUppercase = password.matches(".*[A-Z].*");
        boolean hasNumber = password.matches(".*[0-9].*");
        
        return hasUppercase && hasNumber;
    }
    
    /**
     * Generate 6-digit OTP
     */
    private String generateOtp() {
        Random random = new Random();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }


}
