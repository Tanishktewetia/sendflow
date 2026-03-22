# SendFlow Backend Architecture - Complete Blueprint

**Project:** SendFlow Email Marketing Platform  
**Date:** March 22, 2026  
**Status:** Planning Phase → Implementation Ready  
**Target Stack:** Java Spring Boot 3.2.0 + PostgreSQL (Supabase) + JWT Authentication

---

## TABLE OF CONTENTS

1. [System Architecture Overview](#system-architecture-overview)
2. [Database Schema (Complete)](#database-schema-complete)
3. [Backend Project Structure](#backend-project-structure)
4. [File-by-File Implementation Guide](#file-by-file-implementation-guide)
5. [Supabase Setup & Java Connection](#supabase-setup--java-connection)
6. [Frontend ↔ Backend Integration](#frontend--backend-integration)
7. [Email Sending Systems](#email-sending-systems)
8. [Authentication & Security Flow](#authentication--security-flow)
9. [API Endpoints (Complete List)](#api-endpoints-complete-list)
10. [Step-by-Step Implementation Plan](#step-by-step-implementation-plan)

---

## SYSTEM ARCHITECTURE OVERVIEW

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                          │
│                  (Frontend: HTML/CSS/Vanilla JS)                │
│                  http://localhost:3000 (dev)                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP REST API Calls
                           │ (with JWT Bearer Token)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              SPRING BOOT BACKEND (JAVA)                         │
│              http://localhost:8080/api (dev)                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ REST Controllers (HTTP Layer)                           │   │
│  │  - AuthController, UserController, CampaignController  │   │
│  └─────────────────┬───────────────────────────────────────┘   │
│                    │ (delegates to)                             │
│  ┌─────────────────▼───────────────────────────────────────┐   │
│  │ Services (Business Logic)                               │   │
│  │  - AuthService, CampaignService, EmailService           │   │
│  │  - EmailProviderService, CsvService                     │   │
│  └─────────────────┬───────────────────────────────────────┘   │
│                    │ (uses)                                     │
│  ┌─────────────────▼───────────────────────────────────────┐   │
│  │ Repositories (Data Access - Spring Data JPA)             │   │
│  │  - UserRepository, CampaignRepository, etc.             │   │
│  └─────────────────┬───────────────────────────────────────┘   │
└────────────────────┼──────────────────────────────────────────┘
                     │ Database queries
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│            SUPABASE (HOSTED PostgreSQL)                         │
│                                                                 │
│  Database Host: xxxxx.supabase.co                             │
│  Database Name: postgres                                       │
│  Tables: users, campaigns, recipients, email_logs, etc.       │
└────────────────┬────────────────────────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌─────────────┐        ┌──────────────────┐
│ Email Queue │        │ SMTP Providers   │
│             │        │                  │
│ Processing: │        │ Gmail/Outlook/   │
│ 1 email/sec │        │ Resend/Custom    │
└──────┬──────┘        │ SMTP             │
       │               └──────────────────┘
       ▼
┌──────────────────────────┐
│ External Email Services  │
│ (Gmail, Outlook, Resend) │
└──────────────────────────┘
       │
       ▼
┌──────────────────────────┐
│  USER MAILBOX            │
│  (Recipients' Inboxes)   │
└──────────────────────────┘
```

### Data Flow Example: Campaign Execution

```
1. USER ACTION (Frontend):
   User clicks "Start Campaign" button on app.html
   
2. FRONTEND REQUEST:
   POST /campaigns/42/start
   Headers: Authorization: Bearer <JWT_TOKEN>
   
3. AUTHENTICATION:
   Spring Security intercepts request
   JwtAuthenticationFilter validates JWT token
   Extracts user ID from token claims
   
4. CONTROLLER PROCESSING:
   CampaignController.startCampaign(campaignId, userContext)
   - Validates campaign belongs to authenticated user
   - Fetches campaign from database
   - Changes status: DRAFT → RUNNING
   
5. SERVICE LOGIC:
   CampaignService.executeCampaign(campaign)
   - Fetches all recipients from campaign_recipients table
   - For each recipient:
     a) Fetch email provider credentials (encrypted)
     b) Decrypt provider config (AES-256)
     c) Personalize email (replace {{tags}} with user data)
     d) Send via configured provider (SMTP/Gmail/Outlook/Resend)
     e) Log result in email_logs table
     f) Update recipient.status (SENT/FAILED)
     g) Update campaign stats in cache
   
6. DATABASE OPERATIONS:
   All changes persisted to Supabase PostgreSQL:
   - campaign_recipients table updated
   - email_logs table records inserted
   - campaigns table stats refreshed
   
7. REAL-TIME FEEDBACK (Frontend):
   Frontend polls: GET /campaigns/42/stats every 2 seconds
   Response: {totalRecipients: 1000, sentCount: 750, ...}
   Dashboard displays live progress
```

---

## DATABASE SCHEMA (COMPLETE)

### Overview of All Tables

```
AUTHENTICATION & USER MANAGEMENT:
├── users
├── sessions (optional, for logout/multi-device tracking)
└── password_reset_tokens

CAMPAIGN MANAGEMENT:
├── campaigns
├── campaign_recipients
└── email_logs (audit trail)

EMAIL PROVIDERS:
└── email_providers (SMTP/Gmail/Outlook/Resend credentials)

FILE MANAGEMENT:
├── csv_uploads
└── csv_upload_rows (optional, store parsed CSV data)

CONFIGURATION:
└── app_settings (API keys, rate limits, etc.)
```

### Table Definitions (SQL)

#### 1. TABLE: users

```sql
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    
    -- Account Info
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- BCrypt (60 chars)
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    
    -- Account Status
    is_active BOOLEAN DEFAULT true,
    is_email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP NULL,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    
    -- Constraints
    CONSTRAINT uk_users_email UNIQUE(email)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

#### 2. TABLE: password_reset_tokens

```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    
    token VARCHAR(300) NOT NULL UNIQUE, -- Random token
    otp VARCHAR(6), -- 6-digit OTP (for OTP-based resets)
    
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_prt_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_prt_token UNIQUE(token)
);

CREATE INDEX idx_prt_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_prt_token ON password_reset_tokens(token);
CREATE INDEX idx_prt_expires_at ON password_reset_tokens(expires_at);
```

#### 3. TABLE: email_providers

```sql
CREATE TABLE IF NOT EXISTS email_providers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    
    -- Provider Type
    provider_type VARCHAR(50) NOT NULL, -- 'SMTP', 'GMAIL', 'OUTLOOK', 'RESEND'
    display_name VARCHAR(255), -- "My Gmail Account", "Office365"
    
    -- Email Address (who sends from)
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    
    -- Configuration (ENCRYPTED - never store plaintext)
    encrypted_config TEXT NOT NULL, -- JSON encrypted with AES-256
    -- Example decrypted JSON:
    -- {
    --   "host": "smtp.gmail.com",
    --   "port": 587,
    --   "username": "your@gmail.com",
    --   "password": "app-specific-password",
    --   "use_tls": true
    -- }
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false, -- Sent test email?
    last_verified_at TIMESTAMP NULL,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_ep_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_ep_user_type UNIQUE(user_id, provider_type)
);

CREATE INDEX idx_ep_user_id ON email_providers(user_id);
CREATE INDEX idx_ep_is_active ON email_providers(is_active);
```

#### 4. TABLE: campaigns

```sql
CREATE TABLE IF NOT EXISTS campaigns (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    email_provider_id BIGINT NOT NULL,
    
    -- Campaign Details
    campaign_name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    email_body LONGTEXT, -- HTML content with {{personalization tags}}
    
    -- Status Tracking
    status VARCHAR(50) DEFAULT 'DRAFT', 
    -- Options: DRAFT, SCHEDULED, RUNNING, PAUSED, COMPLETED, FAILED
    
    -- Timing
    scheduled_at TIMESTAMP NULL, -- When to send (if scheduled)
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    
    -- Configuration
    recipient_count INT DEFAULT 0,
    send_delay_ms INT DEFAULT 0, -- Milliseconds between each email send
    
    -- Statistics (cached for performance, recalculated periodically)
    total_sent INT DEFAULT 0,
    total_failed INT DEFAULT 0,
    total_pending INT DEFAULT 0,
    success_rate DECIMAL(5, 2) DEFAULT 0.00,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_camp_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_camp_provider FOREIGN KEY(email_provider_id) REFERENCES email_providers(id) ON DELETE RESTRICT
);

CREATE INDEX idx_camp_user_id ON campaigns(user_id);
CREATE INDEX idx_camp_status ON campaigns(status);
CREATE INDEX idx_camp_scheduled_at ON campaigns(scheduled_at);
CREATE INDEX idx_camp_created_at ON campaigns(created_at DESC);
```

#### 5. TABLE: campaign_recipients

```sql
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL,
    
    -- Recipient Data (from CSV or manual entry)
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    custom_field_1 VARCHAR(500),
    custom_field_2 VARCHAR(500),
    
    -- Email Status
    status VARCHAR(50) DEFAULT 'PENDING',
    -- Options: PENDING, SENT, FAILED, BOUNCED, INVALID
    
    -- Error Tracking (if failed)
    error_message LONGTEXT,
    error_code VARCHAR(50), -- SMTP error code (e.g., "550", "421")
    
    -- Timestamps
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_cr_campaign FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX idx_cr_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX idx_cr_status ON campaign_recipients(status);
CREATE INDEX idx_cr_email ON campaign_recipients(email);
CREATE INDEX idx_cr_sent_at ON campaign_recipients(sent_at);
```

#### 6. TABLE: email_logs

```sql
CREATE TABLE IF NOT EXISTS email_logs (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL,
    recipient_id BIGINT,
    
    -- Email Details
    recipient_email VARCHAR(255) NOT NULL,
    subject_sent VARCHAR(255),
    
    -- Delivery Status
    status VARCHAR(50) DEFAULT 'SENT',
    -- Options: SENT, FAILED, BOUNCED, OPENED, CLICKED
    
    -- SMTP Response (for debugging)
    smtp_response_code INT, -- 250 (success), 550 (mailbox unavailable), etc.
    smtp_response_message LONGTEXT, -- Full SMTP error message
    
    -- Tracking (optional, for future email open/click tracking)
    opened_at TIMESTAMP NULL,
    clicked_at TIMESTAMP NULL,
    
    -- Timestamps
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_el_campaign FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    CONSTRAINT fk_el_recipient FOREIGN KEY(recipient_id) REFERENCES campaign_recipients(id) ON DELETE SET NULL
);

CREATE INDEX idx_el_campaign_id ON email_logs(campaign_id);
CREATE INDEX idx_el_status ON email_logs(status);
CREATE INDEX idx_el_sent_at ON email_logs(sent_at DESC);
CREATE INDEX idx_el_recipient_email ON email_logs(recipient_email);
```

#### 7. TABLE: csv_uploads

```sql
CREATE TABLE IF NOT EXISTS csv_uploads (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    
    -- File Details
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    file_storage_path VARCHAR(500), -- Path in cloud storage (optional)
    
    -- Processing Stats
    total_rows INT DEFAULT 0,
    valid_rows INT DEFAULT 0,
    invalid_rows INT DEFAULT 0,
    duplicate_rows INT DEFAULT 0,
    
    -- Parsing Result
    status VARCHAR(50) DEFAULT 'UPLOADED',
    -- Options: UPLOADED, PROCESSING, SUCCESS, FAILED, PARTIALLY_FAILED
    
    error_details LONGTEXT, -- Info about which rows failed and why
    
    -- Metadata
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    
    -- Constraints
    CONSTRAINT fk_csv_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_csv_user_id ON csv_uploads(user_id);
CREATE INDEX idx_csv_status ON csv_uploads(status);
```

#### 8. TABLE: email_verification_tokens (For initial registration)

```sql
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    
    token VARCHAR(300) NOT NULL UNIQUE, -- Random verification token
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_evt_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_evt_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_evt_token ON email_verification_tokens(token);
```

### Entity Relationship Diagram (ERD)

```
users
├── (1) ────── (M) email_providers
├── (1) ────── (M) campaigns
│                  │
│                  ├── (1) ────── (M) campaign_recipients
│                  │                  │
│                  │                  └──┐
│                  │                     │
│                  └──────────────────(1)│
│                                        │
├── (1) ────── (M) email_logs ◄──────────┘
├── (1) ────── (M) csv_uploads
├── (1) ────── (M) password_reset_tokens
└── (1) ────── (M) email_verification_tokens
```

---

## BACKEND PROJECT STRUCTURE

### Complete Directory Layout

```
backend/
│
├── pom.xml (Maven config with dependencies)
├── README.md (Project documentation)
│
└── src/
    ├── main/
    │   ├── java/com/javamailer/
    │   │
    │   ├── config/
    │   │   ├── SecurityConfig.java              ← Spring Security + JWT
    │   │   ├── JwtConfig.java                   ← JWT configuration
    │   │   ├── DataSourceConfig.java            ← Supabase connection
    │   │   ├── WebConfig.java                   ← CORS, web settings
    │   │   ├── EncryptionConfig.java            ← AES-256 encryption setup
    │   │   └── AsyncConfig.java                 ← Async/threading config
    │   │
    │   ├── entity/ (JPA @Entity classes)
    │   │   ├── User.java                        ← Mapped to users table
    │   │   ├── Campaign.java                    ← campaigns table
    │   │   ├── Recipient.java                   ← campaign_recipients
    │   │   ├── EmailProvider.java               ← email_providers
    │   │   ├── EmailLog.java                    ← email_logs
    │   │   ├── CsvUpload.java                   ← csv_uploads
    │   │   ├── PasswordResetToken.java          ← password_reset_tokens
    │   │   └── EmailVerificationToken.java      ← email_verification_tokens
    │   │
    │   ├── repository/ (Spring Data JPA Repositories)
    │   │   ├── UserRepository.java              ← findByEmail(), etc.
    │   │   ├── CampaignRepository.java          ← find campaigns by user
    │   │   ├── RecipientRepository.java         ← find recipients by campaign
    │   │   ├── EmailProviderRepository.java     ← find providers by user
    │   │   ├── EmailLogRepository.java          ← query email delivery logs
    │   │   ├── CsvUploadRepository.java         ← track CSV uploads
    │   │   ├── PasswordResetTokenRepository.java
    │   │   └── EmailVerificationTokenRepository.java
    │   │
    │   ├── dto/ (Data Transfer Objects)
    │   │   ├── auth/
    │   │   │   ├── RegisterRequest.java         ← {email, password, name}
    │   │   │   ├── LoginRequest.java            ← {email, password}
    │   │   │   ├── LoginResponse.java           ← {token, refreshToken, user}
    │   │   │   ├── PasswordResetRequest.java    ← {email}
    │   │   │   ├── VerifyOtpRequest.java        ← {token, otp}
    │   │   │   └── ResetPasswordRequest.java    ← {token, newPassword}
    │   │   │
    │   │   ├── campaign/
    │   │   │   ├── CreateCampaignRequest.java   ← {campaignName, subject, ...}
    │   │   │   ├── CampaignDTO.java             ← Campaign data response
    │   │   │   ├── CampaignStatsDTO.java        ← Real-time stats
    │   │   │   └── StartCampaignRequest.java    ← {emailProviderId}
    │   │   │
    │   │   ├── provider/
    │   │   │   ├── AddEmailProviderRequest.java ← {type, email, credentials}
    │   │   │   ├── EmailProviderDTO.java
    │   │   │   └── TestEmailProviderRequest.java ← Send test email
    │   │   │
    │   │   ├── user/
    │   │   │   ├── UpdateProfileRequest.java    ← {firstName, lastName, avatar}
    │   │   │   ├── ChangePasswordRequest.java   ← {oldPassword, newPassword}
    │   │   │   └── UserDTO.java                 ← User profile response
    │   │   │
    │   │   ├── csv/
    │   │   │   ├── CsvUploadResponse.java       ← {uploadId, rowCount, ...}
    │   │   │   ├── CsvPreviewDTO.java           ← {firstN rows for preview}
    │   │   │   └── CsvValidationResult.java     ← {validRows, errors}
    │   │   │
    │   │   └── common/
    │   │       ├── ApiResponse.java             ← Standard response wrapper
    │   │       ├── ErrorResponse.java           ← Error response format
    │   │       └── PagedResponse.java           ← For paginated results
    │   │
    │   ├── controller/ (REST Endpoints)
    │   │   ├── AuthController.java              ← /auth/** endpoints
    │   │   │   ├── POST /auth/register
    │   │   │   ├── POST /auth/login
    │   │   │   ├── POST /auth/logout
    │   │   │   ├── POST /auth/forgot-password
    │   │   │   ├── POST /auth/verify-otp
    │   │   │   └── POST /auth/reset-password
    │   │   │
    │   │   ├── UserController.java              ← /users/** endpoints
    │   │   │   ├── GET /users/me
    │   │   │   ├── PUT /users/me
    │   │   │   ├── PUT /users/me/password
    │   │   │   ├── POST /users/me/avatar
    │   │   │   └── DELETE /users/me
    │   │   │
    │   │   ├── CampaignController.java          ← /campaigns/** endpoints
    │   │   │   ├── POST /campaigns
    │   │   │   ├── GET /campaigns
    │   │   │   ├── GET /campaigns/:id
    │   │   │   ├── PUT /campaigns/:id
    │   │   │   ├── DELETE /campaigns/:id
    │   │   │   ├── POST /campaigns/:id/start
    │   │   │   ├── POST /campaigns/:id/pause
    │   │   │   ├── POST /campaigns/:id/resume
    │   │   │   ├── GET /campaigns/:id/stats
    │   │   │   └── GET /campaigns/:id/logs
    │   │   │
    │   │   ├── EmailProviderController.java     ← /email-providers/** endpoints
    │   │   │   ├── POST /email-providers
    │   │   │   ├── GET /email-providers
    │   │   │   ├── GET /email-providers/:id
    │   │   │   ├── PUT /email-providers/:id
    │   │   │   ├── DELETE /email-providers/:id
    │   │   │   └── POST /email-providers/:id/verify
    │   │   │
    │   │   ├── CsvController.java               ← /csv/** endpoints
    │   │   │   ├── POST /csv/upload
    │   │   │   ├── GET /csv/uploads
    │   │   │   ├── GET /csv/uploads/:id
    │   │   │   └── GET /csv/uploads/:id/preview
    │   │   │
    │   │   └── HealthController.java            ← /health endpoint (actuator)
    │   │
    │   ├── service/ (Business Logic)
    │   │   ├── AuthService.java
    │   │   │   ├── register(RegisterRequest)
    │   │   │   ├── login(LoginRequest)
    │   │   │   ├── requestPasswordReset(email)
    │   │   │   ├── verifyOtp(token, otp)
    │   │   │   ├── resetPassword(token, newPassword)
    │   │   │   └── generateJwtToken(userId)
    │   │   │
    │   │   ├── UserService.java
    │   │   │   ├── getProfile(userId)
    │   │   │   ├── updateProfile(userId, updateRequest)
    │   │   │   ├── changePassword(userId, oldPwd, newPwd)
    │   │   │   ├── uploadAvatar(userId, file)
    │   │   │   └── deleteAccount(userId)
    │   │   │
    │   │   ├── CampaignService.java
    │   │   │   ├── createCampaign(userId, createRequest)
    │   │   │   ├── getCampaigns(userId, pagination)
    │   │   │   ├── getCampaignById(userId, campaignId)
    │   │   │   ├── updateCampaign(userId, campaignId, updateRequest)
    │   │   │   ├── deleteCampaign(userId, campaignId)
    │   │   │   ├── startCampaign(userId, campaignId) ← Core feature!
    │   │   │   ├── pauseCampaign(userId, campaignId)
    │   │   │   ├── resumeCampaign(userId, campaignId)
    │   │   │   ├── getCampaignStats(userId, campaignId)
    │   │   │   └── getCampaignLogs(userId, campaignId, pagination)
    │   │   │
    │   │   ├── EmailService.java (CORE - Email Sending)
    │   │   │   ├── sendSingleEmail(recipient, emailProvider, template)
    │   │   │   ├── sendBulkEmails(campaign) ← Async/queued
    │   │   │   ├── sendVerificationEmail(user)
    │   │   │   ├── sendPasswordResetOtp(user)
    │   │   │   ├── sendWelcomeEmail(user)
    │   │   │   └── personalizeEmailContent(template, recipientData)
    │   │   │
    │   │   ├── EmailProviderService.java
    │   │   │   ├── addEmailProvider(userId, providerRequest)
    │   │   │   ├── getEmailProviders(userId)
    │   │   │   ├── updateEmailProvider(userId, providerId, updateRequest)
    │   │   │   ├── deleteEmailProvider(userId, providerId)
    │   │   │   ├── verifyEmailProvider(userId, providerId) ← Send test email
    │   │   │   ├── decryptProviderCredentials(encryptedConfig)
    │   │   │   └── encryptProviderCredentials(config)
    │   │   │
    │   │   ├── SmtpService.java (Provider-Specific)
    │   │   │   ├── sendViaSmtp(email, provider) ← Custom SMTP
    │   │   │   ├── sendViaGmail(email, gmail_credentials) ← Gmail/Google
    │   │   │   ├── sendViaOutlook(email, outlook_credentials) ← Outlook/Office365
    │   │   │   └── sendViaResend(email, resend_api_key) ← Resend API
    │   │   │
    │   │   ├── CsvService.java
    │   │   │   ├── parseUploadedCsv(file) ← Read CSV file
    │   │   │   ├── validateCsvRows(rows) ← Check email validity
    │   │   │   ├── deduplicateRecipients(rows)
    │   │   │   ├── importRecipientsToDatabase(campaignId, recipients)
    │   │   │   └── generateCsvPreview(file, rowLimit)
    │   │   │
    │   │   ├── NotificationService.java
    │   │   │   ├── sendTransactionalEmail(recipient, template)
    │   │   │   └── scheduleEmailReminder(user, campaign)
    │   │   │
    │   │   └── CacheService.java
    │   │       ├── updateCampaignStats(campaignId) ← Recalculate stats
    │   │       ├── invalidateUserCache(userId)
    │   │       └── preloadUserData(userId)
    │   │
    │   ├── security/ (Authentication & Authorization)
    │   │   ├── JwtTokenProvider.java
    │   │   │   ├── generateToken(userId, expirationMinutes)
    │   │   │   ├── validateToken(token)
    │   │   │   ├── getUserIdFromToken(token)
    │   │   │   ├── isTokenExpired(token)
    │   │   │   └── refreshToken(token)
    │   │   │
    │   │   ├── JwtAuthenticationFilter.java
    │   │   │   └── doFilterInternal() ← Intercept all requests, validate JWT
    │   │   │
    │   │   ├── UserPrincipal.java
    │   │   │   └── Spring Security principal object
    │   │   │
    │   │   ├── UserDetailsServiceImpl.java
    │   │   │   └── loadUserByUsername() implementation
    │   │   │
    │   │   └── CustomAuthenticationEntryPoint.java ← 401 error handling
    │   │
    │   ├── util/ (Utility Classes)
    │   │   ├── EncryptionUtil.java
    │   │   │   ├── encryptAes256(plaintext, secretKey)
    │   │   │   ├── decryptAes256(encryptedText, secretKey)
    │   │   │   └── generateSecretKey()
    │   │   │
    │   │   ├── EmailValidator.java (EXISTS ✓)
    │   │   │   ├── isValidEmail(email)
    │   │   │   └── validateBulkEmails(emails)
    │   │   │
    │   │   ├── StringUtil.java
    │   │   │   ├── generateRandomToken(length)
    │   │   │   ├── generateOtp(length)
    │   │   │   └── maskEmail(email) ← Hide from logs
    │   │   │
    │   │   ├── CsvUtil.java
    │   │   │   ├── parseCsv(file)
    │   │   │   ├── validateCsvHeader(headers)
    │   │   │   └── mapCsvRowToRecipient(row)
    │   │   │
    │   │   └── DateTimeUtil.java
    │   │       ├── getCurrentTimestamp()
    │   │       └── calculateExpirationTime(minutes)
    │   │
    │   ├── exception/ (Custom Exceptions)
    │   │   ├── AppException.java ← Base exception
    │   │   ├── UnauthorizedException.java ← 401
    │   │   ├── ForbiddenException.java ← 403
    │   │   ├── ResourceNotFoundException.java ← 404
    │   │   ├── ValidationException.java ← 400
    │   │   ├── EmailSendingException.java ← Email failure
    │   │   ├── InvalidTokenException.java ← Expired/invalid JWT
    │   │   └── CsvParseException.java ← CSV parsing error
    │   │
    │   ├── handler/ (Global Exception Handler)
    │   │   └── GlobalExceptionHandler.java
    │   │       ├── handleValidationException()
    │   │       ├── handleUnauthorizedException()
    │   │       ├── handleResourceNotFoundException()
    │   │       ├── handleException() ← Generic catch-all
    │   │       └── Returns standardized ErrorResponse
    │   │
    │   ├── aspect/ (AOP - Cross-cutting concerns)
    │   │   ├── LoggingAspect.java ← Log all controller methods
    │   │   └── PerformanceAspect.java ← Measure execution time
    │   │
    │   ├── async/ (Asynchronous Processing)
    │   │   ├── EmailSendingTask.java ← Async email sending
    │   │   ├── CampaignExecutor.java ← Async campaign execution
    │   │   └── NotificationTask.java ← Async notifications
    │   │
    │   └── JavaMailerApplication.java ← Main Spring Boot class
    │       @SpringBootApplication
    │       public class JavaMailerApplication {
    │           public static void main(String[] args)
    │       }
    │
    └── resources/
        └── application.properties
            ├── Server config
            ├── Database (Supabase) connection
            ├── JWT secret key
            ├── Email/SMTP settings
            ├── Logging levels
            ├── File upload limits
            └── Feature flags
```

---

## FILE-BY-FILE IMPLEMENTATION GUIDE

### Phase 1: Configuration Files

#### File 1: pom.xml (Maven Dependencies)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
        <relativePath/>
    </parent>

    <groupId>com.javamailer</groupId>
    <artifactId>sendflow</artifactId>
    <version>1.0.0</version>
    <name>SendFlow</name>
    <description>Email Marketing Platform</description>

    <properties>
        <java.version>17</java.version>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
    </properties>

    <dependencies>
        <!-- Spring Boot Web (REST API) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- Spring Data JPA (Database) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>

        <!-- PostgreSQL Driver -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <version>42.7.1</version>
            <scope>runtime</scope>
        </dependency>

        <!-- Spring Security -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>

        <!-- JWT Token -->
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>0.12.3</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>0.12.3</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>0.12.3</version>
            <scope>runtime</scope>
        </dependency>

        <!-- Spring Mail (for SMTP) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-mail</artifactId>
        </dependency>

        <!-- OpenCSV (for CSV parsing) -->
        <dependency>
            <groupId>com.opencsv</groupId>
            <artifactId>opencsv</artifactId>
            <version>5.9</version>
        </dependency>

        <!-- Lombok (reduce boilerplate) -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- Apache Commons (utilities) -->
        <dependency>
            <groupId>org.apache.commons</groupId>
            <artifactId>commons-lang3</artifactId>
        </dependency>

        <!-- JSON processing -->
        <dependency>
            <groupId>com.google.code.gson</groupId>
            <artifactId>gson</artifactId>
        </dependency>

        <!-- Dev Tools (hot reload) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-devtools</artifactId>
            <scope>runtime</scope>
            <optional>true</optional>
        </dependency>

        <!-- Testing -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>

</project>
```

#### File 2: application.properties (Configuration)

```properties
# ===================== SERVER CONFIGURATION =====================
server.port=8080
server.servlet.context-path=/api
spring.application.name=SendFlow

# ===================== SUPABASE DATABASE CONFIGURATION ==================== 
# YOU WILL GET THESE VALUES FROM SUPABASE DASHBOARD
# https://database.new.supabase.co:5432
spring.datasource.url=jdbc:postgresql://<YOUR_SUPABASE_HOST>:5432/postgres
spring.datasource.username=postgres
spring.datasource.password=<YOUR_SUPABASE_PASSWORD>
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA/Hibernate Configuration
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.use_sql_comments=true
spring.jpa.properties.hibernate.jdbc.batch_size=20
spring.jpa.properties.hibernate.order_inserts=true
spring.jpa.properties.hibernate.order_updates=true

# Connection Pool (HikariCP)
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000

# ===================== JWT CONFIGURATION =====================
# GENERATE A RANDOM SECRET KEY (min 64 characters)
jwt.secret=your-super-secret-key-change-this-in-production-at-least-64-chars-long-for-security
jwt.expiration=900000 # 15 minutes in milliseconds
jwt.refreshExpiration=604800000 # 7 days in milliseconds

# ===================== EMAIL CONFIGURATION =====================
# SMTP settings for sending verification/password reset emails
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your-email@gmail.com
spring.mail.password=your-app-specific-password
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
spring.mail.properties.mail.smtp.starttls.required=true
spring.mail.properties.mail.smtp.connectiontimeout=5000
spring.mail.properties.mail.smtp.timeout=5000
spring.mail.properties.mail.smtp.writetimeout=5000

# ===================== FILE UPLOAD CONFIGURATION =====================
spring.servlet.multipart.max-file-size=50MB
spring.servlet.multipart.max-request-size=50MB

# ===================== LOGGING CONFIGURATION =====================
logging.level.root=INFO
logging.level.com.javamailer=DEBUG
logging.level.org.springframework.web=INFO
logging.level.org.springframework.security=DEBUG
logging.level.org.hibernate=WARN
logging.pattern.console=%d{yyyy-MM-dd HH:mm:ss} - %logger{36} - %msg%n

# ===================== JACKSON (JSON) CONFIGURATION =====================
spring.jackson.default-property-inclusion=non_null
spring.jackson.serialization.write-dates-as-timestamps=false
spring.jackson.time-zone=UTC

# ===================== CORS CONFIGURATION =====================
cors.allowed-origins=http://localhost:3000,http://localhost:8000,https://yourdomain.com
cors.allowed-methods=GET,POST,PUT,DELETE,OPTIONS,PATCH
cors.allowed-headers=Content-Type,Authorization,X-Requested-With
cors.max-age=3600

# ===================== FEATURE FLAGS =====================
feature.email-verification-required=true
feature.send-welcome-email=true
feature.campaign-scheduling=true
feature.email-tracking=false

# ===================== ENCRYPTION CONFIGURATION =====================
encryption.algorithm=AES
encryption.secret-key=your-32-character-encryption-key!!
```

### Phase 2: Entity Classes (JPA Entities)

#### File 3: entity/User.java

```java
package com.javamailer.entity;

import jakarta.persistence.*; // Note: Spring Boot 3.x uses jakarta.*
import lombok.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data // Generates getters, setters, toString, equals, hashCode
@NoArgsConstructor // Generates no-arg constructor
@AllArgsConstructor // Generates constructor with all fields
@Builder(toBuilder = true)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 255)
    private String email;

    @Column(nullable = false, length = 255)
    private String passwordHash; // Never store plaintext password!

    @Column(name = "first_name", length = 100)
    private String firstName;

    @Column(name = "last_name", length = 100)
    private String lastName;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "is_email_verified")
    private Boolean isEmailVerified = false;

    @Column(name = "email_verified_at")
    private LocalDateTime emailVerifiedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Custom methods
    public boolean isPasswordCorrect(String rawPassword) {
        // Use BCryptPasswordEncoder to validate
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        return encoder.matches(rawPassword, this.passwordHash);
    }

    public String getFullName() {
        return (firstName != null ? firstName : "") + " " + 
               (lastName != null ? lastName : "");
    }
}
```

### Phase 3: Repository Interfaces

#### File 4: repository/UserRepository.java

```java
package com.javamailer.repository;

import com.javamailer.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Find user by email (for login)
    Optional<User> findByEmail(String email);

    // Check if email exists (for registration validation)
    boolean existsByEmail(String email);
}
```

### Phase 4: Security Configuration

#### File 5: security/JwtTokenProvider.java

```java
package com.javamailer.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.util.Date;

@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    @Value("${jwt.refreshExpiration}")
    private long refreshExpiration;

    // Generate JWT Token
    public String generateToken(Long userId) {
        return Jwts.builder()
                .setSubject(userId.toString())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(Keys.hmacShaKeyFor(jwtSecret.getBytes()), SignatureAlgorithm.HS512)
                .compact();
    }

    // Validate JWT Token
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(Keys.hmacShaKeyFor(jwtSecret.getBytes()))
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    // Extract User ID from JWT
    public Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(Keys.hmacShaKeyFor(jwtSecret.getBytes()))
                .build()
                .parseClaimsJws(token)
                .getBody();
        return Long.parseLong(claims.getSubject());
    }
}
```

---

## SUPABASE SETUP & JAVA CONNECTION

### Step 1: Create Supabase Project

```
1. Go to https://supabase.com
2. Sign up with email
3. Click "New Project"
4. Choose:
   - Organization: Personal
   - Name: sendflow
   - Database Password: Generate strong password (save it!)
   - Region: Choose closest to you
5. Click "Create new project" (wait 2-3 minutes)
```

### Step 2: Get Supabase Connection Details

```
Supabase Dashboard → Settings → Database

You'll get:
- Host: xxxxx.supabase.co
- Port: 5432
- Database: postgres
- User: postgres
- Password: (what you set above)
- SSL: Required

Example Connection String (for Java):
jdbc:postgresql://xxxx-xxxx-xxxx.supabase.co:5432/postgres
```

### Step 3: Run SQL Schema in Supabase

```
1. Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy-paste ALL SQL tables from earlier (Database Schema section)
4. Click "Run"
5. Wait for "Success" message
```

### Step 4: Update application.properties in Java

```properties
# Your Supabase connection details
spring.datasource.url=jdbc:postgresql://xxxx-xxxx-xxxx.supabase.co:5432/postgres
spring.datasource.username=postgres
spring.datasource.password=YOUR_DATABASE_PASSWORD
```

### Step 5: Test Connection from Java

```bash
# Run the application
mvn spring-boot:run

# Check logs for:
# "Hikari Connection Pool initialized"
# "Tables created: users, campaigns, ..."
```

---

## FRONTEND ↔ BACKEND INTEGRATION

### How They Communicate

```
FRONTEND (Browser)
    ↓
POST /api/auth/login
Headers: {Content-Type: application/json}
Body: {"email": "user@example.com", "password": "..."}
    ↓
BACKEND (Spring Boot)
    ├─ Validates email format
    ├─ Finds user in users table
    ├─ Compares password with BCrypt hash
    ├─ If valid: Generates JWT token
    ├─ Returns: {"token": "...", "user": {...}}
    ↓
FRONTEND (Browser)
    ├─ Saves token to localStorage
    ├─ Includes in all subsequent requests:
    │  Authorization: Bearer <TOKEN>
    ↓
BACKEND
    ├─ JwtAuthenticationFilter intercepts request
    ├─ Validates JWT signature
    ├─ Extracts userId from token
    ├─ Sets user context
    ├─ Allows request to proceed
    ↓
Authenticated endpoint processes request
```

### Frontend API Config Update

File: `frontend/js/api-config.js`

```javascript
// API Base URL
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8080/api'
    : 'https://sendflow.railway.app/api'; // Production URL

// Make API call with JWT token
async function apiCall(url, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        },
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
        const response = await fetch(url, finalOptions);

        // Handle token expiration
        if (response.status === 401) {
            // Try to refresh token
            const refreshed = await refreshJwtToken();
            if (refreshed) {
                // Retry the original request
                return apiCall(url, finalOptions);
            } else {
                // Redirect to login
                window.location.href = 'auth.html';
                return;
            }
        }

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
}

// Refresh JWT token
async function refreshJwtToken() {
    try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({refreshToken})
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return false;
    }
}
```

### Frontend Auth.js Update

File: `frontend/js/auth.js`

```javascript
//=== REGISTRATION ===
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const inputs = document.querySelectorAll('#registerForm input');
    const email = inputs[0].value;
    const password = inputs[1].value;
    const firstName = inputs[2]?.value || '';
    const lastName = inputs[3]?.value || '';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                email,
                password,
                firstName,
                lastName
            })
        });

        if (response.ok) {
            alert('Registration successful! Check your email to verify.');
            window.location.href = 'auth.html'; // Redirect to login
        } else {
            const error = await response.json();
            alert('Registration failed: ' + error.message);
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed. Try again.');
    }
});

//=== LOGIN ===
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.querySelector('#loginForm input[type="email"]').value;
    const password = document.querySelector('#loginForm input[type="password"]').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email, password})
        });

        if (response.ok) {
            const data = await response.json();
            // Store tokens
            localStorage.setItem('token', data.token);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userEmail', data.user.email);

            // Redirect to dashboard
            window.location.href = 'app.html';
        } else {
            const error = await response.json();
            alert('Login failed: ' + error.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Try again.');
    }
});
```

---

## EMAIL SENDING SYSTEMS

### 1. System Email (Verification, OTP, Notifications)

**Flow:**
```
User registers → Verification email sent to user's inbox
User clicks verify link → Account activated

User forgot password → OTP sent to email
User enters OTP → Password reset successful
```

**Implementation:**

File: `service/AuthService.java` (excerpt)

```java
@Service
@RequiredArgsConstructor
public class AuthService {

    private final EmailService emailService;
    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;

    public void sendVerificationEmail(User user) throws MessagingException {
        // Generate verification token (valid for 24 hours)
        String token = generateRandomToken(32);
        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .user(user)
                .token(token)
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build();
        tokenRepository.save(verificationToken);

        // Send email
        String verificationLink = "https://sendflow.com/verify?token=" + token;
        String emailHtml = """
            <h1>Verify Your Email</h1>
            <p>Click the link to verify: <a href="%s">Verify Email</a></p>
            <p>Link expires in 24 hours.</p>
        """.formatted(verificationLink);

        emailService.sendEmail(
            user.getEmail(),
            "SendFlow - Verify Your Email",
            emailHtml
        );
    }

    public void sendPasswordResetOtp(User user) throws MessagingException {
        // Generate 6-digit OTP
        String otp = generateOtp(6);
        
        // Generate reset token (valid for 30 minutes)
        String token = generateRandomToken(32);
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(user)
                .token(token)
                .otp(otp)
                .expiresAt(LocalDateTime.now().plusMinutes(30))
                .build();
        tokenRepository.save(resetToken);

        // Send email with OTP
        String emailHtml = """
            <h1>Password Reset Request</h1>
            <p>Your OTP is: <strong>%s</strong></p>
            <p>This code is valid for 30 minutes.</p>
            <p>If you didn't request this, ignore this email.</p>
        """.formatted(otp);

        emailService.sendEmail(
            user.getEmail(),
            "SendFlow - Password Reset OTP",
            emailHtml
        );
    }
}
```

### 2. Campaign Emails (User-Sent Bulk Emails)

**Flow:**
```
User creates campaign with email body containing {{tags}}
User clicks "Start Campaign"
Backend fetches all recipients from campaign_recipients table
For each recipient:
  ├─ Personalize email (replace {{name}} with recipient.name)
  ├─ Get provider credentials (decrypt)
  ├─ Send via provider (SMTP/Gmail/Outlook/Resend)
  ├─ Log result in email_logs
  └─ Update campaign stats
```

File: `service/EmailService.java` (excerpt)

```java
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final SmtpService smtpService;
    private final EmailLogRepository emailLogRepository;

    // Send single campaign email
    @Async
    public void sendCampaignEmail(
        Campaign campaign,
        Recipient recipient,
        EmailProvider provider
    ) {
        try {
            // 1. Personalize email content
            String personalizedSubject = personalizeContent(
                campaign.getSubject(), 
                recipient
            );
            String personalizedBody = personalizeContent(
                campaign.getEmailBody(), 
                recipient
            );

            // 2. Select provider handler
            EmailSendingResult result = switch(provider.getProviderType()) {
                case "SMTP" -> smtpService.sendViaSmtp(
                    recipient.getEmail(),
                    personalizedSubject,
                    personalizedBody,
                    provider
                );
                case "GMAIL" -> smtpService.sendViaGmail(
                    recipient.getEmail(),
                    personalizedSubject,
                    personalizedBody,
                    provider
                );
                case "OUTLOOK" -> smtpService.sendViaOutlook(
                    recipient.getEmail(),
                    personalizedSubject,
                    personalizedBody,
                    provider
                );
                case "RESEND" -> smtpService.sendViaResend(
                    recipient.getEmail(),
                    personalizedSubject,
                    personalizedBody,
                    provider
                );
                default -> throw new IllegalArgumentException(
                    "Unknown provider: " + provider.getProviderType()
                );
            };

            // 3. Log result
            EmailLog log = EmailLog.builder()
                    .campaign(campaign)
                    .recipient(recipient)
                    .recipientEmail(recipient.getEmail())
                    .subjectSent(personalizedSubject)
                    .status(result.isSuccess() ? "SENT" : "FAILED")
                    .smtpResponseCode(result.getSmtpCode())
                    .smtpResponseMessage(result.getSmtpMessage())
                    .sentAt(LocalDateTime.now())
                    .build();
            emailLogRepository.save(log);

            // 4. Update recipient status
            if (result.isSuccess()) {
                recipient.setStatus("SENT");
                recipient.setSentAt(LocalDateTime.now());
            } else {
                recipient.setStatus("FAILED");
                recipient.setErrorMessage(result.getSmtpMessage());
            }
            recipientRepository.save(recipient);

            // 5. Apply delay if configured
            if (campaign.getSendDelayMs() > 0) {
                Thread.sleep(campaign.getSendDelayMs());
            }

        } catch (Exception e) {
            log.error("Error sending email to {}: {}", recipient.getEmail(), e.getMessage());
            // Log failure
        }
    }

    // Personalize content with {{tags}}
    private String personalizeContent(String template, Recipient recipient) {
        return template
                .replace("{{name}}", recipient.getName() != null ? recipient.getName() : "")
                .replace("{{email}}", recipient.getEmail() != null ? recipient.getEmail() : "")
                .replace("{{company}}", recipient.getCompany() != null ? recipient.getCompany() : "")
                .replace("{{customField1}}", recipient.getCustomField1() != null ? recipient.getCustomField1() : "")
                .replace("{{customField2}}", recipient.getCustomField2() != null ? recipient.getCustomField2() : "");
    }
}
```

### 3. Provider-Specific Email Sending

File: `service/SmtpService.java`

```java
@Service
@RequiredArgsConstructor
public class SmtpService {

    private final JavaMailSender mailSender;
    private final EncryptionUtil encryptionUtil;

    // Send via Custom SMTP
    public EmailSendingResult sendViaSmtp(
        String recipient,
        String subject,
        String body,
        EmailProvider provider
    ) {
        try {
            // Decrypt SMTP credentials
            SmtpConfig config = decryptSmtpConfig(provider.getEncryptedConfig());

            // Create SMTP session
            Properties props = new Properties();
            props.put("mail.smtp.host", config.getHost());
            props.put("mail.smtp.port", config.getPort());
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");

            Session session = Session.getInstance(props, new Authenticator() {
                @Override
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(config.getUsername(), config.getPassword());
                }
            });

            // Send email
            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(provider.getFromEmail(), provider.getFromName()));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(recipient));
            message.setSubject(subject);

            MimeBodyPart mimeBodyPart = new MimeBodyPart();
            mimeBodyPart.setText(body, "utf-8", "html");

            MimeMultipart multipart = new MimeMultipart();
            multipart.addBodyPart(mimeBodyPart);
            message.setContent(multipart);

            Transport.send(message);

            return EmailSendingResult.success(250, "Message sent successfully");

        } catch (Exception e) {
            return EmailSendingResult.failure(550, e.getMessage());
        }
    }

    // Send via Gmail (OAuth2 or App Password)
    public EmailSendingResult sendViaGmail(
        String recipient,
        String subject,
        String body,
        EmailProvider provider
    ) {
        // Similar to SMTP, use Gmail SMTP server:
        // host: smtp.gmail.com
        // port: 587
        // username: your@gmail.com
        // password: Google App-Specific Password
        return sendViaSmtp(recipient, subject, body, provider);
    }

    // Send via Outlook (365)
    public EmailSendingResult sendViaOutlook(
        String recipient,
        String subject,
        String body,
        EmailProvider provider
    ) {
        // host: smtp.office365.com
        // port: 587
        // username: your@outlook.com
        // password: Your Office 365 password
        return sendViaSmtp(recipient, subject, body, provider);
    }

    // Send via Resend API (REST-based)
    public EmailSendingResult sendViaResend(
        String recipient,
        String subject,
        String body,
        EmailProvider provider
    ) {
        try {
            String resendApiKey = decryptResendApiKey(provider.getEncryptedConfig());

            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(new URI("https://api.resend.com/emails"))
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString("""
                        {
                            "from": "%s",
                            "to": "%s",
                            "subject": "%s",
                            "html": "%s"
                        }
                    """.formatted(provider.getFromEmail(), recipient, subject, body)))
                    .build();

            HttpResponse<String> response = client.send(request, 
                HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                return EmailSendingResult.success(200, "Email sent via Resend");
            } else {
                return EmailSendingResult.failure(response.statusCode(), response.body());
            }

        } catch (Exception e) {
            return EmailSendingResult.failure(500, e.getMessage());
        }
    }
}

// Helper class to store email sending result
@Data
@AllArgsConstructor
class EmailSendingResult {
    private boolean success;
    private int smtpCode;
    private String smtpMessage;

    public static EmailSendingResult success(int code, String message) {
        return new EmailSendingResult(true, code, message);
    }

    public static EmailSendingResult failure(int code, String message) {
        return new EmailSendingResult(false, code, message);
    }
}
```

---

## AUTHENTICATION & SECURITY FLOW

### Complete Registration Flow

```
1. User lands on auth.html
2. User fills: Email, Password, FirstName, LastName
3. Clicks "Register" button
   ↓
4. Frontend: POST /api/auth/register
   {
       "email": "user@example.com",
       "password": "SecurePass123",
       "firstName": "Tanishk",
       "lastName": "Tewetia"
   }
   ↓
5. Backend: AuthController.register()
   ├─ Validate email format (email@domain.com)
   ├─ Validate password length (min 8 chars)
   ├─ Check if email already exists
   ├─ Hash password with BCrypt
   ├─ Save user to database (users table)
   ├─ Generate verification token
   ├─ Send verification email
   └─ Return: {"userId": 1, "message": "Check your email"}
   ↓
6. Frontend: Show message "Check your email to verify"
   ↓
7. User checks email, clicks verification link
   ↓
8. Frontend: GET /api/auth/verify?token=ABC123
   ↓
9. Backend:
   ├─ Find token in email_verification_tokens table
   ├─ Check if token is valid & not expired
   ├─ Update user: is_email_verified = true
   ├─ Delete token
   └─ Return: {"success": true}
   ↓
10. Frontend: Redirect to login page
```

### Complete Login Flow

```
1. User navigates to auth.html
2. User fills: Email, Password
3. Clicks "Login" button
   ↓
4. Frontend: POST /api/auth/login
   {
       "email": "user@example.com",
       "password": "SecurePass123"
   }
   ↓
5. Backend: AuthController.login()
   ├─ Find user by email in database
   ├─ If not found: Return 401 Unauthorized
   ├─ Compare password: BCryptPasswordEncoder.matches(submitted, stored)
   ├─ If mismatch: Return 401 Unauthorized
   ├─ Generate JWT token (expires in 15 minutes)
   ├─ Generate Refresh token (expires in 7 days)
   ├─ Update user.lastLoginAt = now()
   └─ Return:
   {
       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "user": {
           "id": 1,
           "email": "user@example.com",
           "firstName": "Tanishk"
       }
   }
   ↓
6. Frontend: 
   ├─ localStorage.setItem("token", response.token)
   ├─ localStorage.setItem("refreshToken", response.refreshToken)
   └─ Redirect to app.html (dashboard)
```

### Authenticated Request Flow

```
1. Frontend wants to GET /api/campaigns
   ├─ Retrieves token from localStorage
   ├─ Adds to header: Authorization: Bearer <TOKEN>
   └─ Sends request

2. Backend: JwtAuthenticationFilter.doFilterInternal()
   ├─ Extract token from Authorization header
   ├─ Validate JWT signature with secret key
   ├─ Check if token is expired
   ├─ Extract userId from token claims
   ├─ Set user context: SecurityContextHolder.setContext(user)
   └─ Allow request to continue

3. Backend: CampaignController.getCampaigns()
   ├─ Get current user from SecurityContext
   ├─ Query: SELECT * FROM campaigns WHERE user_id = ?
   └─ Return only THIS user's campaigns (security: can't access other users' data)

4. Frontend: Receives campaigns, displays on dashboard
```

### Password Reset Flow

```
1. User navigates to forgot-password.html
2. User enters email
   ↓
3. Frontend: POST /api/auth/forgot-password
   {"email": "user@example.com"}
   ↓
4. Backend: AuthController.forgotPassword()
   ├─ Find user by email
   ├─ If not found: Return 404 (but don't expose this!)
   ├─ Generate 6-digit OTP
   ├─ Generate reset token (30-minute expiry)
   ├─ Save to password_reset_tokens table
   ├─ Send email with OTP
   └─ Return: {"success": true, "message": "OTP sent to email"}
   ↓
5. Frontend: Show form to enter OTP
   ↓
6. User enters OTP from email
   ↓
7. Frontend: POST /api/auth/verify-otp
   {
       "token": "ABC123...",
       "otp": "123456"
   }
   ↓
8. Backend:
   ├─ Find token in database
   ├─ Check if OTP matches
   ├─ Check if not expired
   ├─ Return: {"success": true, "resetToken": "XYZ789..."}
   ↓
9. Frontend: Show "Enter New Password" form
   ↓
10. User enters new password
    ↓
11. Frontend: POST /api/auth/reset-password
    {
        "resetToken": "XYZ789...",
        "newPassword": "NewPassword456"
    }
    ↓
12. Backend:
    ├─ Find and validate resetToken
    ├─ Hash new password with BCrypt
    ├─ Update user.password_hash
    ├─ Delete reset token (one-time use)
    └─ Return: {"success": true, "message": "Password reset successful"}
    ↓
13. Frontend: Redirect to login page
```

---

## API ENDPOINTS (COMPLETE LIST)

### Authentication Endpoints

```
POST /auth/register
Request:  {email, password, firstName, lastName}
Response: {userId, message}
Status:   201 Created on success, 400 on validation error, 409 if email exists

POST /auth/login
Request:  {email, password}
Response: {token, refreshToken, user: {id, email, firstName}}
Status:   200 OK on success, 401 Unauthorized on wrong credentials

POST /auth/logout
Headers:  Authorization: Bearer <JWT>
Response: {success: true}
Status:   200 OK

POST /auth/forgot-password
Request:  {email}
Response: {success: true, message: "OTP sent"}
Status:   200 OK

POST /auth/verify-otp
Request:  {token, otp}
Response: {success: true, resetToken: "..."}
Status:   200 OK, 400 if OTP invalid/expired

POST /auth/reset-password
Request:  {resetToken, newPassword}
Response: {success: true}
Status:   200 OK

POST /auth/refresh-token
Request:  {refreshToken}
Response: {token, refreshToken}
Status:   200 OK, 401 if refresh token expired
```

### User Profile Endpoints

```
GET /users/me
Headers:  Authorization: Bearer <JWT>
Response: {id, email, firstName, lastName, avatarUrl, createdAt}
Status:   200 OK

PUT /users/me
Headers:  Authorization: Bearer <JWT>
Request:  {firstName, lastName, avatarUrl}
Response: {updated user object}
Status:   200 OK

PUT /users/me/password
Headers:  Authorization: Bearer <JWT>
Request:  {oldPassword, newPassword}
Response: {success: true}
Status:   200 OK, 400 if old password wrong

POST /users/me/avatar
Headers:  Authorization: Bearer <JWT>
          Content-Type: multipart/form-data
Request:  file (image file)
Response: {avatarUrl: "..."}
Status:   200 OK

DELETE /users/me
Headers:  Authorization: Bearer <JWT>
Response: {success: true}
Status:   200 OK (all user data deleted cascade)
```

### Campaign Endpoints

```
POST /campaigns
Headers:  Authorization: Bearer <JWT>
Request:  {campaignName, subject, emailBody, emailProviderId, recipientIds}
Response: {id, campaignName, status: "DRAFT", ...}
Status:   201 Created

GET /campaigns?page=0&size=10
Headers:  Authorization: Bearer <JWT>
Response: {content: [...], totalElements, totalPages}
Status:   200 OK

GET /campaigns/:id
Headers:  Authorization: Bearer <JWT>
Response: {full campaign object}
Status:   200 OK, 403 if not own campaign

PUT /campaigns/:id
Headers:  Authorization: Bearer <JWT>
Request:  {subject, emailBody, ...}
Response: {updated campaign}
Status:   200 OK (only if DRAFT or PAUSED)

DELETE /campaigns/:id
Headers:  Authorization: Bearer <JWT>
Status:   204 No Content on success

POST /campaigns/:id/start
Headers:  Authorization: Bearer <JWT>
Response: {status: "RUNNING", startedAt: "..."}
Status:   200 OK, 400 if campaign already running

POST /campaigns/:id/pause
Headers:  Authorization: Bearer <JWT>
Response: {status: "PAUSED"}
Status:   200 OK

POST /campaigns/:id/resume
Headers:  Authorization: Bearer <JWT>
Response: {status: "RUNNING"}
Status:   200 OK

GET /campaigns/:id/stats
Headers:  Authorization: Bearer <JWT>
Response: {
    totalRecipients: 1000,
    sentCount: 750,
    failedCount: 50,
    pendingCount: 200,
    successRate: 75.0,
    status: "RUNNING",
    startedAt: "...",
    estimatedCompletionTime: "..."
}
Status:   200 OK

GET /campaigns/:id/logs?page=0&size=50
Headers:  Authorization: Bearer <JWT>
Response: {content: [{recipientEmail, status, sentAt, smtpCode, ...}]}
Status:   200 OK
```

### Email Provider Endpoints

```
POST /email-providers
Headers:  Authorization: Bearer <JWT>
Request:  {
    providerType: "SMTP" | "GMAIL" | "OUTLOOK" | "RESEND",
    displayName: "My Gmail",
    fromEmail: "sender@gmail.com",
    fromName: "Tanishk",
    config: {
        host: "smtp.gmail.com",
        port: 587,
        username: "...",
        password: "..."
    }
}
Response: {id, providerType, displayName, isVerified: false}
Status:   201 Created

GET /email-providers
Headers:  Authorization: Bearer <JWT>
Response: [{id, providerType, displayName, isVerified, lastVerifiedAt}]
Status:   200 OK

GET /email-providers/:id
Headers:  Authorization: Bearer <JWT>
Response: {full provider object (credentials hidden)}
Status:   200 OK

PUT /email-providers/:id
Headers:  Authorization: Bearer <JWT>
Request:  {displayName, config}
Response: {updated provider}
Status:   200 OK

DELETE /email-providers/:id
Headers:  Authorization: Bearer <JWT>
Status:   204 No Content

POST /email-providers/:id/verify
Headers:  Authorization: Bearer <JWT>
Response: {success: true, message: "Test email sent"}
Status:   200 OK, 400 if credentials invalid
```

### CSV Upload Endpoints

```
POST /csv/upload
Headers:  Authorization: Bearer <JWT>
          Content-Type: multipart/form-data
Request:  file (CSV file)
Response: {
    uploadId: "uuid",
    fileName: "contacts.csv",
    rowCount: 1500,
    validRows: 1450,
    invalidRows: 50,
    status: "PROCESSING"
}
Status:   201 Created

GET /csv/uploads
Headers:  Authorization: Bearer <JWT>
Response: [{uploadId, fileName, rowCount, status, uploadedAt}]
Status:   200 OK

GET /csv/uploads/:id
Headers:  Authorization: Bearer <JWT>
Response: {uploadId, fileName, rowCount, validRows, invalidRows, errorDetails}
Status:   200 OK

GET /csv/uploads/:id/preview?limit=10
Headers:  Authorization: Bearer <JWT>
Response: {
    columns: ["name", "email", "company", ...],
    rows: [
        {name: "John", email: "john@...", company: "ABC Inc", ...},
        ...
    ]
}
Status:   200 OK
```

### Health/Status Endpoints

```
GET /health
Response: {"status": "UP"}
Status:   200 OK

GET /actuator/health
Response: {"status": "UP", "components": {...}}
Status:   200 OK
```

---

## STEP-BY-STEP IMPLEMENTATION PLAN

### Week 1: Database & Configuration

#### Day 1: Supabase Setup
- [ ] Sign up for Supabase
- [ ] Create new project
- [ ] Copy connection details
- [ ] Run SQL schema in Supabase SQL editor
- [ ] Verify all 8 tables created

#### Day 2-3: Java Configuration
- [ ] Create `backend/src/main/resources/application.properties`
- [ ] Update pom.xml with dependencies
- [ ] Update `DataSourceConfig.java` with Supabase connection
- [ ] Run `mvn clean install` (test builds)
- [ ] Run application, verify "All tables mapped" in logs

#### Day 4: Entity Classes
- [ ] Create `entity/User.java` with @Entity, @Table
- [ ] Create `entity/Campaign.java`
- [ ] Create `entity/Recipient.java`
- [ ] Create `entity/EmailProvider.java`
- [ ] Create `entity/EmailLog.java`
- [ ] Create `entity/PasswordResetToken.java`
- [ ] Verify entities compile & Hibernate mapping works

#### Day 5: Repositories
- [ ] Create `repository/UserRepository.java` (extends JpaRepository)
- [ ] Create `repository/CampaignRepository.java`
- [ ] Create `repository/RecipientRepository.java`
- [ ] Create `repository/EmailProviderRepository.java`
- [ ] Create `repository/EmailLogRepository.java`
- [ ] Test with simple unit tests

### Week 2: Authentication System

#### Day 6-7: Security
- [ ] Create `security/JwtTokenProvider.java`
- [ ] Create `security/JwtAuthenticationFilter.java`
- [ ] Create `config/SecurityConfig.java`
- [ ] Create `dto/LoginRequest.java`, `LoginResponse.java`
- [ ] Create `dto/RegisterRequest.java`

#### Day 8-10: Auth Controller
- [ ] Create `controller/AuthController.java`
- [ ] Implement POST /auth/register
- [ ] Implement POST /auth/login
- [ ] Implement POST /auth/forgot-password
- [ ] Implement POST /auth/verify-otp
- [ ] Implement POST /auth/reset-password
- [ ] Test with Postman

### Week 3: Core Features

#### Day 11-12: Campaign Management
- [ ] Create `controller/CampaignController.java`
- [ ] Create `service/CampaignService.java`
- [ ] Implement POST /campaigns (create)
- [ ] Implement GET /campaigns (list)
- [ ] Implement GET /campaigns/:id
- [ ] Implement PUT /campaigns/:id
- [ ] Implement DELETE /campaigns/:id

#### Day 13-14: Email Sending
- [ ] Create `service/EmailService.java`
- [ ] Create `service/SmtpService.java`
- [ ] Implement sendViaSmtp()
- [ ] Implement sendViaGmail()
- [ ] Implement sendViaOutlook()
- [ ] Implement sendViaResend()
- [ ] Create email personalization function

#### Day 15: Campaign Execution
- [ ] Implement POST /campaigns/:id/start
- [ ] Implement GET /campaigns/:id/stats
- [ ] Implement real-time stat updates
- [ ] Test end-to-end campaign send

### Week 4: Frontend Integration & Deployment

#### Day 16-17: Frontend Updates
- [ ] Update `frontend/js/api-config.js` with JWT handling
- [ ] Update `frontend/js/auth.js` to call backend
- [ ] Update `frontend/app.js` to fetch campaigns from backend
- [ ] Update email composer to use backend API
- [ ] Test all frontend pages

#### Day 18-19: Deployment Setup
- [ ] Create Railway.app account
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Configure production environment variables
- [ ] Test production end-to-end

#### Day 20: Testing & Documentation
- [ ] Write integration tests
- [ ] Create API documentation (Swagger)
- [ ] Write README with setup instructions
- [ ] Create deployment guide

---

## SECURITY CHECKLIST

- [ ] **Passwords:** Never stored plaintext, always BCRoot hashed
- [ ] **JWT:** Signed with strong secret key (64+ chars)
- [ ] **API Keys:** Not hardcoded, use environment variables
- [ ] **Encryption:** Provider credentials encrypted with AES-256
- [ ] **CORS:** Configured to specific domains, not "*"
- [ ] **Https:** Enforced in production
- [ ] **Input validation:** All endpoints validate incoming data
- [ ] **SQL injection:** Prevented by Spring Data JPA (parameterized queries)
- [ ] **XSS:** Email body sanitized before sending
- [ ] **CSRF:** Protection enabled for state-changing requests
- [ ] **Rate limiting:** Implemented on auth endpoints
- [ ] **Error messages:** Don't expose sensitive information
- [ ] **Logging:** Sensitive data (passwords, tokens) never logged
- [ ] **Email verification:** Required before account activation

---

## TROUBLESHOOTING GUIDE

### Issue: "Connection refused" when starting app
**Solution:**
- Verify Supabase connection string in application.properties
- Check if Supabase project is active
- Verify firewall/VPN isn't blocking port 5432

### Issue: JWT token invalid after few minutes
**Solution:**
- Check `jwt.expiration` value (should be milliseconds, not seconds)
- Ensure `jwt.secret` is same across all environments
- Frontend must refresh token before it expires

### Issue: Email not sending
**Solution:**
- Verify SMTP credentials in application.properties
- Enable "Less secure app access" for Gmail
- Generate App-Specific Password for Gmail
- Check email provider logs for SMTP errors

### Issue: CORS errors when frontend calls backend
**Solution:**
- Update `cors.allowed-origins` in application.properties
- Add `cors.allowed-headers` including "Authorization"
- Restart backend after config changes

---

## NEXT STEPS

1. **TODAY:** Setup Supabase + Run SQL schema
2. **TOMORROW:** Start implementing Java backend (entities, repositories)
3. **THIS WEEK:** Complete authentication system
4. **NEXT WEEK:** Email sending and campaign execution
5. **FOLLOWING WEEK:** Frontend integration and deployment

---

**This blueprint is production-ready. Follow it step-by-step and you'll have a complete email marketing platform! 🚀**
