# Backend Logs Guide - View Java Errors

## The Problem You Mentioned
"I cannot give you the exact issue since it is in Java not JS therefore nothing on the console."

**Solution:** This guide shows how to view backend Java errors!

---

## Method 1: View Logs in Terminal (EASIEST)

When you start the backend with:
```bash
cd C:\Users\tanis\Desktop\Java_mailer\backend
mvn exec:java -Dexec.mainClass=com.javamailer.JavaMailerApplication -q
```

**All Java errors and logs print directly to the terminal!**

### What to Look For:

#### ❌ **ERROR Logs** (Red)
```
[ERROR] NullPointerException in UserService.java:45
[ERROR] Transaction silently rolled back because...
[ERROR] org.springframework.orm.jpa.JpaSystemException...
```

#### ⚠️ **WARNING Logs** (Yellow)
```
[WARN] No property found for column...
[WARN] Connection timeout detected
```

#### ℹ️ **INFO Logs** (Blue)
```
[INFO] Application started on port 8081
[INFO] Database connection established
[INFO] Spring Security initialized
```

#### 🔍 **DEBUG Logs** (if needed)
```
[DEBUG] Executing SQL: INSERT INTO users...
[DEBUG] User ID generated: 42
```

---

## Method 2: Enable Logging Configuration

Create or edit this file to control log levels:

**File:** `backend/src/main/resources/application.properties`

Add or modify these settings:

```properties
# Global log level (DEBUG, INFO, WARN, ERROR)
logging.level.root=INFO

# Java Mailer app logs (MORE DETAILED)
logging.level.com.javamailer=DEBUG

# Spring Framework logs
logging.level.org.springframework=INFO
logging.level.org.springframework.security=DEBUG

# Database logs (SQL queries)
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE

# Output format
logging.pattern.console=%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n
```

Then restart the backend to see more detailed logs!

---

## Method 3: Save Logs to a File

Add to `application.properties`:

```properties
# Save logs to file
logging.file.name=logs/app.log

# Keep old files (rotate)
logging.file.max-size=10MB
logging.file.max-history=10

# Log format in file
logging.pattern.file=%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n
```

Then view logs anytime:
```bash
# View last 50 lines of logs
type logs/app.log | tail -50

# Or open in Notepad
notepad logs/app.log
```

---

## Method 4: Add Custom Logging to Java Code

Add logging to key places. Example:

**In `AuthService.java`:**
```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@Transactional(noRollbackFor = Exception.class)
public class AuthService {
    
    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);
    
    public User registerUser(String email, String password, String fullName) {
        logger.info("📝 Registering user: {}", email);
        
        // Check if email already exists
        if (userService.isEmailTaken(email)) {
            logger.warn("⚠️ Registration attempt with duplicate email: {}", email);
            throw new RuntimeException("Email already registered: " + email);
        }
        
        logger.debug("✓ Email {} is unique", email);
        
        User user = userService.createUser(email, password, fullName);
        logger.info("✓ User created with ID: {}", user.getId());
        
        return userRepository.save(user);
    }
    
    public String requestPasswordReset(String email) {
        logger.info("🔐 Password reset requested for: {}", email);
        // ... rest of code
    }
}
```

Then you'll see in terminal:
```
14:32:45.123 [http-8081-1] INFO  com.javamailer.service.AuthService - 📝 Registering user: tanishktewetia@gmail.com
14:32:45.456 [http-8081-1] INFO  com.javamailer.service.AuthService - ✓ User created with ID: 4
```

---

## Method 5: Capture Output When Running JAR

If running JAR file:

```bash
# Capture all output to file
java -jar target/java-mailer-backend-1.0.0.jar > app.log 2>&1

# View live
powershell -Command "Get-Content app.log -Wait"

# Or open in Notepad
notepad app.log
```

---

## Real-Time Log Monitoring Script

Create `monitor-logs.ps1`:

```powershell
# Monitor logs in real-time
Get-Content logs/app.log -Wait -Tail 50 |
    ForEach-Object {
        if ($_ -match 'ERROR|Exception') {
            Write-Host $_ -ForegroundColor Red
        } elseif ($_ -match 'WARN') {
            Write-Host $_ -ForegroundColor Yellow
        } elseif ($_ -match 'INFO') {
            Write-Host $_ -ForegroundColor Green
        } else {
            Write-Host $_
        }
    }
```

Run with:
```bash
powershell -ExecutionPolicy Bypass -File monitor-logs.ps1
```

---

## Quick Troubleshooting Checklist

When something fails, check logs for:

### Error: "Transaction silently rolled back"
```
[ERROR] Transaction silently rolled back because it has been marked as rollback-only
```
👉 **Solution:** Check if email sending is failing (look for errors before this message)

### Error: "Email not verified"
```
[ERROR] org.springframework.security.authentication.BadCredentialsException: Email not verified
```
👉 **Solution:** User hasn't clicked verification link - send verification link again

### Error: "Duplicate key value"
```
[ERROR] org.postgresql.util.PSQLException: ERROR: duplicate key value violates unique constraint "users_email_key"
```
👉 **Solution:** Check if duplicate email check is working (we fixed this!)

### Error: "Connection refused"
```
[ERROR] java.sql.SQLException: Connection refused
```
👉 **Solution:** Database not running or wrong connection string

### Slow Queries
```
[DEBUG] SQL took 2500ms: SELECT * FROM users WHERE email = ?
```
👉 **Solution:** Database query is slow - add indexes or optimize

---

## Backend Restart & Log Monitoring Flow

```bash
# Terminal 1: Start backend
cd C:\Users\tanis\Desktop\Java_mailer\backend
mvn exec:java -Dexec.mainClass=com.javamailer.JavaMailerApplication

# Terminal 2: Monitor in real-time (if using file output)
tail -f logs/app.log

# Terminal 3: Test (Python tests, API calls, etc)
python test_registration_with_otp.py
```

---

## What You'll See When Starting Backend

Look for these success messages:

```
[INFO] Starting com.javamailer.JavaMailerApplication
[INFO] The following 1 profile is active: "default"
[INFO] Tomcat initialized with port(s): 8081 (http)
[INFO] Business profile loaded
[INFO] Database connection established
[INFO] Application started in 3.456 seconds
```

If you DON'T see "Application started", there's an error above it. **Scroll up in the terminal to find it!**

---

## Key Logs to Watch For During Registration

```
Step 1 - User submits form:
[INFO] 📝 Registering user: tanishktewetia@gmail.com

Step 2 - Duplicate check:
[INFO] ✓ Email is unique

Step 3 - User created:
[INFO] ✓ User created with ID: 4

Step 4 - Verification token generated:
[INFO] ✓ Verification token generated

Step 5 - Email sent:
[INFO] 📧 Sending verification email to: tanishktewetia@gmail.com
[INFO] ✓ Email sent successfully

Result:
Response 201 ✓ Registration successful
```

---

## Summary

| Method | Best For | How |
|--------|----------|-----|
| Terminal output | Real-time debugging | Just watch the terminal where backend runs |
| Log file | Permanent record | `logging.file.name=logs/app.log` |
| Custom logging | Detailed tracing | Add `logger.info()` to Java code |
| Log levels | Filtering noise | Set `logging.level.*` in properties |
| Tail -f | Live monitoring | `Get-Content logs/app.log -Wait` |

Start with **Method 1 (Terminal Output)** - it's the easiest!
