# SendFlow API Endpoints

## Backend Endpoints
| Method | Endpoint | File | Status |
|--------|----------|------|--------|
| GET | `/emails/health` | [EmailController.java](backend/src/main/java/com/javamailer/controller/EmailController.java#L19) | ✓ Implemented |
| POST | `/emails/send` | [EmailController.java](backend/src/main/java/com/javamailer/controller/EmailController.java#L27) | TODO |
| GET | `/emails/stats` | [EmailController.java](backend/src/main/java/com/javamailer/controller/EmailController.java#L36) | TODO |
| POST | `/emails/upload-csv` | [EmailController.java](backend/src/main/java/com/javamailer/controller/EmailController.java#L45) | TODO |

## Frontend API Calls
| Endpoint Constant | URL | Method | File | Usage |
|-------------------|-----|--------|------|-------|
| EMAIL_HEALTH | `/api/emails/health` | GET | [api-config.js](frontend/js/api-config.js#L13) | Health check |
| EMAIL_SEND | `/api/emails/send` | POST | [api-config.js](frontend/js/api-config.js#L12) | [app.js](frontend/js/app.js) - Compose section |
| EMAIL_STATS | `/api/emails/stats` | GET | [api-config.js](frontend/js/api-config.js#L14) | Stats dashboard |
| EMAIL_UPLOAD_CSV | `/api/uploads/csv` | POST | [api-config.js](frontend/js/api-config.js#L55) | [app.js](frontend/js/app.js) - Upload & confirmUpload |

**Base URL:** `http://localhost:8080/api`
