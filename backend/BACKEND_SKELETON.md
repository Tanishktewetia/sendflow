# Backend Source Skeleton

```text
backend/
├── pom.xml
├── .env
└── src/
    └── main/
        ├── java/
        │   └── com/
        │       └── javamailer/
        │           ├── JavaMailerApplication.java
        │           ├── config/
        │           │   └── RestTemplateConfig.java
        │           ├── controller/
        │           │   ├── AuthController.java
        │           │   ├── CampaignController.java
        │           │   ├── CampaignQueueController.java
        │           │   ├── CsvQueueController.java
        │           │   ├── EmailController.java
        │           │   ├── EmailProviderController.java
        │           │   ├── UploadController.java
        │           │   └── UserController.java
        │           ├── entity/
        │           │   ├── ActivityLog.java
        │           │   ├── AppSettings.java
        │           │   ├── AuditLog.java
        │           │   ├── Campaign.java
        │           │   ├── CampaignQueue.java
        │           │   ├── CampaignRecipient.java
        │           │   ├── CampaignRuntimeEvent.java
        │           │   ├── CampaignStatsDaily.java
        │           │   ├── CampaignStatsYearly.java
        │           │   ├── CsvUpload.java
        │           │   ├── EmailLog.java
        │           │   ├── EmailProvider.java
        │           │   ├── EmailVerificationToken.java
        │           │   ├── PasswordResetToken.java
        │           │   ├── PendingRegistration.java
        │           │   └── User.java
        │           ├── model/
        │           │   ├── CampaignStats.java
        │           │   ├── Email.java
        │           │   └── Recipient.java
        │           ├── repository/
        │           │   ├── ActivityLogRepository.java
        │           │   ├── AppSettingsRepository.java
        │           │   ├── AuditLogRepository.java
        │           │   ├── CampaignQueueRepository.java
        │           │   ├── CampaignRecipientRepository.java
        │           │   ├── CampaignRepository.java
        │           │   ├── CampaignRuntimeEventRepository.java
        │           │   ├── CampaignStatsDailyRepository.java
        │           │   ├── CampaignStatsYearlyRepository.java
        │           │   ├── CsvUploadRepository.java
        │           │   ├── EmailLogRepository.java
        │           │   ├── EmailProviderRepository.java
        │           │   ├── EmailVerificationTokenRepository.java
        │           │   ├── PasswordResetTokenRepository.java
        │           │   ├── PendingRegistrationRepository.java
        │           │   └── UserRepository.java
        │           ├── security/
        │           │   ├── JwtAuthenticationFilter.java
        │           │   ├── JwtTokenProvider.java
        │           │   ├── JwtUserDetails.java
        │           │   └── SecurityConfig.java
        │           ├── service/
        │           │   ├── ActivityLogService.java
        │           │   ├── AuthService.java
        │           │   ├── CampaignDashboardStatsService.java
        │           │   ├── CampaignExecutorService.java
        │           │   ├── CampaignRuntimeEventService.java
        │           │   ├── CampaignService.java
        │           │   ├── CSVParserService.java
        │           │   ├── CsvQueueService.java
        │           │   ├── CsvService.java
        │           │   ├── EmailProviderService.java
        │           │   ├── EmailService.java
        │           │   ├── EmailTestService.java
        │           │   ├── QueueService.java
        │           │   ├── StorageService.java
        │           │   ├── SupabaseStorageService.java
        │           │   ├── SystemEmailService.java
        │           │   └── UserService.java
        │           └── util/
        │               ├── EmailProviderFactory.java
        │               ├── EmailSender.java
        │               ├── EmailValidator.java
        │               ├── EncryptionUtil.java
        │               ├── GmailEmailSender.java
        │               ├── OutlookEmailSender.java
        │               ├── ResendEmailSender.java
        │               └── SmtpEmailSender.java
        └── resources/
            ├── application.properties
            └── db/
                └── migration/
                    ├── V2__CreatePendingRegistrations.sql
                    ├── V3__DropPendingRegistrations.sql
                    ├── V4__EnsureInitialSchema.sql
                    ├── V5__UpdateCampaignsSchema.sql
                    ├── V6__FixEmailProviderIdConstraint.sql
                    ├── V7__Create_ActivityLog_And_CampaignQueue.sql
                    ├── V8__Add_default_email_provider_to_users.sql
                    ├── V9__Add_CSV_Queue_To_CsvUploads.sql
                    ├── V10__Add_email_selection_preference_to_users.sql
                    ├── V11__Expand_csv_status_constraint_for_queue.sql
                    ├── V12__Expand_campaign_status_constraint.sql
                    ├── V13__Create_campaign_runtime_events_table.sql
                    └── V14__Create_campaign_dashboard_stats_tables.sql
```
