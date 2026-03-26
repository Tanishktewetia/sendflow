# Testing Guide: Account Management Features

## Prerequisites
- ✅ Backend running on `http://localhost:8080/api`
- ✅ Frontend files ready (HTML/CSS/JS)
- ✅ All three features implemented

## Quick Start

### Option 1: Open Frontend in Browser
```
1. Open file explorer
2. Navigate to: c:\Users\tanis\Desktop\Java_mailer\frontend
3. Double-click: app.html
```

### Option 2: Serve Frontend with Live Server
If using VS Code with Live Server extension:
```
1. Open frontend/app.html
2. Right-click → Open with Live Server
3. Browser opens at: http://127.0.0.1:5500/app.html
```

---

## Testing Workflow

### Prerequisites: User Account

You need a registered user account. Use existing test credentials or register new:

**Test Account:**
- Email: `john@example.com`
- Password: `password123` (or any previously registered account)

---

## Feature 1: Profile Update ✅

### How to Test:

1. **Login** to the application
   - Enter email and password
   - Click "Login"

2. **Navigate to Profile Settings**
   - Click the user profile button (top right)
   - Click "Edit Profile" or "Profile"
   - Profile modal opens showing your current name and email

3. **Update Your Name**
   - In the modal, find the "Display Name" field
   - Clear current name
   - Type a new name (e.g., "Jane Smith")
   - Click "Save"

4. **Verify Update**
   - Success notification appears: "Profile updated successfully"
   - Sidebar shows your new name
   - Modal closes automatically

### Expected Results:
- ✅ Profile form displays current name and email
- ✅ Name input field is editable
- ✅ Save button is clickable
- ✅ Success message appears
- ✅ Sidebar updates with new name
- ✅ Changes persist on page reload

---

## Feature 2: Password Update (with Validation) ✅

### How to Test:

1. **Navigate to Security Settings**
   - Login to your account
   - Click the profile button (top right)
   - Click "Security Settings" or find the Password section
   - Security form appears with password fields

2. **Attempt Invalid Password Change** (Test Validation)
   - **Test 2a: Missing Fields**
     - Leave all fields empty
     - Click "Update Password"
     - Error: "Please fill in all password fields"
   
   - **Test 2b: Passwords Don't Match**
     - Current Password: `password123`
     - New Password: `newpass123`
     - Repeat Password: `different456`
     - Click "Update Password"
     - Error: "New passwords do not match"
   
   - **Test 2c: Password Too Short**
     - Current Password: `password123`
     - New Password: `short`
     - Repeat Password: `short`
     - Click "Update Password"
     - Error: "New password must be at least 6 characters"
   
   - **Test 2d: Wrong Current Password**
     - Current Password: `wrongpassword`
     - New Password: `newpass123`
     - Repeat Password: `newpass123`
     - Click "Update Password"
     - Error: "Current password is incorrect"

3. **Successfully Update Password**
   - Current Password: `password123` (your actual current password)
   - New Password: `newpass123`
   - Repeat Password: `newpass123`
   - Click "Update Password"
   - Button shows "Updating..." while processing
   - Success: "Password updated successfully"
   - Form clears automatically

4. **Verify New Password Works**
   - Logout
   - Login again with new password: `newpass123`
   - Login succeeds ✅

### Expected Results:
- ✅ All validation errors work correctly
- ✅ Button shows loading state ("Updating...")
- ✅ Success message appears
- ✅ Form clears after success
- ✅ New password works for next login

### Important Notes:
- **Password requirements:**
  - Minimum 6 characters
  - Must match the repeat field
  - Must be different from current password
- **Current password validation:**
  - Must be your actual current password
  - Backend validates against encrypted hash
  - Incorrect password shows error

---

## Feature 3: Account Deletion (with Cascade Delete) ⚠️

### ⚠️ WARNING: This is PERMANENT and IRREVERSIBLE

### How to Test:

1. **Navigate to Delete Account**
   - Login to your account
   - Click the profile button (top right)
   - Scroll down to "Delete Account" section
   - Find the red "Delete Account" button

2. **Click Delete Account**
   - Red button: "Delete Account"
   - Browser shows confirm dialog:
     ```
     "Are you absolutely sure you want to delete your account? 
      This cannot be undone.
      
      All your data, campaigns, and email providers will be permanently deleted."
     ```

3. **Respond to Prompts**
   - Click "OK" on the confirmation dialog
   - Browser shows a text prompt:
     ```
     Type "DELETE" to confirm account deletion:
     ```
   - Type exactly: `DELETE`
   - Click "OK"

4. **Account Deleted**
   - Button shows "Deleting..." while processing
   - Success: "Account deleted successfully"
   - After ~1.5 seconds, automatically redirected to home page
   - Local storage cleared
   - User logged out

5. **Verify Deletion**
   - Try to login with the deleted account email
   - Login fails (user no longer exists)
   - All campaigns, email providers, and settings gone

### What Gets Deleted:
When you delete your account, the following are **permanently removed**:
- ✅ Your user account record
- ✅ All campaigns you created
- ✅ All email provider configurations
- ✅ All CSV uploads
- ✅ All email verification tokens
- ✅ All password reset tokens
- ✅ All email logs and records
- ✅ All activity logs

**This happens via CASCADE DELETE at the database level - it's instant and permanent.**

### Expected Results:
- ✅ Two-step confirmation (OK dialog + type "DELETE")
- ✅ Loading state appears ("Deleting...")
- ✅ Success message shown
- ✅ Redirected to home page after delay
- ✅ LocalStorage cleared
- ✅ User logged out
- ✅ Account cannot be recovered
- ✅ All related data permanently removed

### Test Safety:
**For testing, use a test email account that you're willing to delete permanently:**
- Do NOT use your primary email
- Create a fresh account: `testdelete@example.com`
- Test the deletion on this account
- Once deleted, you cannot recover it

---

## Testing Summary Checklist

### Profile Update
- [ ] Can open profile modal
- [ ] Current name displayed
- [ ] Can edit name field
- [ ] Save succeeds with new name
- [ ] Sidebar updates
- [ ] Changes persist on reload

### Password Update  
- [ ] Security form appears
- [ ] All validation messages work
- [ ] Cannot update with wrong current password
- [ ] Cannot update with mismatched new passwords
- [ ] Cannot update with password < 6 chars
- [ ] Can successfully update with valid input
- [ ] New password works for login

### Account Deletion
- [ ] Delete account button visible
- [ ] Confirmation dialog appears
- [ ] Must type "DELETE" to confirm
- [ ] Deletion succeeds
- [ ] Redirected to home page
- [ ] Account cannot be re-used
- [ ] All data permanently gone

---

## Troubleshooting

### Backend Not Responding
**Error:** "Failed to update profile" or "Network error"

**Solution:**
1. Verify backend is running: `mvn exec:java` in `c:\Users\tanis\Desktop\Java_mailer\backend`
2. Check port 8080 is open: Browser to `http://localhost:8080/api/users/profile`
3. Verify JWT token exists in localStorage (DevTools → Application → LocalStorage)

### Password Update Fails
**Error:** "Current password is incorrect"

**Solution:**
1. Verify you're entering your actual current password
2. Passwords are case-sensitive
3. Try logout/login to refresh session
4. Reset password if forgotten: Use "Forgot Password" link

### Delete Account Not Responding
**Error:** "Failed to delete account"

**Solution:**
1. Ensure backend is running
2. Check internet connection (if using remote backend)
3. Verify you typed exactly "DELETE" (uppercase, exact spelling)
4. Check DevTools console for error details

### LocalStorage Issues
**Clear cache if stuck:**
1. Press F12 to open DevTools
2. Application → LocalStorage → http://localhost:3000 (or file://)
3. Click "Delete All"
4. Refresh page and re-login

---

## Backend Endpoints Reference

| Feature | Method | Endpoint | Auth |
|---------|--------|----------|------|
| Get Profile | GET | `/api/users/profile` | JWT |
| Update Profile | PUT | `/api/users/profile` | JWT |
| Change Password | POST | `/api/users/change-password` | JWT |
| Delete Account | DELETE | `/api/users/delete-account` | JWT |

All endpoints require valid JWT token in `Authorization: Bearer <token>` header.

---

## Next Steps

1. ✅ Backend running on port 8080
2. ✅ All three features implemented and tested
3. ✅ All code compiled and validated
4. → **Open frontend/app.html in browser**
5. → **Login with test account**
6. → **Test all three features using steps above**

**Ready to test! 🚀**
