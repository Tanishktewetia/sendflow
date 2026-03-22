// Authentication Logic

let registrationState = {
    email: null,
    password: null,
    fullName: null,
    otp: null
};

function toggleForms() {
    document.getElementById('loginForm').classList.toggle('active');
    document.getElementById('registerForm').classList.toggle('active');
}

document.addEventListener('DOMContentLoaded', function() {
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
 * Handle user login
 */
function handleLogin(e) {
    e.preventDefault();
    
    const email = document.querySelector('#loginForm input[type="email"]').value;
    const password = document.querySelector('#loginForm input[type="password"]').value;

    // Store user data
    localStorage.setItem('user', JSON.stringify({
        email: email,
        loggedIn: true,
        loginTime: new Date().toISOString()
    }));

    window.location.href = 'app.html';
}

/**
 * Handle user registration
 */
function handleRegister(e) {
    e.preventDefault();
    
    const inputs = document.querySelectorAll('#registerForm input');
    const fullName = inputs[0].value;
    const email = inputs[1].value;
    const password = inputs[2].value;
    const confirmPassword = inputs[3].value;

    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }

    if (password.length < 8) {
        showNotification('Password must be at least 8 characters', 'error');
        return;
    }

    // Store registration data
    registrationState = {
        email: email,
        password: password,
        fullName: fullName,
        otp: generateOTP()
    };

    // Show OTP modal
    showOtpModal();
    
    showNotification(`🔐 OTP sent to ${email}`, 'success');
}

/**
 * Handle OTP verification
 */
function handleOtpSubmit(e) {
    e.preventDefault();
    
    const enteredOtp = document.getElementById('otpInput').value.trim();
    
    if (!enteredOtp) {
        showNotification('Please enter the OTP code', 'error');
        return;
    }

    if (enteredOtp.length !== 6) {
        showNotification('OTP must be 6 digits', 'error');
        return;
    }

    // Verify OTP
    if (enteredOtp !== registrationState.otp) {
        showNotification('Invalid OTP code. Please try again', 'error');
        document.getElementById('otpInput').value = '';
        return;
    }

    // OTP is correct - register user successfully
    localStorage.setItem('user', JSON.stringify({
        fullName: registrationState.fullName,
        email: registrationState.email,
        loggedIn: false,
        registrationTime: new Date().toISOString()
    }));

    // Show success notification
    showNotification('✓ Registration successful! Redirecting to login...', 'success');

    // Close modal and redirect
    closeOtpModal();

    setTimeout(() => {
        toggleForms();
        document.getElementById('otpInput').value = '';
        // Focus email field on login form
        document.querySelector('#loginForm input[type="email"]').focus();
    }, 1500);
}

/**
 * Show OTP modal
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
 * Resend OTP code
 */
function resendOtpCode() {
    registrationState.otp = generateOTP();
    document.getElementById('otpInput').value = '';
    document.getElementById('otpInput').focus();
    showNotification(`🔐 OTP resent to ${registrationState.email}`, 'info');
}

/**
 * Generate random 6-digit OTP
 */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
