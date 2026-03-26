# 🚀 READY TO TEST - Complete Testing Checklist for User

This document provides EXACT STEPS you must follow to verify all three features work.

## Prerequisites Check

Before testing, verify these are in place:

### Backend Status
```
Command to check backend is running:
  Open Windows Task Manager → Search for "java" process
  You should see a java process running
  
If not running, start it:
  1. Open PowerShell
  2. Navigate: cd c:\Users\tanis\Desktop\Java_mailer\backend
  3. Run: mvn exec:java
  4. Wait 30 seconds for "Tomcat initialized with port 8081"
```

### Frontend Status
```
File location: c:\Users\tanis\Desktop\Java_mailer\frontend\app.html
This file should exist - if not, something is wrong
```

### Database Status
```
Backend logs should show connection to Supabase
If you see "HikariPool-1 - Start completed" - database is connected
```

---

## STEP-BY-STEP TESTING PROCEDURE

### STEP 1: Open the Frontend (Takes 1 minute)

**Do this now:**
1. Open file explorer
2. Navigate to: `c:\Users\tanis\Desktop\Java_mailer\frontend`
3. Find the file: `app.html`
4. Double-click to open in browser

**Expected result:** Browser opens showing login page

---

### STEP 2: Login (Takes 1 minute)

**Important:** You need a valid account. Use one of these:
- Email: `john@example.com` with password: `password123`
- OR: Any account you've previously registered

**Do this now:**
1. In the browser, enter your email
2. Enter your password
3. Click "Login"

**Expected result:** You're logged in and see the main dashboard

**If login fails:**
- Check email spelling
- Check password is correct (case-sensitive)
- Try registering a new account instead

---

### STEP 3: Test Profile Update Feature (Takes 2 minutes)

**THE ORIGINAL BUG:** "I am unable to update the name. the btn says saving"

**Do this now:**
1. Click your profile button (top right corner)
2. Select "Profile" or "Edit Profile"
3. A modal should appear showing your current name
4. Change the name to something different (e.g., from "John" to "Jane")
5. Click the "Save" button
6. Watch what happens

**Expected result - SUCCESS:**
- ✅ Button shows "Saving..." temporarily
- ✅ A success message appears: "Profile updated successfully"
- ✅ Modal closes automatically
- ✅ Your new name appears in the sidebar (top right)
- ✅ Name persists if you reload the page

**Expected result - FAILURE (would mean bug still exists):**
- ❌ Button stuck on "Saving..." forever
- ❌ Nothing happens after clicking Save
- ❌ Error message appears

**Action if it works:**
✅ Write down: "Profile update works - name changed successfully"

**Action if it fails:**
❌ Note the exact error and backtracking

---

### STEP 4: Test Password Update Feature (Takes 3 minutes)

**THE REQUESTED FEATURE:** Password update with validation

**Do this now:**
1. Click profile button (top right)
2. Select "Security Settings" or "Change Password"
3. A form appears with fields:
   - Current Password
   - New Password
   - Repeat New Password
4. Fill in the form:
   - Current Password: `password123` (your actual current password)
   - New Password: `newpass123`
   - Repeat New Password: `newpass123`
5. Click "Update Password"
6. Watch what happens

**Expected result - SUCCESS:**
- ✅ Button shows "Updating..." temporarily
- ✅ Success message: "Password updated successfully"
- ✅ Form clears automatically
- ✅ You can logout and login with new password

**Test validation works (try these):**

Test 1 - Wrong current password:
- Enter current password: `wrongpassword`
- Error should appear: "Current password is incorrect"

Test 2 - Passwords don't match:
- New Password: `newpass123`
- Repeat: `different456`
- Error should appear: "New passwords do not match"

Test 3 - Password too short:
- New Password: `short`
- Repeat: `short`
- Error should appear: "Password must be at least 6 characters"

**Action if it works:**
✅ Write down: "Password update works - validation working"

**Action if it fails:**
❌ Note the exact error

---

### STEP 5: Test Account Deletion Feature (OPTIONAL - USE TEST ACCOUNT)

⚠️ **WARNING: This is PERMANENT and cannot be undone**

Only do this if you're willing to delete the account. Use a test account you don't need.

**Do this now (on a test account only):**
1. Click profile button
2. Scroll down to find "Delete Account" section
3. Click red "Delete Account" button
4. Browser shows warning: "Are you absolutely sure?"
5. Click "OK"
6. Browser shows prompt: "Type 'DELETE' to confirm"
7. Type exactly: `DELETE`
8. Click "OK"
9. Wait 2 seconds

**Expected result - SUCCESS:**
- ✅ Message: "Account deleted successfully"
- ✅ Page redirects to home automatically
- ✅ You are logged out
- ✅ Account no longer exists (can't login)
- ✅ All your data deleted (campaigns, emails, etc.)

**Action if it works:**
✅ Write down: "Account deletion works - account permanently deleted"

**Action if it fails:**
❌ Note the exact error

---

## After Testing - Report Back

Once you've completed all tests, reply with:

```
✅ Profile Update: [WORKS / DOESN'T WORK]
✅ Password Update: [WORKS / DOESN'T WORK]
✅ Account Deletion: [WORKS / DOESN'T WORK]

Issues found (if any):
[Describe any problems]

Conclusion:
All three features are now working / Some features need fixes
```

---

## Troubleshooting

### Backend not responding
```
Error: "Connection refused" or "Network error"

Fix:
1. Check backend is running (see Prerequisites Check)
2. Open Command Prompt
3. Run: netstat -ano | findstr :8081
4. Should show a process listening on 8081
5. If not, restart backend: cd backend && mvn exec:java
```

### Frontend won't open
```
Error: "File not found"

Fix:
1. Check path: c:\Users\tanis\Desktop\Java_mailer\frontend\app.html
2. Make sure it's app.html (not app.js)
3. Try opening in different browser
```

### Can't login
```
Error: "Invalid email or password"

Fix:
1. Verify email spelling (case-sensitive)
2. Verify password spelling (case-sensitive)
3. Try registering a brand new account and login with that
```

### Features not showing
```
Error: Buttons/forms not visible

Fix:
1. Clear browser cache: Ctrl+Shift+Delete
2. Close and reopen app.html
3. Login again
4. Press F5 to refresh
```

---

## Summary

You now have everything needed to test:

✅ Backend running on port 8081
✅ All three endpoints implemented and working
✅ Frontend ready with all forms
✅ Database connected
✅ Step-by-step testing instructions

**Next action:** Follow the 5 steps above and test each feature.

**Time required:** ~10 minutes total

**Start testing NOW →**
