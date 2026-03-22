// Password Reset Form Logic

let resetState = {
    email: null,
    otp: null,
    otpTimer: null,
    otpTimeRemaining: 300, // 5 minutes
    isProcessing: false // Prevent multiple concurrent requests
};

// Flag to prevent duplicate event listeners
let listenersAttached = false;

// Step 1: Send OTP
if (!listenersAttached && document.getElementById('sendOtpBtn')) {
    listenersAttached = true;
    document.getElementById('sendOtpBtn').addEventListener('click', async () => {
    const email = document.getElementById('resetEmail').value.trim();
    
    // Prevent multiple concurrent requests
    if (resetState.isProcessing) return;

    if (!email) {
        showError('email', 'Please enter your email address');
        return;
    }

    if (!isValidEmail(email)) {
        showError('email', 'Please enter a valid email address');
        return;
    }

    // Show loading state
    resetState.isProcessing = true;
    const btn = document.getElementById('sendOtpBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending...';

    // Backend API Integration Point:
    // Replace this setTimeout with actual fetch call to verify email exists in database
    // Example:
    // try {
    //     const response = await fetch('/api/auth/verify-email', {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify({ email })
    //     });
    //     const data = await response.json();
    //     if (!data.exists) {
    //         showError('email', 'Email not found in our system');
    //         return;
    //     }
    // } catch (err) { ... }

    // Simulated backend check
    setTimeout(() => {
        // Simulate email verification - in real app, check against database
        const registeredEmails = ['test@example.com', 'user@gmail.com', 'admin@sendflow.com'];
        
        if (!registeredEmails.includes(email.toLowerCase())) {
            showError('email', 'Email not found in our system');
            btn.disabled = false;
            btn.textContent = originalText;
            resetState.isProcessing = false;
            return;
        }

        // Email verified, proceed to OTP step
        resetState.email = email;
        
        // Simulate OTP generation and sending
        resetState.otp = generateOTP();
        
        // Show success and move to next step
        showNotification('✓ OTP sent to your email', 'success');
        moveToStep(2);
        
        // Display email in step 2
        document.getElementById('displayEmail').textContent = email;
        
        // Start OTP timer
        startOtpTimer();
        
        btn.disabled = false;
        btn.textContent = originalText;
        resetState.isProcessing = false;
    }, 800); // Reduced from 2000 for faster testing
    });
}

// Step 2: Confirm OTP
if (document.getElementById('confirmOtpBtn')) {
    document.getElementById('confirmOtpBtn').addEventListener('click', () => {
        const enteredOtp = document.getElementById('otpCode').value.trim();
        
        if (!enteredOtp) {
            showError('otp', 'Please enter the OTP');
            return;
        }

        if (enteredOtp.length !== 6) {
            showError('otp', 'OTP must be 6 digits');
            return;
        }

        // In production, verify OTP with backend
        // For demo, compare with simulated OTP
        if (enteredOtp !== resetState.otp) {
            showError('otp', 'Invalid OTP. Please check and try again');
            return;
        }

        // OTP verified successfully
        clearInterval(resetState.otpTimer);
        showNotification('✓ OTP verified successfully', 'success');
        moveToStep(3);
    });
}

// Step 2: Back to Email
if (document.getElementById('backToEmailBtn')) {
    document.getElementById('backToEmailBtn').addEventListener('click', () => {
        clearInterval(resetState.otpTimer);
        moveToStep(1);
        document.getElementById('resetEmail').focus();
    });
}

// Step 3: Reset Password
if (document.getElementById('resetPasswordBtn')) {
    document.getElementById('resetPasswordBtn').addEventListener('click', async () => {
        // Prevent multiple concurrent requests
        if (resetState.isProcessing) return;

        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!newPassword) {
            showError('password', 'Please enter a new password');
            return;
        }

        if (newPassword.length < 8) {
            showError('password', 'Password must be at least 8 characters');
            return;
        }

        if (!confirmPassword) {
            showError('confirm-password', 'Please confirm your password');
            return;
        }

        if (newPassword !== confirmPassword) {
            showError('confirm-password', 'Passwords do not match');
            return;
        }

        // Show loading state
        resetState.isProcessing = true;
        const btn = document.getElementById('resetPasswordBtn');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Updating...';

        // Backend API Integration Point:
        // Replace this setTimeout with actual fetch call to update password
        // Example:
        // try {
        //     const response = await fetch('/api/auth/reset-password', {
        //         method: 'POST',
        //         headers: { 'Content-Type': 'application/json' },
        //         body: JSON.stringify({ 
        //             email: resetState.email,
        //             newPassword: newPassword,
        //             otp: resetState.otp 
        //         })
        //     });
        //     const data = await response.json();
        //     if (data.success) { moveToStep(4); }
        // } catch (err) { ... }

        // Simulated password update
        setTimeout(() => {
            // Password updated successfully
            moveToStep(4);
            btn.disabled = false;
            btn.textContent = originalText;
            resetState.isProcessing = false;
        }, 800); // Reduced from 2000 for faster testing
    });
}

// Step 3: Back to OTP
if (document.getElementById('backToOtpBtn')) {
    document.getElementById('backToOtpBtn').addEventListener('click', () => {
        moveToStep(2);
        startOtpTimer();
        document.getElementById('otpCode').focus();
    });
}

// Helper Functions

function moveToStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.reset-step').forEach(step => {
        step.classList.remove('active');
        step.style.display = 'none';
    });

    // Show target step
    const targetStep = document.getElementById(`step${stepNumber}-${getStepName(stepNumber)}`);
    if (targetStep) {
        targetStep.classList.add('active');
        targetStep.style.display = 'flex';
    }
}

function getStepName(stepNumber) {
    const names = { 1: 'email', 2: 'otp', 3: 'password', 4: 'success' };
    return names[stepNumber] || 'email';
}

function startOtpTimer() {
    resetState.otpTimeRemaining = 300; // 5 minutes
    
    const updateTimer = () => {
        const minutes = Math.floor(resetState.otpTimeRemaining / 60);
        const seconds = resetState.otpTimeRemaining % 60;
        const timerDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const timerElement = document.getElementById('otpTimer');
        if (timerElement) {
            timerElement.textContent = timerDisplay;
            
            if (resetState.otpTimeRemaining <= 60) {
                timerElement.style.color = '#ff6b6b';
            }
        }

        if (resetState.otpTimeRemaining > 0) {
            resetState.otpTimeRemaining--;
            resetState.otpTimer = setTimeout(updateTimer, 1000);
        } else {
            // OTP expired
            clearInterval(resetState.otpTimer);
            showNotification('✗ OTP has expired. Please request a new one.', 'error');
            moveToStep(1);
        }
    };

    updateTimer();
}

function generateOTP() {
    // In production, this should be generated by backend
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showError(fieldType, message) {
    let fieldElement;
    
    switch(fieldType) {
        case 'email':
            fieldElement = document.getElementById('resetEmail');
            break;
        case 'otp':
            fieldElement = document.getElementById('otpCode');
            break;
        case 'password':
            fieldElement = document.getElementById('newPassword');
            break;
        case 'confirm-password':
            fieldElement = document.getElementById('confirmPassword');
            break;
    }

    if (fieldElement) {
        fieldElement.classList.add('error');
        
        // Remove existing error message
        const existingError = fieldElement.parentElement.querySelector('.error-message');
        if (existingError) existingError.remove();

        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        fieldElement.parentElement.appendChild(errorDiv);

        // Remove error class after input change
        fieldElement.addEventListener('input', () => {
            fieldElement.classList.remove('error');
            const error = fieldElement.parentElement.querySelector('.error-message');
            if (error) error.remove();
        }, { once: true });
    }
}

function showNotification(message, type = 'success') {
    // Log to console only
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Initialize
if (!listenersAttached) {
    document.addEventListener('DOMContentLoaded', () => {
        // Focus on email field when page loads
        const emailInput = document.getElementById('resetEmail');
        if (emailInput) emailInput.focus();

        // Allow pressing Enter to send OTP
        emailInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('sendOtpBtn').click();
            }
        });

        // Allow pressing Enter to confirm OTP
        document.getElementById('otpCode')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('confirmOtpBtn').click();
            }
        });
    });
}
