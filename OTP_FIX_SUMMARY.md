# OTP Transaction Rollback Issue - FIX SUMMARY

## Problem Identified
The OTP endpoints (`/auth/forgot-password` and `/auth/resend-otp`) were returning this error:
```
{
  "error": "Transaction silently rolled back because it has been marked as rollback-only"
}
```

## Root Cause Analysis
Two components were causing the transaction to be marked as rollback-only:

1. **SystemEmailService** - Had `@Transactional` class-level annotation
   - Email sending failures would cause the transaction to be marked as rollback-only
   - Email operations shouldn't be wrapped in database transactions anyway

2. **AuthService.requestPasswordReset()** and **AuthService.resendPasswordResetOtp()** - Methods within `@Transactional` class
   - Even though exceptions were caught, Spring automatically marks transactions as rollback-only when ANY exception occurs within a `@Transactional` method
   - This prevented the database changes from being saved

## Fixes Applied

### Fix #1: Remove @Transactional from SystemEmailService
**File**: `/backend/src/main/java/com/javamailer/service/SystemEmailService.java`

**Changes**:
- Removed `@Transactional` class-level annotation
- Removed `import org.springframework.transaction.annotation.Transactional;`
- Added comment: "Email sending should not be part of database transactions"

**Reason**: Email operations are I/O operations and should not rollback database transactions if they fail.

### Fix #2: Add noRollbackFor Exception Handler to OTP Methods
**File**: `/backend/src/main/java/com/javamailer/service/AuthService.java`

**Changes**:
- Added `@Transactional(noRollbackFor = Exception.class)` to `requestPasswordReset()` method
- Added `@Transactional(noRollbackFor = Exception.class)` to `resendPasswordResetOtp()` method

**Reason**: This tells Spring to commit database changes even if exceptions occur, preventing the transaction from being marked as rollback-only.

## How It Works Now

### Before Fix:
```
AuthService.requestPasswordReset()
  ├─ Save OTP token to DB ✓
  ├─ Try to send email via SystemEmailService
  │  └─ Email fails → Exception thrown
  ├─ Exception caught, but transaction marked as "rollback-only" ✗
  └─ Everything since method entry is rolled back ✗
```

### After Fix:
```
AuthService.requestPasswordReset() [@Transactional(noRollbackFor=Exception.class)]
  ├─ Save OTP token to DB ✓
  ├─ Try to send email via SystemEmailService (no longer @Transactional)
  │  └─ Email fails → Exception thrown and logged
  ├─ Exception caught, transaction still valid ✓
  └─ Database changes are committed ✓
```

## Testing the Fix

### Prerequisite
The backend must be **restarted** for the changes to take effect:
1. Stop the existing backend process
2. Run: `mvn clean package -DskipTests` in the backend directory
3. Start the new JAR: `java -jar target/java-mailer-backend-1.0.0.jar`

### Test Script
Run `python test_otp_fix.py` to verify:

```bash
python C:\Users\tanis\Desktop\Java_mailer\test_otp_fix.py
```

Expected results:
- ✓ Registration: Status 201
- ✓ Forgot Password (OTP Request): Status 200
- ✓ Resend OTP (Throttle): Error message with wait time
- ✓ Resend OTP (After 60s): Status 200

## Key Improvements

| Feature | Before | After |
|---------|--------|-------|
| OTP Request | ✗ Transaction rollback error | ✓ OTP token saved + email sent |
| OTP Resend | ✗ Transaction rollback error | ✓ New token generated + throttle enforced |
| Email Failures | Transaction killed | Request succeeds, email silently fails |
| Database Save | Rolled back | Committed |
| User Experience | "See error page" | "Smooth UX, OTP still sent" |

## Verification Checklist

- [x] Fixed @Transactional annotation on SystemEmailService
- [x] Added @Transactional(noRollbackFor=Exception.class) to OTP methods
- [x] Code compiled successfully
- [ ] Backend restarted with new JAR
- [ ] Test script passes all checks
- [ ] Email verification works end-to-end

## Files Modified

1. `backend/src/main/java/com/javamailer/service/SystemEmailService.java`
   - Removed @Transactional annotation
   - Removed unnecessary import

2. `backend/src/main/java/com/javamailer/service/AuthService.java`
   - Added import for Propagation
   - Added method-level @Transactional(noRollbackFor=Exception.class) to:
     - `requestPasswordReset()`
     - `resendPasswordResetOtp()`

## Next Actions

1. **Restart Backend**: Kill existing process and start new JAR with fixes
2. **Test OTP Flow**: Run comprehensive test to verify all features work
3. **Verify Email Sending**: Check that OTP emails are being sent successfully
4. **Full Integration Test**: Test complete forgot password flow

---
**Status**: ✅ Code Fixed | ⏳ Awaiting Backend Restart for Testing
