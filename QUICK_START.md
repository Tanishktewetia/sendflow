# Quick Start

1. Install Java 17+ and Maven 3.8+.
2. Open a terminal in `backend`.
3. Run `mvn clean install` (first time only).
4. Start backend: `mvn spring-boot:run`.
5. Wait for server on port `8080`.
6. Open a new terminal in `frontend`.
7. Start frontend: `python -m http.server 3000`.
8. Open `http://localhost:3000`.
9. Create/login account from `auth.html` flow.
10. Upload CSV, compose campaign, and start sending.
11. Backend API base URL: `http://localhost:8080/api`.
12. If ports are busy, stop old processes and restart.
13. For production backend: `mvn clean package` then run jar in `backend/target`.