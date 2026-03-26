/**
 * Authentication Logic - PHASE 10: Backend Integration
 * Handles user registration, email verification, login, and password reset
 * Communicates with Spring Boot backend at localhost:8080/api
 */

// Registration state for multi-step process
let registrationState = {
    email: null,
    password: null,
    fullName: null,
    resetToken: null
};

// Track if registration is pending (OTP modal open)
let isRegistrationPending = false;

// Password reset state
let passwordResetState = {
    email: null,
    verificationToken: null,
    currentStep: 1 // Step 1: email, Step 2: OTP, Step 3: new password
};

/**
 * Toggle between login and register forms
 */
function toggleForms() {
    document.getElementById('loginForm').classList.toggle('active');
    document.getElementById('registerForm').classList.toggle('active');
}

/**
 * Initialize event listeners on page load
 */
document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    if (isAuthenticated()) {
        // Add small delay to ensure token is properly stored before navigation
        setTimeout(() => {
            window.location.href = 'app.html';
        }, 100);
        return; // Stop further initialization
    }

    // Login form handler
    if (document.getElementById('loginForm')) {
        document.getElementById('loginForm').addEventListener('submit', handleLogin);
    }

    // Register form handler
    if (document.getElementById('registerForm')) {
        document.getElementById('registerForm').addEventListener('submit', handleRegister);
    }

    // OTP form handler
    if (document.getElementById('otpForm')) {
        document.getElementById('otpForm').addEventListener('submit', handleOtpSubmit);
    }
});

/**
 * ============================================================================
 * USER LOGIN
 * ============================================================================
 */

/**
 * Handle user login - CALLS BACKEND API
 * POST /api/auth/login
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.querySelector('#loginForm input[type="email"]').value.toLowerCase().trim();
    const password = document.querySelector('#loginForm input[type="password"]').value;

    // Validation
    if (!email || !password) {
        showNotification('❌ Please enter email and password', 'error', 3000);
        return;
    }

    try {
        showNotification('⏳ Authenticating...', 'info', 0);

        // Call backend login endpoint
        const response = await apiCall(API_ENDPOINTS.AUTH_LOGIN, {
            method: 'POST',
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        // Store JWT tokens
        storeJwtTokens(response.token, response.refreshToken);

        // Store user data for easy access
        storeUserData({
            id: response.userId,
            email: response.email,
            fullName: response.fullName
        });

        clearAllNotifications();
        showNotification('✅ Login successful! Redirecting...', 'success', 1500);

        // Redirect to dashboard after short delay
        // Ensure tokens are stored in localStorage before navigation
        setTimeout(() => {
            // Double-check tokens are stored before navigating
            if (isAuthenticated()) {
                window.location.href = 'app.html';
            } else {
                console.warn('Tokens not properly stored. Trying again...');
                setTimeout(() => {
                    if (isAuthenticated()) {
                        window.location.href = 'app.html';
                    } else {
                        showNotification('⚠️ Login error: Could not store session. Please try again.', 'error');
                    }
                }, 500);
            }
        }, 1500);

    } catch (error) {
        console.error('Login error:', error);
        showNotification(`❌ ${error.message || 'Login failed. Please check your credentials.'}`, 'error');
    }
}

/**
 * ============================================================================
 * USER REGISTRATION
 * ============================================================================
 */

/**
 * Handle user registration - CALLS BACKEND API
 * POST /api/auth/register
 */
async function handleRegister(e) {
    e.preventDefault();
    
    // IMPORTANT: If registration is already pending (OTP modal open),
    // don't send a new registration request - just reopen the modal
    if (isRegistrationPending && registrationState.email) {
        showOtpModal();
        showNotification(`✅ OTP modal reopened for ${registrationState.email}`, 'info', 3000);
        return;
    }
    
    const inputs = document.querySelectorAll('#registerForm input');
    const fullName = inputs[0].value.trim();
    const email = inputs[1].value.trim().toLowerCase();
    const password = inputs[2].value;
    const confirmPassword = inputs[3].value;

    // ============================================================
    // COMPREHENSIVE INPUT VALIDATION
    // ============================================================

    // Check all fields filled
    if (!fullName || !email || !password || !confirmPassword) {
        showNotification('❌ Please fill in all required fields', 'error', 4000);
        return;
    }

    // Validate full name (at least 2 characters)
    if (fullName.length < 2) {
        showNotification('❌ Full name must be at least 2 characters', 'error', 4000);
        return;
    }

    // Valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('❌ Please enter a valid email address', 'error', 4000);
        return;
    }

    // Password must be at least 8 characters
    if (password.length < 8) {
        showNotification('❌ Password must be at least 8 characters long', 'error', 4000);
        return;
    }

    // Password must contain uppercase, lowercase, and number
    if (!/[A-Z]/.test(password)) {
        showNotification('❌ Password must contain at least one uppercase letter', 'error', 4000);
        return;
    }
    if (!/[a-z]/.test(password)) {
        showNotification('❌ Password must contain at least one lowercase letter', 'error', 4000);
        return;
    }
    if (!/[0-9]/.test(password)) {
        showNotification('❌ Password must contain at least one number', 'error', 4000);
        return;
    }

    // Passwords must match
    if (password !== confirmPassword) {
        showNotification('❌ Passwords do not match', 'error', 4000);
        // Focus on confirm password field
        inputs[3].focus();
        return;
    }

    // Email cannot be the same as password
    if (email === password.toLowerCase()) {
        showNotification('❌ Email cannot be the same as your password', 'error', 4000);
        return;
    }

    // Password cannot contain email
    if (password.toLowerCase().includes(email)) {
        showNotification('❌ Password cannot contain your email address', 'error', 4000);
        return;
    }

    try {
        showNotification('⏳ Creating account...', 'info', 0);

        // Call backend registration endpoint
        const response = await apiCall(API_ENDPOINTS.AUTH_REGISTER, {
            method: 'POST',
            body: JSON.stringify({
                email: email,
                password: password,
                fullName: fullName
            })
        });

        // Clear any previous notifications
        clearAllNotifications();

        // Store registration state for OTP verification
        registrationState = {
            email: email,
            password: password,
            fullName: fullName,
            userId: response.userId
        };

        // Mark registration as pending (OTP modal is open)
        isRegistrationPending = true;

        // Show OTP modal for email verification
        showOtpModal();

        showNotification(`✅ Verification email sent to ${email}`, 'success', 5000);

    } catch (error) {
        console.error('Registration error:', error);
        // Clear loading notification and show error
        clearAllNotifications();
        
        // Check if error is "email already registered"
        if (error.message && error.message.includes('already registered')) {
            showNotification('❌ Email is already registered. Please login or use a different email.', 'error', 5000);
        } else if (error.message && error.message.includes('already exists')) {
            showNotification('❌ This email is already in use. Please use a different email address.', 'error', 5000);
        } else {
            showNotification(`❌ ${error.message || 'Registration failed. Please try again.'}`, 'error', 5000);
        }
    }
}

/**
 * ============================================================================
 * EMAIL VERIFICATION
 * ============================================================================
 */

/**
 * Handle OTP/Email verification - CALLS BACKEND API
 * POST /api/auth/verify-otp
 */
async function handleOtpSubmit(e) {
    e.preventDefault();
    
    const enteredOtp = document.getElementById('otpInput').value.trim();
    
    if (!enteredOtp) {
        showNotification('Please enter the verification code', 'error');
        return;
    }

    if (enteredOtp.length !== 6 || isNaN(enteredOtp)) {
        showNotification('Verification code must be 6 digits', 'error');
        return;
    }

    try {
        showNotification('⏳ Verifying email...', 'info', 0);

        // Call backend email verification endpoint with EMAIL + OTP
        const response = await apiCall(API_ENDPOINTS.AUTH_VERIFY_OTP, {
            method: 'POST',
            body: JSON.stringify({
                email: registrationState.email,
                otp: enteredOtp
            })
        });

        // Clear loading notification
        clearAllNotifications();
        showNotification('✅ Email verified successfully! Redirecting to login...', 'success', 2000);

        // Close modal after delay
        setTimeout(() => {
            closeOtpModal();
            toggleForms(); // Show login form
            
            // Pre-fill email
            document.querySelector('#loginForm input[type="email"]').value = registrationState.email;
            document.querySelector('#loginForm input[type="email"]').focus();

            // Clear inputs
            document.getElementById('otpInput').value = '';
            
            // Clear registration state since registration is complete
            registrationState = { email: null, password: null, fullName: null, userId: null };
            isRegistrationPending = false;
            
            showNotification('✅ You can now login with your credentials', 'success', 4000);
        }, 2000);

    } catch (error) {
        console.error('Email verification error:', error);
        clearAllNotifications();
        showNotification(`❌ ${error.message || 'Verification failed. Invalid or expired code.'}`, 'error', 4000);
        document.getElementById('otpInput').value = '';
        document.getElementById('otpInput').focus();
    }
}

/**
 * Handle resend OTP - CALLS BACKEND API
 * POST /api/auth/resend-otp
 */
let otpResendCountdown = 0;
async function handleResendOtp() {
    // Check if still in cooldown
    if (otpResendCountdown > 0) {
        showNotification(`⏳ Please wait ${otpResendCountdown}s before requesting a new code`, 'warning', 3000);
        return;
    }

    try {
        showNotification('📧 Sending new OTP...', 'info', 0);

        // Call backend resend endpoint
        await apiCall(API_ENDPOINTS.AUTH_RESEND_OTP, {
            method: 'POST',
            body: JSON.stringify({
                email: registrationState.email
            })
        });

        // Clear loading notification
        clearAllNotifications();
        showNotification('✅ New verification code sent!', 'success', 4000);
        
        // Start 60 second cooldown
        otpResendCountdown = 60;
        const resendBtn = document.getElementById('resendOtpBtn');
        if (resendBtn) {
            resendBtn.disabled = true;
            resendBtn.textContent = `Resend in ${otpResendCountdown}s`;
            
            const countdown = setInterval(() => {
                otpResendCountdown--;
                if (otpResendCountdown > 0) {
                    resendBtn.textContent = `Resend in ${otpResendCountdown}s`;
                } else {
                    resendBtn.disabled = false;
                    resendBtn.textContent = 'Resend Code';
                    clearInterval(countdown);
                }
            }, 1000);
        }

        // Clear OTP input
        document.getElementById('otpInput').value = '';
        document.getElementById('otpInput').focus();

    } catch (error) {
        console.error('Resend OTP error:', error);
        clearAllNotifications();
        showNotification(`❌ ${error.message || 'Failed to resend OTP. Please try again.'}`, 'error', 4000);
    }
}

/**
 * ============================================================================
 * OTP MODAL MANAGEMENT
 * ============================================================================
 */

/**
 * Show OTP verification modal  
 */
function showOtpModal() {
    const modal = document.getElementById('otpModal');
    const emailDisplay = document.getElementById('otpEmailDisplay');
    const otpInput = document.getElementById('otpInput');
    
    emailDisplay.textContent = registrationState.email;
    otpInput.value = '';
    otpInput.focus();
    
    modal.classList.add('active');
}

/**
 * Close OTP modal
 */
function closeOtpModal() {
    const modal = document.getElementById('otpModal');
    modal.classList.remove('active');
    document.getElementById('otpInput').value = '';
    
    // IMPORTANT: Keep registration state in memory (don't clear it)
    // This allows user to reopen the modal without resending OTP
    // Registration state will be cleared on page reload or after successful verification
    
    // Mark registration as no longer pending (modal closed)
    isRegistrationPending = false;
    
    // Reset resend button state
    const resendBtn = document.getElementById('resendOtpBtn');
    if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend Code';
    }
}

/**
 * Resend OTP code - CALLS BACKEND API
 * POST /api/auth/resend-otp
 */
async function resendOtpCode() {
    // Check if still in cooldown
    if (otpResendCountdown > 0) {
        showNotification(`⏳ Please wait ${otpResendCountdown}s before requesting a new code`, 'warning', 3000);
        return;
    }

    try {
        showNotification('📧 Sending new verification code...', 'info', 0);

        // Call backend resend OTP endpoint (NOT register again)
        await apiCall(API_ENDPOINTS.AUTH_RESEND_OTP, {
            method: 'POST',
            body: JSON.stringify({
                email: registrationState.email
            })
        });

        // Clear loading notification
        clearAllNotifications();
        showNotification(`✅ Verification code resent to ${registrationState.email}`, 'success', 4000);
        
        // Start 60 second cooldown
        otpResendCountdown = 60;
        const resendBtn = document.querySelector('.otp-footer button');
        if (resendBtn) {
            resendBtn.disabled = true;
            const originalText = resendBtn.textContent;
            resendBtn.textContent = `Resend in ${otpResendCountdown}s`;
            
            const countdown = setInterval(() => {
                otpResendCountdown--;
                if (otpResendCountdown > 0) {
                    resendBtn.textContent = `Resend in ${otpResendCountdown}s`;
                } else {
                    resendBtn.disabled = false;
                    resendBtn.textContent = originalText;
                    clearInterval(countdown);
                }
            }, 1000);
        }
        
        document.getElementById('otpInput').value = '';
        document.getElementById('otpInput').focus();

    } catch (error) {
        console.error('Resend error:', error);
        clearAllNotifications();
        showNotification(`❌ ${error.message || 'Failed to resend code. Please try again.'}`, 'error', 4000);
    }
}

/**
 * ============================================================================
 * PASSWORD RESET (Forgot Password)
 * ============================================================================
 */

/**
 * Request password reset - CALLS BACKEND API
 * Used in forgot-password.html
 * POST /api/auth/forgot-password
 */
async function requestPasswordReset(email) {
    if (!email || !email.includes('@')) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    try {
        showNotification('📧 Sending password reset code...', 'info', 0);

        const response = await apiCall(API_ENDPOINTS.AUTH_FORGOT_PASSWORD, {
            method: 'POST',
            body: JSON.stringify({ email: email })
        });

        passwordResetState.email = email;
        passwordResetState.verificationToken = response.resetToken;

        showNotification('✓ Reset code sent! Check your email.', 'success');
        return true;

    } catch (error) {
        console.error('Password reset request error:', error);
        showNotification(`❌ ${error.message || 'Failed to send reset code.'}`, 'error');
        return false;
    }
}

/**
 * Verify reset OTP and proceed to password change
 * POST /api/auth/verify-otp
 */
async function verifyResetOtp(otp) {
    if (!otp || otp.length !== 6) {
        showNotification('Please enter a valid 6-digit code', 'error');
        return false;
    }

    try {
        showNotification('✓ Verifying code...', 'info', 0);

        const response = await apiCall(API_ENDPOINTS.AUTH_VERIFY_OTP, {
            method: 'POST',
            body: JSON.stringify({
                token: passwordResetState.verificationToken,
                otp: otp
            })
        });

        passwordResetState.verificationToken = response.resetToken;
        showNotification('✓ Code verified! Enter your new password.', 'success');
        return true;

    } catch (error) {
        console.error('OTP verification error:', error);
        showNotification(`❌ ${error.message || 'Invalid or expired code.'}`, 'error');
        return false;
    }
}

/**
 * Reset password to new value
 * POST /api/auth/reset-password
 */
async function resetPassword(newPassword, confirmPassword) {
    if (!newPassword || newPassword !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return false;
    }

    if (newPassword.length < 8) {
        showNotification('Password must be at least 8 characters', 'error');
        return false;
    }

    try {
        showNotification('✓ Updating password...', 'info', 0);

        await apiCall(API_ENDPOINTS.AUTH_RESET_PASSWORD, {
            method: 'POST',
            body: JSON.stringify({
                resetToken: passwordResetState.verificationToken,
                newPassword: newPassword
            })
        });

        showNotification('✓ Password reset successfully! Redirecting to login...', 'success');
        passwordResetState = { email: null, verificationToken: null, currentStep: 1 };
        
        setTimeout(() => {
            window.location.href = 'auth.html';
        }, 2000);
        
        return true;

    } catch (error) {
        console.error('Password reset error:', error);
        showNotification(`❌ ${error.message || 'Failed to reset password.'}`,'error');
        return false;
    }
}

/**
 * ============================================================================
 * LOGOUT
 * ============================================================================
 */

/**
 * Handle user logout
 * Clears authentication data and redirects to landing page
 */
function handleLogout() {
    // Clear all authentication data
    clearAuthData();
    
    // Clear any pending registration state
    registrationState = { email: null, password: null, fullName: null, userId: null };
    isRegistrationPending = false;
    
    // Clear password reset state
    passwordResetState = { email: null, verificationToken: null, currentStep: 1 };
    
    // Clear browser history to prevent going back to app
    window.history.pushState(null, null, 'auth.html');
    window.history.replaceState(null, null, 'auth.html');
    
    // Redirect to auth page
    window.location.href = 'auth.html';
}

/**
 * ============================================================================
 * NOTIFICATION SYSTEM - DASHBOARD STYLE
 * ============================================================================
 */

/**
 * Clear all notifications from the screen
 */
function clearAllNotifications() {
    const notifications = document.querySelectorAll('.notification-toast');
    notifications.forEach(notif => notif.remove());
}

/**
 * Show notification with dashboard-style formatting
 * @param {string} message - Notification message
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in ms (0 = no auto-dismiss)
 */
function showNotification(message, type = 'info', duration = 4000) {
    // Create notification container
    const notif = document.createElement('div');
    notif.className = `notification-toast type-${type}`;
    
    // Get colors based on type
    const colors = {
        success: { bg: '#10b981', border: '#059669' },
        error: { bg: '#ef4444', border: '#dc2626' },
        warning: { bg: '#f59e0b', border: '#d97706' },
        info: { bg: '#3b82f6', border: '#2563eb' }
    };
    
    const color = colors[type] || colors.info;
    
    // Style notification
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 14px 18px;
        background: ${color.bg};
        border-left: 4px solid ${color.border};
        color: white;
        border-radius: 4px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        max-width: 380px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        animation: slideInRight 0.3s ease-out;
        word-wrap: break-word;
    `;
    
    notif.textContent = message;
    document.body.appendChild(notif);

    // Auto-dismiss if duration > 0
    if (duration > 0) {
        setTimeout(() => {
            notif.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notif.remove(), 300);
        }, duration);
    }

    return notif;
}

/**
 * Add CSS animations if not already present
 */
(function() {
    if (!document.querySelector('style[data-auth-animations]')) {
        const style = document.createElement('style');
        style.setAttribute('data-auth-animations', 'true');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(400px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes slideOutRight {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(400px);
                }
            }
        `;
        document.head.appendChild(style);
    }
})();
