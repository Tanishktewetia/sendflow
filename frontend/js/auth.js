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
        window.location.href = 'app.html';
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
    
    const email = document.querySelector('#loginForm input[type="email"]').value;
    const password = document.querySelector('#loginForm input[type="password"]').value;

    // Validation
    if (!email || !password) {
        showNotification('Please enter email and password', 'error');
        return;
    }

    try {
        showNotification('🔐 Authenticating...', 'info', 0);

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

        showNotification('✓ Login successful! Redirecting...', 'success', 1500);

        // Redirect to dashboard after short delay
        setTimeout(() => {
            window.location.href = 'app.html';
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
    
    const inputs = document.querySelectorAll('#registerForm input');
    const fullName = inputs[0].value.trim();
    const email = inputs[1].value.trim();
    const password = inputs[2].value;
    const confirmPassword = inputs[3].value;

    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }

    if (password.length < 8) {
        showNotification('Password must be at least 8 characters', 'error');
        return;
    }

    // Email validation
    if (!email.includes('@') || !email.includes('.')) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    try {
        showNotification('📧 Creating account...', 'info', 0);

        // Call backend registration endpoint
        const response = await apiCall(API_ENDPOINTS.AUTH_REGISTER, {
            method: 'POST',
            body: JSON.stringify({
                email: email,
                password: password,
                fullName: fullName
            })
        });

        // Store registration state for OTP verification
        registrationState = {
            email: email,
            password: password,
            fullName: fullName,
            userId: response.userId
        };

        // Show OTP modal for email verification
        showOtpModal();

        showNotification(`🔐 Verification email sent to ${email}`, 'success');

    } catch (error) {
        console.error('Registration error:', error);
        showNotification(`❌ ${error.message || 'Registration failed. Please try again.'}`,'error');
    }
}

/**
 * ============================================================================
 * EMAIL VERIFICATION
 * ============================================================================
 */

/**
 * Handle OTP/Email verification - CALLS BACKEND API
 * POST /api/auth/verify-email
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
        showNotification('✓ Verifying email...', 'info', 0);

        // Call backend email verification endpoint
        const response = await apiCall(API_ENDPOINTS.AUTH_VERIFY_EMAIL, {
            method: 'POST',
            body: JSON.stringify({
                token: enteredOtp,
                userId: registrationState.userId
            })
        });

        showNotification('✓ Email verified successfully! Redirecting to login...', 'success');

        // Close modal after delay
        setTimeout(() => {
            closeOtpModal();
            toggleForms(); // Show login form
            
            // Pre-fill email
            document.querySelector('#loginForm input[type="email"]').value = registrationState.email;
            document.querySelector('#loginForm input[type="email"]').focus();

            // Clear inputs
            document.getElementById('otpInput').value = '';
            
            showNotification('You can now login with your credentials', 'info');
        }, 1500);

    } catch (error) {
        console.error('Email verification error:', error);
        showNotification(`❌ ${error.message || 'Verification failed. Invalid or expired code.'}`,'error');
        document.getElementById('otpInput').value = '';
        document.getElementById('otpInput').focus();
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
}

/**
 * Resend OTP code - CALLS BACKEND API
 */
async function resendOtpCode() {
    try {
        showNotification('📧 Resending verification email...', 'info', 0);

        // Call backend to resend verification email
        await apiCall(API_ENDPOINTS.AUTH_REGISTER, {
            method: 'POST',
            body: JSON.stringify({
                email: registrationState.email,
                password: registrationState.password,
                fullName: registrationState.fullName
            })
        });

        showNotification(`🔐 Verification code resent to ${registrationState.email}`, 'success');
        document.getElementById('otpInput').value = '';
        document.getElementById('otpInput').focus();

    } catch (error) {
        console.error('Resend error:', error);
        showNotification('Failed to resend code. Please try again.', 'error');
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
