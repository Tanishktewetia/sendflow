# 🚀 QUICK START GUIDE - Testing Your System

## Before You Test - Start the Backend

```bash
cd C:\Users\tanis\Desktop\Java_mailer\backend
mvn exec:java -Dexec.mainClass=com.javamailer.JavaMailerApplication
```

**Keep this terminal open** - All Java errors/logs appear here!

---

## Test 1: Registration Flow (5 min)

### Step 1: Register with your real email
```bash
python test_registration_with_otp.py
```

Or use Postman:
```json
POST http://localhost:8081/api/auth/register
Content-Type: application/json

{
  "fullName": "Tanishk",
  "email": "tanishktewetia@gmail.com",
  "password": "Enzsr8ha3f@"
}
```

**Expected Response:**
```json
{
  "message": "Registration successful. Please verify your email to login.",
  "userId": 1,
  "email": "tanishktewetia@gmail.com",
  "verificationTokenSent": true
}
```
Status: **201 Created** ✅

### Step 2: Check your Gmail inbox
- Look for email from **SendFlow**
- Subject: **"SendFlow - Verify Your Email"**
- Click the **verification link**

### Step 3: Try to login BEFORE clicking email link
```json
POST http://localhost:8081/api/auth/login
{
  "email": "tanishktewetia@gmail.com",
  "password": "Enzsr8ha3f@"
}
```

**Expected:**
```json
{
  "error": "Email not verified. Please check your email."
}
```
Status: **401 Unauthorized** ✅
(This is CORRECT - shows email verification is enforced!)

### Step 4: Click the email verification link
- Go to Gmail
- Open SendFlow email
- Click the "Verify Email" link
- You should see: "Your email has been verified!"

### Step 5: Try login again
Same login request as Step 3...

**Expected:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5...",
  "userId": 1,
  "email": "tanishktewetia@gmail.com",
  "fullName": "Tanishk"
}
```
Status: **200 OK** ✅

---

## Test 2: Duplicate Email Prevention (2 min)

Try registering again with same email:
```json
POST http://localhost:8081/api/auth/register
{
  "fullName": "Tanishk",
  "email": "tanishktewetia@gmail.com",
  "password": "Enzsr8ha3f@"
}
```

**Expected:**
```json
{
  "error": "Email already registered: tanishktewetia@gmail.com"
}
```
Status: **400 Bad Request** ✅

---

## Test 3: Weak Password Validation (1 min)

```json
POST http://localhost:8081/api/auth/register
{
  "fullName": "Test User",
  "email": "test@test.com",
  "password": "weak"
}
```

**Expected Error:**
```json
{
  "error": "Password must be at least 8 characters with 1 uppercase letter and 1 number"
}
```
Status: **400** ✅

---

## Test 4: OTP & Forgot Password (10 min)

### Step 1: Request password reset OTP
```json
POST http://localhost:8081/api/auth/forgot-password
{
  "email": "tanishktewetia@gmail.com"
}
```

**Expected:**
```json
{
  "message": "Password reset token generated. Check your email for OTP.",
  "resetToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```
Status: **200 OK** ✅

**Check Gmail:**
- Look for **"SendFlow - Password Reset OTP"** email
- Get the **6-digit OTP** from the email
- Note it for next step

### Step 2: Try resend OTP immediately
```json
POST http://localhost:8081/api/auth/resend-otp
{
  "email": "tanishktewetia@gmail.com"
}
```

**Expected Error (Throttled):**
```json
{
  "error": "Please wait 58 seconds before requesting a new OTP"
}
```
Status: **400** ✅

**This is CORRECT!** Prevents spam/brute force.

### Step 3: Wait 60 seconds, then resend
```bash
# Wait 60 seconds...
timeout /t 61 /nobreak
```

Then resend:
```json
POST http://localhost:8081/api/auth/resend-otp
{
  "email": "tanishktewetia@gmail.com"
}
```

**Expected Success:**
```json
{
  "message": "Password reset token generated. Check your email for OTP.",
  "resetToken": "new-token-here"
}
```
Status: **200 OK** ✅

### Step 4: Reset password with OTP
```json
POST http://localhost:8081/api/auth/reset-password
{
  "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "otp": "123456",
  "newPassword": "NewPassword123@"
}
```

**Expected Success:**
```json
{
  "message": "Password reset successfully. You can now login with new password."
}
```
Status: **200 OK** ✅

### Step 5: Login with new password
```json
POST http://localhost:8081/api/auth/login
{
  "email": "tanishktewetia@gmail.com",
  "password": "NewPassword123@"
}
```

**Expected:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5...",
  ...
}
```
Status: **200 OK** ✅

---

## Backend Logs - What to Watch For

While testing, watch the backend terminal for these log types:

### ✅ Success Logs (Green)
```
[INFO] ✓ User created with ID: 1
[INFO] ✓ Email verified successfully
[INFO] ✓ OTP sent to user
```

### ❌ Error Logs (Red)
```
[ERROR] Email already registered: tanishktewetia@gmail.com
[ERROR] Email not verified. Please check your email.
[ERROR] Invalid OTP
```

### ⚠️ Warning Logs (Yellow)
```
[WARN] Please wait 60 seconds before requesting a new OTP
[WARN] User attempting login without email verification
```

---

## Troubleshooting Quick Reference

| Issue | Check | Solution |
|-------|-------|----------|
| Backend won't start | Terminal errors | Check Java/Maven installed, port 8081 free |
| Registration fails | Backend logs | Check email field, password strength |
| Can't login | Backend logs | Check if email verified |
| Email not received | Backend logs | Check email config, check spam folder |
| Duplicate email allowed | Run diagnostic | Should be fixed now, recompile backend |
| OTP not throttled | Wait 60s | Test immediate resend, then wait and retry |

---

## Test Results Template

Copy this and fill it out:

```
✅ Test 1: Registration
  - Fresh email registered: [ ] YES
  - Verification email received: [ ] YES
  - Can't login before verification: [ ] YES (correct behavior)
  - Can login after verification: [ ] YES

✅ Test 2: Duplicate Prevention
  - Duplicate email rejected: [ ] YES
  - Error message shown: [ ] YES

✅ Test 3: Weak Password
  - Weak password rejected: [ ] YES
  - Error message shown: [ ] YES

✅ Test 4: OTP/Forgot Password
  - OTP sent: [ ] YES
  - Immediate resend throttled: [ ] YES (correct behavior)
  - Can resend after 60s: [ ] YES
  - Password reset with OTP works: [ ] YES
  - Can login with new password: [ ] YES

Overall Status: [ ] READY FOR PRODUCTION
```

---

## Toast Notifications (UI Messages)

Once you integrate toasts (`toast-notifications.js`), you'll see:

```
User tries duplicate email:
❌ Red Toast: "Email already registered"

User tries weak password:
❌ Red Toast: "Password must be 8+ chars with uppercase and number"

User registered successfully:
✓ Green Toast: "Registration successful! Check your email."

User tries to login unverified:
❌ Red Toast: "Email not verified. Please check your email."

User resend OTP too soon:
⏳ Yellow Toast: "Please wait 60 seconds before resending"
```

---

## Files You Need to Know

| File | Purpose |
|------|---------|
| Backend running | Watch terminal for logs |
| `database_diagnostic.py` | Run this to test flow |
| `toast-notifications.js` | Copy to frontend/js/ |
| `TOAST_INTEGRATION_GUIDE.md` | How to use toasts |
| `BACKEND_LOGS_GUIDE.md` | How to read logs |
| `COMPLETE_SUMMARY.md` | Full reference |

---

## Success Checklist ✅

When you see all of these, your system is working:

- [x] Registration prevents duplicates
- [x] Email verification is required
- [x] Login checks email verified
- [x] OTP has 60-second throttle
- [x] OTP has 5-minute validity
- [x] Password reset works
- [x] Backend logs are visible
- [x] Errors show in responses

---

**Current Status:** ✅ System Ready for Testing!  
**Start Here:** Run backend → Test registration → Check email → Click link → Login ✓
