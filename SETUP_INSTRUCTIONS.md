# Installation & Setup Instructions

## ⚠️ IMPORTANT: Verify Prerequisites

Before proceeding, ensure you have:
- ✅ **Java 17 or higher** - Check with: `java -version`
- ✅ **Maven 3.8.0+** - Check with: `mvn -version`

---

## 🔴 If Maven is NOT installed:

### Windows Installation Guide

#### Step 1: Download Maven

1. Visit: **https://maven.apache.org/download.cgi**
2. Download: **apache-maven-3.9.x-bin.zip** (Binary archive)
3. Extract to: `C:\apache-maven-3.9.x` (or any folder without spaces)

#### Step 2: Set up Environment Variables

1. **Right-click "This PC"** on Desktop or File Explorer
2. Select **"Properties"**
3. Click **"Advanced system settings"** (on the left)
4. Click **"Environment Variables"** button
5. Create New System Variable:
   - Variable Name: `MAVEN_HOME`
   - Variable Value: `C:\apache-maven-3.9.x` (your Maven folder)
   - Click OK

6. Edit `PATH` Variable:
   - Click "PATH" in System Variables
   - Click **"Edit"**
   - Click **"New"**
   - Add: `%MAVEN_HOME%\bin`
   - Click OK to close all windows

#### Step 3: Verify Installation

Close all terminals and open a **NEW** terminal/PowerShell window:

```bash
mvn -version
```

Expected output:
```
Apache Maven 3.9.x (...)
Maven home: C:\apache-maven-3.9.x
...
```

## ✅ If Maven IS installed:

Run this command to install all dependencies:

```bash
cd java_mailer/backend
mvn clean install
```

**What this command does:**
- `clean` - Removes previously compiled files
- `install` - Downloads 100+ dependencies and compiles project

**Expected output:**
```
[INFO] BUILD SUCCESS
```

**Duration:** 2-5 minutes (depending on internet speed)

---

## 🚀 Running the Application

### Start Backend Server

```bash
cd java_mailer/backend
mvn spring-boot:run
```

**Expected output:**
```
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_|\__, | / / / /
 =========|_|==============|___/=/_/_/_/

2026-03-21 10:00:02 INFO o.s.b.w.embedded.tomcat.TomcatWebServer : Tomcat started on port(s): 8080
```

Backend is running at: **http://localhost:8080/api**

### Start Frontend

**Option 1: Direct Browser (Simplest)**
```bash
# Navigate to frontend folder and open index.html in browser
cd java_mailer/frontend
# Double-click index.html OR drag to browser
```

**Option 2: Python Web Server**
```bash
cd java_mailer/frontend
python -m http.server 3000
# Visit http://localhost:3000 in browser
```

**Option 3: VS Code Live Server**
- Right-click `index.html`
- Select "Open with Live Server"

---

## ⚙️ Configure SMTP (Before Sending Emails)

Edit `backend/src/main/resources/application.properties`:

### Gmail Setup:
```properties
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your-email@gmail.com
spring.mail.password=your-app-password
```

**To get Gmail App Password:**
1. Enable 2-Step Verification: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Copy the 16-character password
4. Paste into `application.properties`

### Outlook Setup:
```properties
spring.mail.host=smtp-mail.outlook.com
spring.mail.port=587
spring.mail.username=your-email@outlook.com
spring.mail.password=your-password
```

### Other Email Providers:
- SendGrid, AWS SES, or Mailgun configurations available in comments

---

## 📋 Troubleshooting

### "mvn command not found" on Mac/Linux
```bash
# Check if Maven is in PATH
echo $PATH

# If missing, add to .zshrc or .bash_profile
export MAVEN_HOME=/path/to/maven
export PATH="$MAVEN_HOME/bin:$PATH"

# Apply immediately
source ~/.zshrc
```

### "Port 8080 already in use" on Windows
```bash
# Find process using port 8080
netstat -ano | findstr :8080

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F
```

### "Port 8080 already in use" on Mac/Linux
```bash
# Find process using port 8080
lsof -i :8080

# Kill the process (replace PID with actual number)
kill -9 <PID>
```

### Maven downloading dependencies forever
- Check internet connection
- Try: `mvn clean install -U` (force update)
- Clear Maven cache: `rm -rf ~/.m2/repository`

### Frontend shows "Cannot GET /"
- Ensure you're accessing the correct URL
- Try opening `index.html` directly or use Python/Node server
- Check browser console (F12) for errors

---

## 📞 Quick Reference

| Task | Command |
|------|---------|
| Build Backend | `mvn clean install` |
| Run Backend | `mvn spring-boot:run` |
| Run Tests | `mvn test` |
| Build JAR | `mvn clean package` |
| Run JAR | `java -jar target/java-mailer-backend-1.0.0.jar` |
| Start Frontend Server | `python -m http.server 3000` |
| View Backend API | http://localhost:8080/api/emails/health |

---

## ✨ You're All Set!

The project is ready for development. Happy coding! 🎉
