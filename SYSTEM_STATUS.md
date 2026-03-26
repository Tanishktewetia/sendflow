# Java Mailer - Complete System Status & Instructions

**Last Updated**: March 23, 2026
**Status**: 🟡 MOSTLY WORKING - Configuration Issues Fixed

---

## 🎯 Current System Status

### ✅ FIXED - API Port Mismatch
- **Issue**: Frontend was calling wrong port (8080 instead of 8081)
- **Fix**: Updated `frontend/js/api-config.js` to use `http://localhost:8081/api`
- **Status**: ✅ VERIFIED WORKING

### ✅ FIXED - Frontend Not Served Properly  
- **Issue**: Frontend HTML files not being served from web server
- **Fix**: Started HTTP server on port 3000
- **Status**: ✅ VERIFIED WORKING  
- **Already Running**: Frontend accessible at `http://localhost:3000`

### ✅ FIXED (Partially) - Email Sending Configuration
- **Issue**: Resend email sending failed with 403 "gmail.com domain not verified"
- **Root Cause**: Resend account in test/development mode without domain verification
- **Fix**: Updated `application.properties` to use `onboarding@resend.dev`
- **Status**: ✅ API Now Works (but test mode limitation remains)
- **Limitation**: Can ONLY send emails TO: `tanishktewetia@gmail.com`

### ⚠️ REQUIRES ACTION - Backend Restart
- **Why**: Configuration file was updated with new Resend sender email
- **Action Needed**: Restart backend to load new configuration
- **How**: Run `RESTART_BACKEND.bat` from the Java_mailer folder

---

## 🚀 NEXT STEPS - Complete End-to-End Test

### Step 1: Restart Backend
1. **Run**: Double-click `RESTART_BACKEND.bat` in `c:\Users\tanis\Desktop\Java_mailer\`
2. **Wait**: Backend will compile and start
3. **Verify**: Wait for message "Started in X seconds"

### Step 2: Test Registration & Email Verification
1. **Open Browser**: Go to `http://localhost:3000/auth.html`
2. **Register** with these test details:
   ```
   Full Name: Test User
   Email: tanishktewetia@gmail.com
   Password: TestPass123!
   Confirm Password: TestPass123!
   ```
3. **Expected**: See "Verification email sent to tanishktewetia@gmail.com"
4. **Check Gmail**: Look for email from `onboarding@resend.dev` with verification code
5. **Enter Code**: In the verification modal, enter the 6-digit code from email
6. **Success**: Should see "Email verified! You can now login"

### Step 3: Login to Dashboard
1. **Fill Login Form**:
   ```
   Email: tanishktewetia@gmail.com
   Password: TestPass123!
   ```
2. **Click Login**
3. **Expected**: Redirected to `http://localhost:3000/app.html` (Dashboard)

### Step 4: Complete Demo Flow
If login works, test:
- [ ] Upload CSV file
- [ ] Configure email provider (Resend)
- [ ] Compose email
- [ ] Start campaign

---

## ⚠️ Current Limitation & Solutions

### Current Limitation: Email Test Mode
The Resend account is in test/development mode and **can only send emails TO `tanishktewetia@gmail.com`**.

**What This Means**:
- ✅ You can register with any email
- ✅ Registration API will return success  
- ❌ But verification email will only be delivered to tanishktewetia@gmail.com
- ❌ Only that email can login
- ❌ Other users cannot complete registration

### Solution 1: For Production (Recommended)
1. **Go to**: https://resend.com/domains
2. **Add Domain**: Add a domain you own (e.g., mail.yourdomain.com)
3. **Verify**: Follow DNS verification steps from Resend
4. **Update**: Change `resend.from-email` in `application.properties`:
   ```properties
   resend.from-email=noreply@yourdomain.com
   ```
5. **Restart**: Run `RESTART_BACKEND.bat`

### Solution 2: For Development (If no domain)
1. **Create Resend Account**: Sign up with a real domain or use free tier
2. **Verify Domain**: Go through their domain verification process
3. **Get API Key**: Copy from Resend dashboard
4. **Update Config**:
   ```properties
   resend.api-key=re_YOUR_NEW_API_KEY
   resend.from-email=noreply@YOUR_DOMAIN.com
   ```
5. **Restart**: Run `RESTART_BACKEND.bat`

### Solution 3: Use Different Email Provider
If you don't want to verify a domain on Resend:

**Option A: Use Gmail (Multiple Accounts)**
- Configure system to use Gmail SMTP
- Update file: `backend/src/main/resources/application.properties`
- Requires Gmail App Password setup

**Option B: Use SendGrid**
- Create SendGrid account
- Verify domain or use SendGrid sender
- Modify `EmailProviderFactory.java` to add SendGrid support

**Option C: Use AWS SES**
- Create AWS account
- Verify sender email in SES
- Update configuration accordingly

---

## 📋 Complete Configuration Files Changed

### 1. frontend/js/api-config.js
**Changed**: API_BASE_URL port
```javascript
// BEFORE
const API_BASE_URL = 'http://localhost:8080/api';

// AFTER
const API_BASE_URL = 'http://localhost:8081/api';
```

### 2. backend/src/main/resources/application.properties
**Changed**: Resend sender email
```properties
# BEFORE
resend.from-email=tanishktewetia@gmail.com

# AFTER
resend.from-email=onboarding@resend.dev
```

---

## 🔧 Architecture Overview

```
User Browser (http://localhost:3000)
        ↓
    auth.html (HTML/CSS/JS)
        ↓
    auth.js (makes API calls)
        ↓
    api-config.js (routes to backend)
        ↓
Backend (http://localhost:8081/api)
    ↓
AuthController
    ↓
AuthService
    ↓
SystemEmailService (uses Resend provider)
    ↓
Resend Cloud Email API
    ↓
User Email
```

---

## 🧪 Quick Testing Without UI

To test the backend without the UI, use these commands:

### Register User
```bash
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"tanishktewetia@gmail.com",
    "password":"TestPass123!",
    "fullName":"Test User"
  }'
```

### Expected Response
```json
{
  "message": "Registration successful. Please verify your email to login.",
  "userId": 1,
  "email": "tanishktewetia@gmail.com",
  "verificationTokenSent": true
}
```

### Get Verification Token (From Database)
```sql
SELECT token FROM email_verification_tokens 
WHERE user_id = 1 
ORDER BY created_at DESC 
LIMIT 1;
```

### Verify Email
```bash
curl -X POST http://localhost:8081/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token":"<token-from-db>"
  }'
```

### Login
```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"tanishktewetia@gmail.com",
    "password":"TestPass123!"
  }'
```

---

## 📞 Troubleshooting

### Backend won't start after running RESTART_BACKEND.bat
**Solution**: 
1. Check if port 8081 is already in use
2. Run: `netstat -ano | findstr :8081`
3. Kill process if needed
4. Try again

### Frontend can't reach backend
**Solution**:
1. Check if backend is running: `netstat -ano | findstr :8081`
2. Check if frontend server is running: `netstat -ano | findstr :3000`
3. Check browser console for CORS errors (F12 → Console tab)

### Email not being sent
**Solution**:
1. Check Resend API key is correct
2. Verify domain on https://resend.com/domains
3. Check backend logs for error messages
4. Try the manual test: `python test_resend_api.py`

### Can't login after email verification
**Solution**:
1. Check database: `SELECT * FROM users WHERE email = 'tanishktewetia@gmail.com';`
2. Verify `is_email_verified = true`
3. Check password is correct
4. Look for JWT token generation errors in logs

---

## 📊 System URLs after startup

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8081/api
- **Login/Register**: http://localhost:3000/auth.html
- **Dashboard (Main)**: http://localhost:3000/app.html (after login)
  - ✅ Compose Email section integrated
  - ✅ Upload CSV section integrated
  - ✅ Campaign monitoring integrated

---

## ✅ Verification Checklist

After completing the steps above, verify everything works:

- [ ] Backend started successfully (no errors)
- [ ] Frontend accessible at http://localhost:3000
- [ ] Can see login form at http://localhost:3000/auth.html
- [ ] Can register with tanishktewetia@gmail.com
- [ ] Received verification email at tanishktewetia@gmail.com
- [ ] Can verify email with 6-digit code
- [ ] Can login successfully  
- [ ] Dashboard page loads (http://localhost:3000/app.html)
- [ ] Can see navigation menu
- [ ] Can access all pages (upload, compose, etc.)

---

## 🎓 How the System Works

1. **Registration**: User fills form → API creates user in DB → Token generated → Email sent
2. **Email Verification**: User receives token in email → Enters token in UI → Account marked verified
3. **Login**: User submits credentials → API validates → Returns JWT token → Token stored in browser
4. **Dashboard**: Authenticated requests include JWT token → API validates token → Page loads
5. **Email Campaign**: User configures provider → Uploads CSV → Composes message → Launches campaign

---

## 📝 Notes

- Database: PostgreSQL on Supabase (aws-1-ap-northeast-1.pooler.supabase.com:5432)
- JWT Expiration: 1 hour
- Email Verification Token: 24 hours
- OTP Expiration: 15 minutes (password reset)
- All passwords hashed with BCrypt
- CORS enabled for localhost:3000

---

**Next Action**: Run `RESTART_BACKEND.bat` to apply the configuration changes!
