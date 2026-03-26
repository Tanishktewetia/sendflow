# 🚀 Quick Start Guide

## Prerequisites
- ✅ Java 17 installed (`java -version`)
- ✅ Maven installed (`mvn -version`)
- ✅ If Maven not installed, follow: [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)

---

## 5-Minute Quick Start

### 1️⃣ Install Dependencies (First Time Only)
```bash
cd java_mailer/backend
mvn clean install
```
⏱️ Takes 2-5 minutes. Grab coffee ☕

### 2️⃣ Start Backend Server
```bash
cd java_mailer/backend
mvn spring-boot:run
```
✅ Wait for: `Tomcat started on port(s): 8080`

### 3️⃣ Start Frontend (New Terminal/Tab)
```bash
cd java_mailer/frontend
python -m http.server 3000
```
✅ Wait for: `Serving HTTP on 0.0.0.0 port 3000`

### 4️⃣ Open UI
Visit: **http://localhost:3000**

🎉 **You're ready to go!**

---

## Using the Application

### Dashboard (Home Page)
- View campaign statistics
- Check backend health status
- Monitor email metrics

### Upload Page
1. Select CSV file with recipient data
2. Preview recipients
3. Upload to backend

### Compose Page
1. Enter email subject and body
2. Use `{{name}}`, `{{email}}` for personalization
3. Select recipients
4. Send campaign

### Sample CSV Format
```csv
name,email,company
John Doe,john@example.com,Acme Corp
Jane Smith,jane@example.com,Tech Inc
```

---

## Useful Commands

### Build Project
```bash
# Compile and test
mvn clean install

# Build standalone JAR
mvn clean package
```

### Run Backend
```bash
# Development (with auto-reload)
mvn spring-boot:run

# Production (from built JAR)
java -jar target/java-mailer-backend-1.0.0.jar
```

### View Logs
```bash
# Real-time logs while running
# Check browser developer tools (F12 > Console)
# Check backend terminal output
```

### Reset Everything
```bash
# Clear all compiled files
mvn clean

# Remove all dependencies
rm -rf ~/.m2/repository/com/javamailer
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 8080 in use | Kill process: `lsof -i :8080 \| kill -9 <PID>` |
| Maven not found | Install Maven from [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) |
| Build fails | Clear cache: `mvn clean` then try again |
| Frontend won't load | Use Python server or reload page browser cache (Ctrl+Shift+Del) |
| SMTP connection error | Update credentials in `application.properties` |

---

## Project Structure
```
java_mailer/
├── backend/           ← Spring Boot (port 8080)
│   ├── pom.xml
│   └── src/main/java/com/javamailer/
│       ├── controller/ (API endpoints)
│       ├── service/    (Business logic)
│       ├── model/      (Data classes)
│       └── util/       (Utilities)
│
├── frontend/          ← Vanilla JS (port 3000)
│   ├── index.html     (Login/Auth)
│   ├── app.html       (Main Dashboard with Compose & Upload)
│   ├── auth.html      (Authentication)
│   ├── css/styles.css
│   └── js/
│       ├── api-config.js
│       └── app.js
│
├── README.md          (Full documentation)
├── SETUP_INSTRUCTIONS.md (Detailed setup)
└── QUICK_START.md     (This file)
```

---

## API Endpoints

Base URL: `http://localhost:8080/api`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/emails/health` | Check if backend is running |
| GET | `/emails/stats` | Get campaign statistics |
| POST | `/emails/send` | Send email(s) |
| POST | `/emails/upload-csv` | Upload CSV file |

---

## Environment Configuration

Edit `backend/src/main/resources/application.properties` to:

- **Change port**: `server.port=9000`
- **Set email provider**: Gmail, Outlook, SendGrid, AWS SES
- **Configure SMTP**: Host, port, username, password
- **Set max upload size**: Default 10MB

---

## Next Steps (After Setup)

1. ✅ **Run the project** (follow steps above)
2. 📝 **Implement email service** (`EmailService.java`)
3. 📂 **Implement CSV parser** (`CsvService.java`)
4. 🔌 **Connect endpoints** (`EmailController.java`)
5. 💾 **Add database** (Spring Data JPA)
6. 🔐 **Add authentication** (JWT/OAuth2)

---

## Questions & Support

- 📖 Full Documentation: [README.md](README.md)
- 🛠️ Troubleshooting: [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md#-troubleshooting)
- 🔗 Spring Boot Docs: https://spring.io/projects/spring-boot
- 🔗 Maven Docs: https://maven.apache.org/

---

**Enjoy building with Java Mailer! 🎉**
