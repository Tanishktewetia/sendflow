// Toast Notification System for Java Mailer Frontend
// Shows error/success messages as temporary notifications

class Toast {
    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - Type: 'error', 'success', 'warning', 'info'
     * @param {number} duration - How long to show (ms), default 5000
     */
    static show(message, type = 'info', duration = 5000) {
        // Create container if it doesn't exist
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(container);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.style.cssText = `
            padding: 16px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
            display: flex;
            align-items: center;
            gap: 12px;
            color: white;
        `;

        // Set colors based on type
        const colors = {
            error: '#ef4444',      // Red
            success: '#22c55e',    // Green
            warning: '#f59e0b',    // Amber
            info: '#3b82f6'        // Blue
        };

        const icons = {
            error: '❌',
            success: '✓',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.style.backgroundColor = colors[type] || colors.info;
        toast.innerHTML = `
            <span style="font-size: 18px;">${icons[type] || '•'}</span>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    static error(message, duration = 5000) {
        this.show(message, 'error', duration);
    }

    static success(message, duration = 3000) {
        this.show(message, 'success', duration);
    }

    static warning(message, duration = 5000) {
        this.show(message, 'warning', duration);
    }

    static info(message, duration = 5000) {
        this.show(message, 'info', duration);
    }
}

// Add CSS animations to document
if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.innerHTML = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// ======== USAGE EXAMPLES ========

/**
 * REGISTRATION ENDPOINT EXAMPLE:
 */
async function handleRegistration(email, password, fullName) {
    try {
        const response = await fetch('http://localhost:8081/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, fullName })
        });

        const data = await response.json();

        if (response.status === 201) {
            // Success
            Toast.success('✅ Registration successful! Check your email to verify.');
            // Redirect to email verification page
            setTimeout(() => window.location.href = '/verify-email', 2000);
        } else if (response.status === 400) {
            // Error
            if (data.error.includes('already registered')) {
                Toast.error('❌ This email is already registered');
            } else if (data.error.includes('Password')) {
                Toast.error('❌ ' + data.error);
            } else {
                Toast.error('❌ ' + data.error);
            }
        }
    } catch (error) {
        Toast.error('❌ Connection error: ' + error.message);
    }
}

/**
 * LOGIN ENDPOINT EXAMPLE:
 */
async function handleLogin(email, password) {
    try {
        const response = await fetch('http://localhost:8081/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.status === 200) {
            // Success
            Toast.success('✅ Login successful!');
            localStorage.setItem('token', data.token);
            setTimeout(() => window.location.href = '/app', 1500);
        } else if (response.status === 401) {
            // Unauthorized
            if (data.error.includes('not verified')) {
                Toast.error('📧 Please verify your email first');
            } else {
                Toast.error('❌ Invalid email or password');
            }
        }
    } catch (error) {
        Toast.error('❌ Connection error: ' + error.message);
    }
}

/**
 * FORGOT PASSWORD / OTP REQUEST EXAMPLE:
 */
async function handleForgotPassword(email) {
    try {
        const response = await fetch('http://localhost:8081/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.status === 200) {
            Toast.success('📧 OTP sent to your email!');
            // Store reset token for next step
            localStorage.setItem('resetToken', data.resetToken);
        } else if (response.status === 400) {
            Toast.error('❌ User not found');
        }
    } catch (error) {
        Toast.error('❌ Connection error: ' + error.message);
    }
}

/**
 * EXPORT for use in other files
 */
export default Toast;
