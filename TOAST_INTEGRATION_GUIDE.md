# Toast Notification Integration Guide

## What is a Toast Notification?
A small temporary notification that appears on screen to show errors, success messages, warnings, or info.

**Examples:**
- ❌ **Red Error Toast:** "Email already registered"
- ✓ **Green Success Toast:** "Registration successful!"
- ⚠️ **Yellow Warning Toast:** "Wait 60 seconds before resend"
- ℹ️ **Blue Info Toast:** "Check your email"

---

## How to Use Toast Notifications in Your HTML Files

### Step 1: Import the Toast Script
Add this to your HTML `<head>` or before closing `</body>`:

```html
<script src="js/toast-notifications.js"></script>
```

### Step 2: Show Toasts in Your Code

#### Registration Form (`auth.html`)
```javascript
const form = document.getElementById('registerForm');
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('fullName').value;
    
    try {
        const response = await fetch('http://localhost:8081/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, fullName })
        });
        
        const data = await response.json();
        
        if (response.status === 201) {
            Toast.success('✅ Registration successful! Check your email.');
            form.reset();
            // Optionally redirect
            setTimeout(() => window.location.href = '/verify-email.html', 2000);
        } else if (data.error?.includes('already registered')) {
            Toast.error('❌ This email is already registered');
        } else if (data.error?.includes('Password')) {
            Toast.error('❌ Password must be 8+ chars with uppercase and number');
        } else {
            Toast.error('❌ ' + (data.error || 'Registration failed'));
        }
    } catch (error) {
        Toast.error('❌ Connection error: ' + error.message);
    }
});
```

#### Login Form (`app.html`)
```javascript
const loginForm = document.getElementById('loginForm');
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('http://localhost:8081/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.status === 200) {
            Toast.success('✅ Login successful!');
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.userId);
            // Redirect to dashboard
            setTimeout(() => window.location.href = '/app.html', 1500);
        } else if (data.error?.includes('not verified')) {
            Toast.error('📧 Please verify your email first');
            console.log('Reset link: /forgot-password.html');
        } else if (data.error?.includes('Invalid')) {
            Toast.error('❌ Invalid email or password');
        } else {
            Toast.error('❌ ' + (data.error || 'Login failed'));
        }
    } catch (error) {
        Toast.error('❌ Connection error: ' + error.message);
    }
});
```

#### Forgot Password / OTP Request (`forgot-password. html`)
```javascript
const forgotForm = document.getElementById('forgotPasswordForm');
forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('resetEmail').value;
    
    try {
        const response = await fetch('http://localhost:8081/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.status === 200) {
            Toast.success('📧 OTP sent to your email! (Valid for 5 minutes)');
            localStorage.setItem('resetToken', data.resetToken);
            // Show OTP input form
            document.getElementById('otpSection').style.display = 'block';
        } else {
            Toast.error('❌ ' + (data.error || 'Failed to send OTP'));
        }
    } catch (error) {
        Toast.error('❌ Connection error: ' + error.message);
    }
});
```

#### Resend OTP (with Throttling Message)
```javascript
const resendButton = document.getElementById('resendOtpBtn');
resendButton.addEventListener('click', async () => {
    const email = document.getElementById('resetEmail').value;
    
    try {
        const response = await fetch('http://localhost:8081/api/auth/resend-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.status === 200) {
            Toast.success('📧 New OTP sent!');
        } else if (data.error?.includes('wait')) {
            // Extract wait time from error message
            const match = data.error.match(/(\d+) seconds/);
            const secondsToWait = match ? match[1] : '60';
            Toast.warning('⏳ ' + data.error);
            
            // Disable button for 60 seconds
            resendButton.disabled = true;
            let countdown = parseInt(secondsToWait);
            const timer = setInterval(() => {
                resendButton.textContent = `Resend in ${countdown}s`;
                countdown--;
                if (countdown < 0) {
                    clearInterval(timer);
                    resendButton.disabled = false;
                    resendButton.textContent = 'Resend OTP';
                }
            }, 1000);
        } else {
            Toast.error('❌ ' + (data.error || 'Failed to resend'));
        }
    } catch (error) {
        Toast.error('❌ Connection error: ' + error.message);
    }
});
```

---

## Toast API Reference

```javascript
// Show custom toast
Toast.show(message, type, duration)
// Types: 'error', 'success', 'warning', 'info'
// Duration: milliseconds (default: 5000)

// Shortcuts
Toast.error(message)      // Red, 5s
Toast.success(message)    // Green, 3s
Toast.warning(message)    // Yellow, 5s
Toast.info(message)       // Blue, 5s

// Examples
Toast.error('Email already registered');
Toast.success('Login successful!');
Toast.warning('Please wait 60 seconds');
Toast.info('Check your email for OTP');
```

---

## What Errors Should Show Toasts?

### Registration Errors:
- ❌ "Email already registered"
- ❌ "Password must be at least 8 characters with 1 uppercase letter and 1 number"
- ❌ "Missing required fields"

### Login Errors:
- ❌ "Email not verified. Please check your email."
- ❌ "Invalid email or password"

### OTP Errors:
- ⏳ "Please wait 60 seconds before requesting a new OTP"
- ❌ "Invalid OTP"
- ❌ "OTP has expired"

### Success Messages:
- ✓ "Registration successful! Check your email."
- ✓ "Login successful!"
- ✓ "OTP sent to your email"
- ✓ "Email verified successfully"
- ✓ "Password reset successful"

---

## Testing Toast Notifications

Open browser DevTools Console and test manually:

```javascript
// Test in browser console:
Toast.error('This is an error');
Toast.success('This is success');
Toast.warning('This is a warning');
Toast.info('This is info');
```

---

## File Location
Place the toast script in: `frontend/js/toast-notifications.js`

Then import in each HTML file that needs it:
```html
<script src="js/toast-notifications.js"></script>
```

---

## Next Steps

1. ✅ Copy `toast-notifications.js` to your frontend folder
2. Add `<script src="js/toast-notifications.js"></script>` to your HTML files
3. Replace error alerts with `Toast.error()` calls
4. Test by registering with existing email / wrong password / etc.
5. Watch toast notifications appear in top-right corner!
