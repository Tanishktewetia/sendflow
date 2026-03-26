# Supabase Storage Configuration Guide

## Problem
Avatar images are not uploading to the private `avatar_img` bucket because:
- ❌ Current key: **ANON key** (can only access PUBLIC buckets)
- ✅ Required key: **SERVICE_ROLE key** (can access PRIVATE buckets)

---

## Solution - Get SERVICE_ROLE Key

### Step 1: Go to Supabase Dashboard
1. Open: https://app.supabase.com/project/gksgsxkusmorkbtkjemh/settings/api
2. Look for two keys:
   - **`anon public`** - Current (WRONG for private buckets)
   - **`service_role secret`** - CORRECT for backend operations

### Step 2: Copy SERVICE_ROLE Key
- Find the **"service_role"** section
- Copy the **SECRET** key (not the public one)
- Format: `eyJhbGci...` (very long JWT token)

### Step 3: Update Backend Configuration
Replace the value in `application.properties`:

**File:** `backend/src/main/resources/application.properties`

**Find this line:**
```properties
supabase.api-key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrsgHNkdWpIeywiYWxsb3dlZEZvcklkIjpudWxsLCJjYW4iOnsiMiIsImFjdGlvuXsiY2xvdWRzdG9yYWdlIjp7Il91c2VyX2lkIn19LCJzdWIiOiJ2Yd1lZDVmZWlhcmM3L3Q4YmkzNWlucmxhaTkiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMDAwMDAwMDAwLCJpYXQiOjE3NTUyMDk0MTIsImVtYWlsIjoiIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJhbm9uIn0sInVzZXJfbWV0YWRhdGEiOnt9fQ.6lquwVQQmGPWKKkZhGZYbKjmj2sOMNYe83W66JdP5f4
```

**Replace with**:
```properties
supabase.api-key=[YOUR_SERVICE_ROLE_KEY_HERE]
```

### Step 4: Rebuild & Redeploy Backend
```bash
cd backend
mvn clean package -DskipTests
java -jar target/java-mailer-backend-1.0.0.jar
```

---

## Verification

### Check Supabase Dashboard
After upload, verify files appear in:
**Storage → avatar_img bucket**

Files should have path: `{userId}/{type}_{timestamp}_{uuid}.jpg`
Example: `123/avatar_1711411234567_a1b2c3d4.jpg`

### Test Upload Flow
1. Open frontend: http://localhost:3000
2. Settings → Profile
3. Select image file → Upload
4. Check dashboard → bucket shows new file ✅

---

## Key Differences

| Feature | Anon Key | Service Role Key |
|---------|----------|------------------|
| **Public buckets** | ✅ Read/Write | ✅ Read/Write |
| **Private buckets** | ❌ Blocked | ✅ Full Access |
| **Used by** | Frontend clients | Backend only |
| **Security** | Limited (public ops) | Unrestricted (backend) |

---

## Current Configuration

**Project ID:** `gksgsxkusmorkbtkjemh`

**Supabase URL:** `https://gksgsxkusmorkbtkjemh.supabase.co`

**Buckets:**
- `avatar_img` (PRIVATE) - Profile pictures
- `csv_uploads` (PRIVATE) - Uploaded CSV files

Both buckets require SERVICE_ROLE key for backend operations.
