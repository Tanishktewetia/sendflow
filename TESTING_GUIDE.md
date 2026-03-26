# Profile Management - Testing Guide

## Current Status
✅ Backend: Running on http://localhost:8080/api
✅ Frontend: Ready on http://localhost:3000 (or file:// protocol)
✅ Database: Connected to Supabase PostgreSQL

## Features Implemented

### 1. Profile Update
**Location**: Profile Modal
**Steps to Test**:
1. Log in to the application
2. Click the **user profile icon** in the sidebar (top-right area)
3. Click **"Profile"** from the dropdown menu
4. Edit the **"Display name"** field
5. Click **"Save"** button
6. Observe:
   - Button shows "Saving..."
   - Success message appears
   - Sidebar display name updates
   - Modal closes

**What Happens Behind the Scenes**:
- Frontend sends: `PUT /api/users/profile` with `{fullName: "new name"}`
- Backend validates JWT token from request
- Backend updates `users` table `full_name` column
- Backend returns updated user data
- Frontend updates localStorage and UI

**Expected Result**: ✅ Profile name updated in database and UI

---

### 2. Password Update
**Location**: Settings → Security Section
**Steps to Test**:
1. Click user profile icon in sidebar
2. Click **"Settings"** from dropdown
3. Scroll down to **"Security"** section
4. Fill in:
   - **Current Password**: Your actual login password
   - **New Password**: New password (min 6 chars)
   - **Repeat New Password**: Same as new password
5. Click **"Updating..."** button
6. Observe:
   - Button is disabled during update
   - Success message appears
   - Form clears
   - Modal can stay open (password changed)

**What Happens Behind the Scenes**:
- Frontend validates passwords match and meet requirements
- Frontend sends: `POST /api/users/change-password` with JWT token
- Backend retrieves user from database
- Backend checks old password against stored hash using BCrypt
- If match: Backend hashes new password and updates database
- If mismatch: Backend returns error "Old password is incorrect"
- Frontend shows appropriate success or error message

**Expected Result**: ✅ Next login will require the NEW password

---

### 3. Delete Account
**Location**: Settings → Bottom of page
**Steps to Test**:
1. Click user profile icon in sidebar
2. Click **"Settings"** from dropdown
3. Scroll to the very bottom
4. Find **"Delete Account"** button (red/danger color)
5. Click it
6. Browser shows confirmation dialog: "Are you absolutely sure?"
7. Click "OK" to proceed
8. Browser shows second prompt: "Type DELETE to confirm:"
9. Type exactly: **DELETE**
10. Click OK
11. Observe:
    - Button shows "Deleting..."
    - Success message "Account deleted successfully"
    - Page redirects to home page (index.html)
    - All local data cleared

**What Happens Behind the Scenes**:
- Frontend sends: `DELETE /api/users/delete-account` with JWT token
- Backend retrieves user ID from JWT
- Backend deletes user from `users` table
- PostgreSQL cascade delete triggers automatically remove:
  - All user's campaigns from `campaigns` table
  - All email providers from `email_providers` table
  - All CSV uploads from `csv_uploads` table
  - All password reset tokens from `password_reset_tokens` table
  - All email verification tokens from `email_verification_tokens_table`
  - Any other user-related data
- Backend returns success message
- Frontend clears localStorage
- Frontend redirects to home page

**Expected Result**: ✅ User account and ALL associated data completely removed from database

---

## API Endpoints Reference

### Profile Management

**Get Profile**
```
GET /api/users/profile
Authorization: Bearer {jwt_token}
Response: {userId, email, fullName, isEmailVerified, isActive, createdAt, lastLoginAt}
```

**Update Profile**
```
PUT /api/users/profile
Authorization: Bearer {jwt_token}
Body: {fullName: "New Name"}
Response: {message, userId, fullName}
```

**Change Password**
```
POST /api/users/change-password
Authorization: Bearer {jwt_token}
Body: {currentPassword: "old", newPassword: "new"}
Response: {message, userId}
Error: {error: "Old password is incorrect"}
```

**Delete Account**
```
DELETE /api/users/delete-account
Authorization: Bearer {jwt_token}
Response: {message: "Account deleted successfully"}
```

**Deactivate Account** (Alternative to delete - only marks inactive)
```
POST /api/users/deactivate
Authorization: Bearer {jwt_token}
Response: {message: "Account deactivated successfully"}
```

---

## Validation Rules

### Password Update
- Current password must match what's in the database
- New password must be at least 6 characters
- New password must match repeat password field
- New password cannot be same as current password

### Delete Account
- Requires 2-step confirmation (dialog + type "DELETE")
- Must be authenticated (valid JWT token)
- Irreversible - all data permanently deleted

### Profile Update
- Display name is required (cannot be empty)
- Email cannot be changed from this form (read-only)

---

## Troubleshooting

**"Button stays on Saving..."**
- Backend might not be running
- Check: `http://localhost:8080/api/emails/health` returns 200
- Check network tab in browser DevTools for response

**"Current password is incorrect"**
- Make sure you entered your actual login password
- Passwords are case-sensitive
- Try logging out and back in to confirm password works

**"Failed to delete account"**
- Make sure you typed "DELETE" exactly (uppercase, no quotes)
- You must be authenticated (valid session)
- Check browser console for error details

**No response from backend**
- Verify backend is running: `mvn exec:java` in backend directory
- Check port 8080 is not in use by another application
- Verify database connection string in application.properties

---

## Files Modified

### Frontend
- `frontend/js/app.js`: Added setup calls for security and delete functions

### Backend  
- `backend/src/main/java/com/javamailer/controller/UserController.java`: Added DELETE endpoint
- `backend/src/main/java/com/javamailer/service/UserService.java`: Added deleteUser() method

---

## Database Changes
No schema changes needed - all tables already have foreign key constraints with CASCADE delete
