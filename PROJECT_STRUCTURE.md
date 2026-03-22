# Java Mailer - Project Architecture & Structure

## 🏗️ Complete Project Architecture

```
java_mailer/
│
├── 📄 README.md                      ← START HERE: Full documentation
├── 📄 QUICK_START.md                 ← 5-minute setup guide
├── 📄 SETUP_INSTRUCTIONS.md          ← Install Maven & dependencies
├── 📄 PROJECT_STRUCTURE.md           ← This file
├── 📄 .gitignore                     ← Git exclusions
├── 🔧 SETUP.bat                      ← Windows setup script
│
├── 📁 backend/                       ← Spring Boot Application
│   ├── 📄 pom.xml                    ← Maven configuration
│   │   ├── Spring Boot 3.2.0 (parent)
│   │   └── 6 key dependencies
│   │
│   └── 📁 src/
│       ├── 📁 main/
│       │   ├── 📁 java/com/javamailer/
│       │   │   ├── ⭐ JavaMailerApplication.java
│       │   │   │  └── Main Spring Boot entry point
│       │   │   │
│       │   │   ├── 📁 controller/
│       │   │   │  └── EmailController.java
│       │   │   │     • GET  /emails/health
│       │   │   │     • GET  /emails/stats
│       │   │   │     • POST /emails/send
│       │   │   │     • POST /emails/upload-csv
│       │   │   │
│       │   │   ├── 📁 service/
│       │   │   │  ├── EmailService.java
│       │   │   │  │  └── Email sending business logic
│       │   │   │  └── CsvService.java
│       │   │   │     └── CSV parsing logic
│       │   │   │
│       │   │   ├── 📁 model/
│       │   │   │  ├── Email.java
│       │   │   │  │  └── Email entity with @Data (Lombok)
│       │   │   │  ├── Recipient.java
│       │   │   │  │  └── Recipient entity
│       │   │   │  └── CampaignStats.java
│       │   │   │     └── Campaign statistics entity
│       │   │   │
│       │   │   └── 📁 util/
│       │   │      └── EmailValidator.java
│       │   │         └── Static utility methods
│       │   │
│       │   └── 📁 resources/
│       │      └── application.properties (SMTP config)
│       │         ├── Server: port 8080
│       │         ├── Mail: SMTP settings
│       │         ├── Logging: INFO level
│       │         └── File upload: 10MB max
│       │
│       └── 📁 test/
│          └── java/
│             └── (Unit tests directory)
│
└── 📁 frontend/                      ← Vanilla JS + HTML/CSS
    ├── 📄 index.html                 ← Dashboard page
    │  └── Campaign statistics, health status
    │
    ├── 📄 upload.html                ← CSV upload page
    │  └── File upload, drag-drop, preview
    │
    ├── 📄 compose.html               ← Email composition page
    │  └── Subject, body, recipients, preview
    │
    ├── 📁 css/
    │  └── styles.css                 ← Global styles (650+ lines)
    │     ├── Navbar (sticky, gradient)
    │     ├── Dashboard cards
    │     ├── Forms & inputs
    │     ├── File upload
    │     ├── Tables & previews
    │     ├── Buttons & status messages
    │     ├── Responsive design (mobile, tablet, desktop)
    │     └── Animations & transitions
    │
    ├── 📁 js/
    │  ├── api-config.js              ← API configuration & utilities
    │  │  ├── API endpoint definitions
    │  │  ├── Generic fetch() wrapper
    │  │  ├── CSV parser function
    │  │  └── Helper functions
    │  │
    │  ├── dashboard-handler.js       ← Dashboard logic
    │  │  ├── Load statistics (auto-refresh every 5s)
    │  │  ├── Check backend health
    │  │  └── Update UI
    │  │
    │  ├── upload-handler.js          ← CSV upload logic
    │  │  ├── File validation
    │  │  ├── Drag & drop handling
    │  │  ├── CSV preview table
    │  │  └── Upload to backend
    │  │
    │  └── compose-handler.js         ← Email composition logic
    │     ├── Email preview
    │     ├── Form validation
    │     ├── Recipient filtering
    │     └── Send campaign
    │
    └── 📁 assets/                    ← Images, fonts, etc. (optional)
```

---

## 🔄 Data Flow Architecture

### Email Sending Flow
```
┌─────────────────┐
│   Frontend UI   │
│  (index.html)   │
└────────┬────────┘
         │ User clicks "Compose Email"
         ▼
┌─────────────────────────────────────────┐
│  compose.html (Email Form)              │
│  • Subject input                        │
│  • HTML Body textarea                   │
│  • Recipient selector                   │
│  • Live preview                         │
└────────┬────────────────────────────────┘
         │ User submits form
         ▼
┌─────────────────────────────────────────────────────┐
│  js/compose-handler.js                              │
│  • Validate inputs                                  │
│  • Create JSON payload                              │
│  • POST to /api/emails/send                         │
└────────┬────────────────────────────────────────────┘
         │ HTTP POST Request
         ▼
┌──────────────────────────────────────────────────────────┐
│  Backend: EmailController                                │
│  @PostMapping("/emails/send")                            │
│  • Receive JSON payload                                  │
│  • Validate request data                                 │
│  • Call EmailService.sendEmail()                         │
└────────┬─────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  Backend: EmailService                                   │
│  • Build MIME message                                    │
│  • Connect to SMTP server                                │
│  • Send email via JavaMailSender                         │
│  • Log results                                           │
│  • Return success/failure                                │
└────────┬─────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  SMTP Provider (Gmail, Outlook, SendGrid, etc.)         │
│  • Deliver email to recipient                            │
└──────────────────────────────────────────────────────────┘
```

### CSV Upload Flow
```
┌─────────────────────────┐
│  upload.html            │
│  File Input             │
└────────┬────────────────┘
         │ User selects CSV
         ▼
┌──────────────────────────────────────────────────┐
│  js/upload-handler.js                            │
│  • Validate file (CSV, <10MB)                    │
│  • Read file content                             │
│  • Parse CSV to objects (parseCSV)               │
│  • Display preview table                         │
│  • Enable upload button                          │
└────────┬─────────────────────────────────────────┘
         │ User clicks "Upload"
         ▼
┌──────────────────────────────────────────────────┐
│  FormData Upload                                 │
│  POST /api/emails/upload-csv                     │
│  • Multipart form data                           │
│  • File + recipients JSON                        │
└────────┬─────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│  Backend: EmailController                        │
│  @PostMapping("/emails/upload-csv")              │
│  • Receive uploaded file                         │
│  • Call CsvService.parseRecipients()             │
│  • Store/validate recipients                     │
│  • Return success                                │
└──────────────────────────────────────────────────┘
```

---

## 📦 Dependency Breakdown

### Backend Dependencies

#### Production Dependencies
```
Spring Boot 3.2.0 (Parent POM)
├── spring-boot-starter-web
│   ├── Provides REST API support
│   ├── Includes Spring MVC
│   ├── Includes Tomcat embedded server
│   └── Includes Jackson JSON processing
│
├── spring-boot-starter-mail
│   ├── Provides JavaMailSender
│   ├── Enables SMTP email sending
│   └── Supports HTML emails
│
├── spring-boot-devtools
│   ├── Live reload during development
│   ├── Automatic restart on code change
│   └── Optional (only in development)
│
├── lombok
│   ├── Code generator via annotations
│   ├── Creates @Data, @NoArgsConstructor, @Builder
│   ├── Reduces boilerplate 70%
│   └── Optional (@Compile only)
│
└── opencsv 5.9
    ├── CSV file parsing
    ├── Maps CSV columns to Java objects
    ├── Handles special characters
    └── Part of external libraries
```

#### Test Dependencies
```
spring-boot-starter-test
├── JUnit 5
├── Mockito
├── AssertJ
└── Spring Test
```

### Frontend Dependencies
```
✅ ZERO external dependencies!

Uses:
- Plain HTML5
- CSS3 (Grid, Flexbox, Media Queries)
- Vanilla JavaScript (ES6+)
- fetch() API for HTTP calls
- FileReader API for file handling
```

---

## 🔌 Connectivity Map

```
User Browser (localhost:3000)
│
├─── index.html (Dashboard)
│    └─ GET /api/emails/health (auto-refresh 5s)
│       GET /api/emails/stats (auto-refresh 5s)
│
├─── upload.html (CSV Upload)
│    └─ POST /api/emails/upload-csv (file + data)
│
└─── compose.html (Email Compose)
     └─ POST /api/emails/send (email payload)
         └─ Backend service connects to SMTP
```

---

## 🔧 Configuration Files

### application.properties (Key Settings)
```properties
# Server
server.port=8080
server.servlet.context-path=/api

# SMTP Configuration
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=YOUR_EMAIL@gmail.com
spring.mail.password=YOUR_APP_PASSWORD

# File Upload
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB

# Logging
logging.level.com.javamailer=DEBUG

# Jackson (JSON)
spring.jackson.default-property-inclusion=non_null
```

### pom.xml (Build Configuration)
```xml
Parent: Spring Boot 3.2.0
Java Version: 17
Maven Plugins:
- spring-boot-maven-plugin (packaging)
- maven-compiler-plugin (compilation)
```

---

## 🎯 Design Patterns Used

### Backend Patterns
- **Layered Architecture**: Controller → Service → Model
- **Dependency Injection**: Spring's @Autowired
- **RESTful API**: Proper HTTP methods (GET, POST)
- **Data Transfer Objects**: Request/Response separation
- **Factory Pattern**: Lombok @Builder

### Frontend Patterns
- **MVC Pattern**: Models (JS objects), Views (HTML), Controllers (JS handlers)
- **Event-Driven**: User actions trigger handlers
- **API Abstraction**: Centralized API config
- **Helper Functions**: Reusable utilities (formatBytes, showNotification)
- **Responsive Design**: Mobile-first CSS

---

## 🚀 Scalability Considerations

### Current State
- Single-server deployment
- No database
- In-memory statistics
- CORS enabled for development

### To Add for Production
- Database (PostgreSQL, MySQL)
- Caching (Redis)
- Message Queue (RabbitMQ, Kafka)
- Authentication & Authorization
- Load balancing
- Container deployment (Docker/Kubernetes)
- Monitoring & Logging (ELK, Datadog)
- Email queue management
- Rate limiting
- API versioning (/api/v1, /api/v2)

---

## 📋 Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend Runtime** | Java 17 JDK | Server-side execution |
| **Backend Framework** | Spring Boot 3.2.0 | REST API & DI Container |
| **Backend Build** | Maven 3.8.0+ | Dependency management & build |
| **Backend Email** | JavaMail/Spring Mail | SMTP email sending |
| **CSV Processing** | OpenCSV 5.9 | CSV file parsing |
| **Code Generation** | Lombok | Reduce boilerplate |
| **Frontend Runtime** | Browser (Chrome, Firefox, Safari, Edge) | User interface |
| **Frontend Markup** | HTML5 | Semantic content |
| **Frontend Styling** | CSS3 | Responsive design |
| **Frontend Logic** | JavaScript ES6+ | Interactivity & API calls |
| **Version Control** | Git | Code management |

---

## ✨ Code Quality Features

- ✅ Spring Boot best practices
- ✅ REST API conventions
- ✅ CORS-enabled
- ✅ Comprehensive error handling
- ✅ Responsive web design
- ✅ Accessibility considerations (semantic HTML)
- ✅ Clean code structure
- ✅ Clear naming conventions
- ✅ Extensive documentation
- ✅ Production-ready configuration

---

**Java Mailer is production-ready for core functionality. Happy coding! 🎉**
