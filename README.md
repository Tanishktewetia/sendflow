# SendFlow (Java Mailer)

A full-stack bulk email campaign platform with CSV upload, queue-based execution, campaign runtime logs, dashboard stats, and provider-based sending.

## Table of Contents
- Overview
- Features
- Tech Stack
- Project Structure
- Prerequisites
- Installation
- Configuration
- Run Locally
- API Overview
- Database Migrations
- Testing
- Deployment Notes
- Troubleshooting
- Contributing
- License

## Overview
SendFlow lets you upload recipient CSVs, create campaigns, select/verify providers, run queued sends, and monitor live status from the dashboard.

## Features
- User authentication (register/login/OTP/password reset)
- CSV upload and queue management
- Campaign execution with pause/resume/reprocess support
- Runtime terminal logs and activity feed
- Dashboard stats (today and lifetime)
- Provider verification and secure credential storage
- Account/profile management and account deletion

## Tech Stack
- Backend: Java 17, Spring Boot, Spring Security, JPA, Maven, Flyway
- Frontend: HTML, CSS, Vanilla JavaScript
- Database: PostgreSQL-compatible schema via Flyway SQL migrations

## Project Structure
- `backend/` Spring Boot API and business logic
- `frontend/` static web app
- `backend/src/main/resources/db/migration/` SQL schema migrations
- `SQL_SCHEMA_FINAL.sql` consolidated schema reference

## Prerequisites
- Java 17+
- Maven 3.8+
- Python 3 (for static frontend hosting)
- PostgreSQL (or compatible DB) configured for backend

## Installation
```bash
cd backend
mvn clean install
```

## Configuration
Set backend values in `backend/src/main/resources/application.properties`:
- DB connection
- JWT/auth settings
- Mail/provider settings
- CORS/frontend origin

## Run Locally
1. Start backend:
```bash
cd backend
mvn spring-boot:run
```
2. Start frontend:
```bash
cd frontend
python -m http.server 3000
```
3. Open:
- Frontend: `http://localhost:3000`
- Health: `http://localhost:8080/api/emails/health`

## API Overview
Primary routes are under `/api`, including:
- `/api/auth/*`
- `/api/csv/*`
- `/api/campaign-queue/*`
- `/api/emails/*`
- `/api/users/*`

## Database Migrations
Flyway SQL files are in:
- `backend/src/main/resources/db/migration/`

Apply automatically on backend startup when Flyway is enabled.

## Testing
Manual and ad-hoc test scripts may exist locally. For production workflow, use:
- backend compile: `mvn -q -DskipTests compile`
- endpoint checks via your preferred API client

## Deployment Notes
- Build backend jar with `mvn clean package`
- Serve frontend through any static web server
- Configure environment-specific DB, auth, and CORS values

### Frontend API Base URL
- Local development uses `http://localhost:8080/api` automatically.
- Production uses `https://sendflow-backend.onrender.com/api` by default.
- If your Render URL is different, set `window.__API_BASE_URL__` before `frontend/js/api-config.js` loads, or save a `api_base_url_override` value in localStorage for quick testing.

### Backend on Render
If Render does not show a Java runtime option, use Docker.

1. Create a new Web Service in Render and connect this repository.
2. Choose `Docker` as the runtime.
3. Set root directory to `backend`.
4. Use `backend/Dockerfile` as the image source.
5. Health check path: `/api/emails/health`
6. Add required environment variables:
	- `DB_USERNAME`
	- `DB_PASSWORD`
	- `JWT_SECRET`
	- `SUPABASE_API_KEY`
	- `SUPABASE_S3_ACCESS_KEY`
	- `SUPABASE_S3_SECRET_KEY`
	- `RESEND_API_KEY`
	- `RESEND_FROM_EMAIL`
	- `CORS_ALLOWED_ORIGIN_PATTERNS` (example: `https://*.vercel.app,https://your-frontend-domain.vercel.app,http://localhost:3000`)

Docker service notes:
- The Dockerfile runs the app on Render's `PORT` value automatically.
- Local development still uses `mvn spring-boot:run` on `8080`.

## Troubleshooting
- Port 8080 busy: stop prior backend process
- Port 3000 busy: run frontend on another port
- Login/auth issues: verify backend logs and JWT config
- Provider verification issues: recheck provider credentials and outbound network rules

## Contributing
1. Create a branch
2. Make focused changes
3. Verify backend compiles
4. Open a pull request with clear testing notes

## License
Internal/project-specific. Add your preferred license file if this repository will be published publicly.