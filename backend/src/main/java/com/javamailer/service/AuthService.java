package com.javamailer.service;

import com.javamailer.entity.EmailVerificationToken;
import com.javamailer.entity.PasswordResetToken;
import com.javamailer.entity.User;
import com.javamailer.repository.EmailVerificationTokenRepository;
import com.javamailer.repository.PasswordResetTokenRepository;
import com.javamailer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.Data;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.Random;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service class for authentication and authorization
 * Handles user registration, login, password reset, email verification
 * 
 * CLEAN FLOW: No pending registrations table
 * - Registration: validate + generate OTP → send email
 * - OTP Verification: verify OTP → create user
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
    
    private static final int PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = 5;
    private static final int VERIFICATION_TOKEN_EXPIRY_MINUTES = 5;
    private static final int RESEND_OTP_THROTTLE_SECONDS = 60;
    
    // In-memory storage for pending OTP registrations
    // Key: email, Value: RegistrationOtpData
    private static final ConcurrentHashMap<String, RegistrationOtpData> pendingOtps = new ConcurrentHashMap<>();
    
    /**
     * Data class to hold OTP and registration info temporarily
     */
    @Data
    public static class RegistrationOtpData {
        private String email;
        private String passwordHash;
        private String fullName;
        private String otp;
        private LocalDateTime expiresAt;
        private LocalDateTime lastResendAt;
        
        public RegistrationOtpData(String email, String passwordHash, String fullName, String otp, LocalDateTime expiresAt) {
            this.email = email;
            this.passwordHash = passwordHash;
            this.fullName = fullName;
            this.otp = otp;
            this.expiresAt = expiresAt;
            this.lastResendAt = LocalDateTime.now();
        }
    }
    
    /**
     * Registration Step 1: Validate registration data and send OTP
     * User data stored ONLY in memory, NOT in database
     * Returns email and message to show OTP modal
     */
    public Map<String, String> registerUser(String email, String password, String fullName) {
        // Normalize email
        email = email.toLowerCase().trim();
        
        // Check if email already exists in users table (production users only)
        if (userService.isEmailTaken(email)) {
            throw new RuntimeException("Email already registered: " + email);
        }
        
        // Validate password strength  
        if (!isPasswordStrong(password)) {
            throw new RuntimeException("Password must be at least 8 characters with 1 uppercase letter and 1 number");
        }
        
        // Hash password
        String passwordHash = passwordEncoder.encode(password);
        
        // Generate 6-digit OTP
        String otp = String.format("%06d", new Random().nextInt(1000000));
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(VERIFICATION_TOKEN_EXPIRY_MINUTES);
        
        // Store registration data in memory only
        RegistrationOtpData otpData = new RegistrationOtpData(email, passwordHash, fullName, otp, expiresAt);
        pendingOtps.put(email, otpData);
        
        // Send OTP to user email
        systemEmailService.sendVerificationEmailWithOtp(email, UUID.randomUUID().toString(), otp);
        
        return Map.of(
            "email", email,
            "message", "OTP sent to your email",
            "otp", otp  // For testing - remove in production
        );
    }
    
    /**
     * Registration Step 2: Verify OTP and create user
     * ONLY creates user in database after successful OTP verification
     */
    public Map<String, String> verifyOtpAndCreateUser(String email, String otp) {
        email = email.toLowerCase().trim();
        
        // Check if we have pending OTP for this email
        RegistrationOtpData otpData = pendingOtps.get(email);
        if (otpData == null) {
            throw new RuntimeException("No registration found for this email. Please register again.");
        }
        
        // Check if OTP is expired
        if (LocalDateTime.now().isAfter(otpData.getExpiresAt())) {
            pendingOtps.remove(email);
            throw new RuntimeException("OTP has expired. Please register again.");
        }
        
        // Verify OTP matches
        if (!otpData.getOtp().equals(otp)) {
            throw new RuntimeException("Invalid OTP. Please try again.");
        }
        
        // ✅ OTP VERIFIED - NOW create user in database
        User user = User.builder()
                .email(email)
                .passwordHash(otpData.getPasswordHash())
                .fullName(otpData.getFullName())
                .isEmailVerified(true)
                .emailVerifiedAt(LocalDateTime.now())
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        
        userRepository.save(user);
        
        // Clear from memory - registration complete
        pendingOtps.remove(email);
        
        return Map.of(
            "message", "User created successfully",
            "email", email
        );
    }
    
    /**
     * Resend OTP with 60-second throttle
     */
    public Map<String, String> resendOtp(String email) {
        email = email.toLowerCase().trim();
        
        // Check if we have pending OTP for this email
        RegistrationOtpData otpData = pendingOtps.get(email);
        if (otpData == null) {
            throw new RuntimeException("No registration found for this email. Please register again.");
        }
        
        // Check throttle - 60 seconds between resends
        LocalDateTime timeSinceLastResend = otpData.getLastResendAt();
        if (timeSinceLastResend != null) {
            LocalDateTime nextAllowed = timeSinceLastResend.plusSeconds(RESEND_OTP_THROTTLE_SECONDS);
            if (LocalDateTime.now().isBefore(nextAllowed)) {
                long secondsLeft = java.time.temporal.ChronoUnit.SECONDS.between(LocalDateTime.now(), nextAllowed);
                throw new RuntimeException("Please wait " + secondsLeft + " seconds before requesting a new OTP");
            }
        }
        
        // Generate new OTP
        String newOtp = String.format("%06d", new Random().nextInt(1000000));
        otpData.setOtp(newOtp);
        otpData.setExpiresAt(LocalDateTime.now().plusMinutes(VERIFICATION_TOKEN_EXPIRY_MINUTES));
        otpData.setLastResendAt(LocalDateTime.now());
        
        // Send new OTP
        systemEmailService.sendVerificationEmailWithOtp(email, UUID.randomUUID().toString(), newOtp);
        
        return Map.of(
            "message", "OTP resent to your email",
            "otp", newOtp  // For testing - remove in production
        );
    }
    
    /**
     * Verify email with token (legacy endpoint)
     * Returns true if token is valid, false otherwise
     */
    public boolean verifyEmailToken(String token) {
        try {
            Optional<EmailVerificationToken> verificationToken = emailVerificationTokenRepository.findByToken(token);
            if (verificationToken.isEmpty()) {
                return false;
            }
            
            EmailVerificationToken eToken = verificationToken.get();
            
            // Check if token is expired
            if (LocalDateTime.now().isAfter(eToken.getExpiresAt())) {
                return false;
            }
            
            // Mark as used
            eToken.setIsUsed(true);
            emailVerificationTokenRepository.save(eToken);
            
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Authenticate user (login)
     */
    public User loginUser(String email, String password) {
        // Normalize email
        email = email.toLowerCase().trim();
        
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
     * NOTE: @Transactional(noRollbackFor=Exception.class) allows email errors without rolling back the DB transaction
     */
    @Transactional(noRollbackFor = Exception.class)
    public String requestPasswordReset(String email) {
        // Normalize email
        email = email.toLowerCase().trim();
        
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
        
        // Update user password
        userService.resetPassword(rToken.getUserId(), newPassword);
        
        return true;
    }
    
    /**
     * Resend password reset OTP with throttling (60 seconds)
     */
    @Transactional(noRollbackFor = Exception.class)
    public String resendPasswordResetOtp(String email) {
        // Normalize email
        email = email.toLowerCase().trim();
        
        Optional<User> user = userRepository.findByEmail(email);
        
        if (user.isEmpty()) {
            throw new RuntimeException("User not found with email: " + email);
        }
        
        User u = user.get();
        
        // Check if there's an existing non-used password reset token
        var existingTokens = passwordResetTokenRepository.findByUserIdOrderByCreatedAtDesc(u.getId());
        
        if (!existingTokens.isEmpty()) {
            PasswordResetToken lastToken = existingTokens.get(0);
            
            // Check if token is not expired and not used
            if (!lastToken.getIsUsed() && LocalDateTime.now().isBefore(lastToken.getExpiresAt())) {
                // Check throttling - 60 seconds minimum between resends
                long secondsSinceSent = java.time.temporal.ChronoUnit.SECONDS.between(
                    lastToken.getCreatedAt(), 
                    LocalDateTime.now()
                );
                
                if (secondsSinceSent < RESEND_OTP_THROTTLE_SECONDS) {
                    long secondsToWait = RESEND_OTP_THROTTLE_SECONDS - secondsSinceSent;
                    throw new RuntimeException("Please wait " + secondsToWait + " seconds before requesting a new OTP");
                }
            }
        }
        
        // Generate new OTP
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
        
        // Send OTP via email
        try {
            systemEmailService.sendOtpEmail(u.getEmail(), otp);
        } catch (Exception e) {
            System.err.println("Failed to send password reset OTP email: " + e.getMessage());
        }
        
        return savedToken.getToken();
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
