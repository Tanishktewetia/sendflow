# Project Technical Q&A

## 1. How was the frontend created, how were endpoint calls managed, and how did we run it on an HTTP server?

The frontend was built as a static web app using:
- HTML pages (app, auth, index, forgot-password, static pages)
- CSS stylesheets for layout and UI
- Vanilla JavaScript modules for behavior and API communication

Endpoint calls were managed through a centralized API config layer:
- One base URL (`http://localhost:8080/api`)
- A route map object for endpoint strings
- Shared `apiCall()` wrapper to add headers, parse responses, and handle auth failures

So instead of hardcoding URLs everywhere, the frontend calls constants and helper methods.

The frontend is run as static files on an HTTP server:
- Local dev command: `python -m http.server 3000`
- Then browser opens: `http://localhost:3000`

This is enough because the frontend is static and the backend is separate on port 8080.

---

## 2. How was backend coding done (like FastAPI in Python, what was used here)?

Backend is built with Spring Boot (Java), which is the Java equivalent of a modern backend framework.

Key pattern used:
- Controllers define REST endpoints with annotations (`@GetMapping`, `@PostMapping`, etc.)
- Services hold business logic
- Repositories handle database operations (Spring Data JPA)
- Entities map Java classes to database tables

So where Python has FastAPI routers + services + ORM, here we used:
- Spring MVC (REST controllers)
- Spring Boot dependency injection
- Spring Data JPA + Hibernate

---

## 3. What technology connected DB to Java backend, and how was emailing system built?

### Database connection stack
- PostgreSQL driver (`org.postgresql`)
- Spring Data JPA for ORM/repository abstraction
- Hibernate as JPA implementation
- HikariCP connection pool
- Flyway for schema migration/versioning
- Supabase PostgreSQL as hosted DB

### Emailing “brain” architecture
The email system is provider-driven and service-layer based:
- `EmailProviderService` for provider config/verification
- `EmailService` for sending flow
- Sender utility implementations for different provider types (SMTP/Gmail/Outlook/Resend)
- Campaign execution service loops through recipients and dispatches mails
- System email service handles OTP/verification style mails

This design separates:
- Provider credential management
- Template/recipient processing
- Actual transport sending

---

## 4. How was queue system implemented?

Queue logic is split into two related flows:

### Campaign queue
- Queue entries stored in DB (`CampaignQueue`)
- `QueueService` handles queue state transitions (queued, processing, paused, completed, failed)
- `CampaignExecutorService` processes recipients row by row asynchronously
- Progress and runtime events are persisted
- On completion/failure, next queued campaign can be auto-started (capacity-aware)

### CSV queue
- `CsvQueueService` manages upload queue ordering/reordering/removal
- Supports queue display + processed history
- Deletion behavior was hardened to remove DB linkage and storage assets correctly

Core queue principles implemented:
- Persistent queue in database (not in-memory only)
- Status-based state machine
- Progress counters and resumable behavior
- Failure isolation (bad row does not always kill full run)

---

## 5. How was backend started as a server?

Spring Boot packages and runs the app with embedded Tomcat.

Commands used:
- Dev run: `mvn spring-boot:run`
- Build jar: `mvn clean package`
- Run jar: `java -jar target/java-mailer-backend-1.0.0.jar`

Configured in properties:
- `server.port=8080`
- `server.servlet.context-path=/api`

So backend starts as an HTTP API server at `http://localhost:8080/api`.

---

## 6. What security features were implemented?

Implemented security features include:
- Login/register flows
- OTP-based verification
- Password reset via OTP/token flow
- Password hashing using BCrypt
- JWT token generation and parsing components
- JWT filter in security chain
- CORS policy configuration
- Validation checks in auth and user flows

Important implementation note:
- JWT infrastructure is present (token provider + filter), but authorization policy in current `SecurityConfig` is permissive (`anyRequest().permitAll()`), meaning endpoint-level protection is not fully locked down yet.
- For stricter production security, route rules should be changed to require auth for protected APIs.

---

## 7. How was frontend connected to backend?

Frontend-backend connection is done through:
- Common API base URL in frontend config
- `fetch()` calls via shared `apiCall()` helper
- JSON request/response contracts
- Authorization header injection with bearer token when token exists
- Backend CORS allow-list for frontend origins

Flow is:
1. Frontend sends request to `/api/...`
2. Backend controller handles route
3. Service/repository perform business + DB logic
4. JSON response returned to frontend
5. Frontend updates UI/state

---

## 8. How to deploy on Vercel, Render, or other free platforms?

### Recommended split deployment
- Frontend: Vercel (static hosting)
- Backend: Render (Java web service)
- DB: Supabase (already used)

### Frontend on Vercel
1. Push repo to GitHub
2. Import project in Vercel
3. Set project root to `frontend`
4. Build command: none (static)
5. Output directory: `.`
6. Update frontend API base URL to deployed backend URL

### Backend on Render
1. Create Web Service from same repo
2. Root directory: `backend`
3. Build command: `mvn clean package`
4. Start command: `java -jar target/java-mailer-backend-1.0.0.jar`
5. Add environment variables (DB creds, JWT secret, API keys)
6. Set CORS origins to include Vercel domain

### Other free alternatives
- Railway for backend
- Fly.io for backend
- Netlify/Cloudflare Pages for frontend

Operational cautions:
- Never commit secrets
- Use platform env vars
- Rotate exposed keys

---

## 9. What Java concepts were used in this project?

A lot of core + enterprise Java concepts were used:

### Core Java
- Classes and objects
- Interfaces and implementations
- Collections (`List`, `Map`, stream operations)
- Exception handling (`try/catch`, custom error propagation)
- Enums/string-based status modeling
- Date/time API (`LocalDateTime`, durations)
- File/stream processing for CSV and uploads

### Java + Spring ecosystem concepts
- Dependency injection and inversion of control
- Annotation-driven REST APIs
- Layered architecture (controller/service/repository)
- ORM mapping with JPA entities
- Repository abstraction with query methods
- Transaction boundaries
- Async execution (`@Async`)
- Security filter chain and JWT processing
- Password hashing (BCrypt)
- Configuration-driven behavior (`application.properties` + env vars)

### System design concepts
- Queue/state machine processing
- Idempotent operations where needed
- Separation of concerns (provider config vs sending execution)
- Runtime event logging and observability-friendly flow

---

## Final Note

The project is a full-stack Java + JS production-style architecture, not a simple demo. It includes auth, queueing, provider integration, DB persistence, and deploy-ready separation of frontend/backend services.
