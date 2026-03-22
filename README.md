# Java Mailer - Complete Project Setup Documentation

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Folder Structure](#folder-structure)
3. [Prerequisites](#prerequisites)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Installation & Dependency Configuration](#installation--dependency-configuration)
7. [Running the Application](#running-the-application)
8. [API Documentation](#api-documentation)
9. [Troubleshooting](#troubleshooting)
10. [Project Dependencies Explained](#project-dependencies-explained)

---

## 📚 Project Overview

**Java Mailer** is a production-ready bulk email sending platform built with:

- **Backend**: Spring Boot 3.2.0 with Java 17
- **Frontend**: Vanilla JavaScript (HTML/CSS/JavaScript)
- **Purpose**: Send bulk emails to recipients with CSV file support and campaign tracking

### Key Features (Ready to Implement):
- ✅ CSV file upload for recipient lists
- ✅ Bulk email sending with personalization
- ✅ Campaign statistics and tracking
- ✅ Email scheduling
- ✅ REST API with CORS support
- ✅ Professional UI with responsive design

---

## 📁 Folder Structure

```
java_mailer/
├── README.md                          # This file
├── .gitignore                        # Git ignore rules
│
├── backend/                          # Spring Boot Backend
│   ├── pom.xml                       # Maven configuration & dependencies
│   └── src/
│       ├── main/
│       │   ├── java/com/javamailer/
│       │   │   ├── JavaMailerApplication.java      # Main Spring Boot entry point
│       │   │   ├── controller/
│       │   │   │   └── EmailController.java        # REST API endpoints
│       │   │   ├── service/
│       │   │   │   ├── EmailService.java           # Email sending logic
│       │   │   │   └── CsvService.java             # CSV parsing logic
│       │   │   ├── model/
│       │   │   │   ├── Email.java                  # Email entity
│       │   │   │   ├── Recipient.java              # Recipient entity
│       │   │   │   └── CampaignStats.java          # Campaign statistics
│       │   │   └── util/
│       │   │       └── EmailValidator.java         # Email validation utility
│       │   └── resources/
│       │       └── application.properties          # SMTP & app configuration
│       └── test/
│           └── java/                               # Unit tests
│
└── frontend/                         # HTML/CSS/JavaScript Frontend
    ├── index.html                    # Dashboard page
    ├── upload.html                   # CSV upload page
    ├── compose.html                  # Email compose page
    ├── css/
    │   └── styles.css                # Global styles & responsive design
    ├── js/
    │   ├── api-config.js             # API configuration & utilities
    │   ├── dashboard-handler.js      # Dashboard logic
    │   ├── upload-handler.js         # CSV upload logic
    │   └── compose-handler.js        # Email composition logic
    └── assets/                       # Images, fonts, etc. (optional)
```

---

## 🛠️ Prerequisites

Before setting up the project, ensure you have the following installed:

### Required Software

1. **Java Development Kit (JDK) 17+**
   - Download: https://www.oracle.com/java/technologies/downloads/
   - Verify: `java -version`

2. **Maven 3.8.0+** (for backend)
   - Download: https://maven.apache.org/download.cgi
   - Verify: `mvn -version`

3. **Git** (optional, for version control)
   - Download: https://git-scm.com/

4. **Text Editor or IDE**
   - VS Code (recommended) with extensions:
     - Extension Pack for Java
     - Maven for Java
     - Thunder Client (for API testing)
   - Or IntelliJ IDEA
   - Or Eclipse

---

## 🔧 Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd java_mailer/backend
```

### Step 2: Review Project Configuration (pom.xml)

The `pom.xml` file contains all backend configurations:

- **Maven Compiler Plugin**: Compiles Java source code
- **Spring Boot Maven Plugin**: Creates executable JAR files
- **Dependencies**: Listed below in detail

### Step 3: Configure SMTP Settings

Edit `src/main/resources/application.properties`:

```properties
# Update these values based on your email provider

# Gmail Example:
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your-email@gmail.com
spring.mail.password=your-app-password

# OR Outlook Example:
spring.mail.host=smtp-mail.outlook.com
spring.mail.port=587
spring.mail.username=your-email@outlook.com
spring.mail.password=your-password
```

**Note**: For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833), not your account password.

### Step 4: Package Structure

The backend is organized into clear layers following **Spring Boot best practices**:

- **Controller Layer** (`controller/`): HTTP request handlers
- **Service Layer** (`service/`): Business logic
- **Model Layer** (`model/`): Data entities and DTOs
- **Util Layer** (`util/`): Helper functions and validators

---

## 🎨 Frontend Setup

### Frontend Structure

The frontend is a **single-page application** with three main pages:

1. **Dashboard** (`index.html`)
   - Campaign statistics
   - Real-time email metric tracking
   - Backend health status

2. **Upload** (`upload.html`)
   - CSV file upload with drag & drop
   - CSV preview in table format
   - File validation

3. **Compose** (`compose.html`)
   - Email subject and body editor
   - HTML email support
   - Recipient filtering
   - Email preview

### Frontend Technology Stack

- **HTML5**: Semantic markup
- **CSS3**: Modern styles with CSS Grid, Flexbox, and animations
- **JavaScript (ES6+)**: Vanilla JS (no frameworks)
- **Responsive Design**: Mobile, tablet, and desktop support

### API Communication

- All frontend-backend communication uses `fetch()` API
- Configuration centralized in `js/api-config.js`
- CORS enabled on backend for frontend access

---

## 📦 Installation & Dependency Configuration

### Backend Dependencies Installation

```bash
cd java_mailer/backend
mvn clean install
```

**What this does:**
- Downloads all Maven dependencies (listed in pom.xml)
- Compiles Java source code
- Creates target/ directory with compiled classes
- Confirms no build errors

**Expected output:**
```
[INFO] BUILD SUCCESS
```

### Frontend Setup

**Note**: Frontend is vanilla JavaScript with no npm dependencies needed. Simply open `index.html` in a browser.

---

## ▶️ Running the Application

### Start Backend Server

```bash
# Navigate to backend directory
cd java_mailer/backend

# Option 1: Run with Maven (development mode with auto-reload)
mvn spring-boot:run

# Option 2: Build and run JAR (production mode)
mvn clean package
java -jar target/java-mailer-backend-1.0.0.jar
```

**Expected output:**
```
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_|\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v3.2.0)

2026-03-21 10:00:00.000 INFO 1234 --- [main] c.j.JavaMailerApplication : Starting JavaMailerApplication
...
2026-03-21 10:00:02.000 INFO 1234 --- [main] o.s.b.w.embedded.tomcat.TomcatWebServer : Tomcat started on port(s): 8080
```

### Start Frontend

**Option 1: Open directly in browser** (Simplest)
```bash
# From project root, open in browser
cd java_mailer/frontend
# Then open index.html in your web browser
# Or drag index.html to your browser
```

**Option 2: Use a local web server** (Recommended for development)

Using Python 3:
```bash
cd java_mailer/frontend
python -m http.server 3000
# Then visit http://localhost:3000
```

Using Node.js (if installed):
```bash
cd java_mailer/frontend
npx http-server -p 3000
# Then visit http://localhost:3000
```

Using VS Code Live Server extension:
- Right-click on `index.html` → "Open with Live Server"

---

## 🔌 API Documentation

### Base URL
```
http://localhost:8080/api
```

### Endpoints

#### 1. Health Check
```
GET /api/emails/health
Response: "Java Mailer Backend is running!"
```

#### 2. Send Email
```
POST /api/emails/send
Content-Type: application/json

Body:
{
  "to": "recipient@example.com",
  "subject": "Hello",
  "body": "<p>Email content</p>"
}
```

#### 3. Get Campaign Statistics
```
GET /api/emails/stats
Response:
{
  "totalEmails": 100,
  "sentEmails": 85,
  "failedEmails": 5,
  "pendingEmails": 10,
  "successRate": 85.0
}
```

#### 4. Upload CSV
```
POST /api/emails/upload-csv
Content-Type: multipart/form-data

Parameters:
- file: CSV file containing recipients
```

---

## 🐛 Troubleshooting

### Backend Issues

**Problem: "Port 8080 already in use"**
```bash
# Windows: Find and kill process on port 8080
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# macOS/Linux: Find and kill process
lsof -i :8080
kill -9 <PID>
```

**Problem: "Maven command not found"**
```bash
# Verify Maven installation
mvn -version

# If not found, add Maven to PATH:
# Windows: Set MAVEN_HOME environment variable
# macOS/Linux: export MAVEN_HOME=/path/to/maven
```

**Problem: "Java version not compatible"**
```bash
# Check Java version
java -version

# Must be 17 or higher. Download and install Java 17+
# Update JAVA_HOME environment variable
```

**Problem: SMTP connection failure**
- Verify `application.properties` SMTP settings
- Check email provider allows SMTP connections
- For Gmail: Ensure 2FA is enabled and App Password is generated
- Check firewall allows port 587 or 465

### Frontend Issues

**Problem: "API calls fail with CORS error"**
- Ensure backend is running on http://localhost:8080
- Frontend CORS should be enabled in backend (it is by default)
- Check browser console for exact error

**Problem: "Files won't upload"**
- Ensure CSV file is valid format (comma-separated values)
- File size must be under 10MB
- CSV must have `name` and `email` columns

**Problem: "Styles not loading"**
- Ensure `css/styles.css` path is correct
- Check browser developer tools (F12) for 404 errors
- Clear browser cache (Ctrl+Shift+Del)

---

## 📚 Project Dependencies Explained

### Backend Dependencies (Spring Boot)

| Dependency | Purpose | Why Needed |
|-----------|---------|-----------|
| **spring-boot-starter-web** | REST API support | Provides Spring MVC, Tomcat server, Jackson JSON processing |
| **spring-boot-starter-mail** | Email sending | SMTP client for sending emails to recipients |
| **spring-boot-devtools** | Development mode | Enables live reload - restarts app on code changes |
| **lombok** | Code generation | Reduces boilerplate: auto-generates getters/setters/constructors |
| **opencsv** | CSV parsing | Parses CSV files into Java objects |
| **spring-boot-starter-test** | Testing | JUnit 5, Mockito for unit tests |

### Frontend Dependencies

**None required!** The frontend uses:
- Vanilla JavaScript (ES6+)
- HTML5
- CSS3

All modern browsers support these natively.

### Build Tools

| Tool | Purpose |
|------|---------|
| **Maven** | Manages build process, downloads dependencies, compiles code |
| **Spring Boot Maven Plugin** | Packages application as executable JAR |

---

## 🚀 Next Steps for Development

After setup is complete, you can:

1. **Implement Email Service** (`backend/src/main/java/com/javamailer/service/EmailService.java`)
   - Add `JavaMailSender` from Spring Mail
   - Implement`sendEmail()` method
   - Handle email sending errors

2. **Implement CSV Service** (`backend/src/main/java/com/javamailer/service/CsvService.java`)
   - Use OpenCSV to parse files
   - Validate recipient data
   - Handle CSV parsing errors

3. **Implement Endpoints** (`backend/src/main/java/com/javamailer/controller/EmailController.java`)
   - Connect services to HTTP endpoints
   - Add request validation
   - Implement error handling

4. **Add Database** (Optional)
   - Add Spring Data JPA
   - Create entities and repositories
   - Implement campaign persistence

5. **Add Authentication** (Optional)
   - Implement JWT or OAuth2
   - Add user accounts
   - Implement role-based access control

---

## 📞 Support & Documentation

- **Spring Boot Docs**: https://spring.io/projects/spring-boot
- **Maven Docs**: https://maven.apache.org/
- **OpenCSV Guide**: http://opencsv.sourceforge.net/
- **CSS Reference**: https://developer.mozilla.org/en-US/docs/Web/CSS

---

## 📄 License

This project is a development template. Use as needed for your application.

---

**Last Updated**: March 21, 2026  
**Version**: 1.0.0  
**Java Version Required**: 17+  
**Maven Version Required**: 3.8.0+
#   s e n d f l o w  
 