# All Backend Endpoints

```text
GET    /api/auth/me
POST   /api/auth/register
POST   /api/auth/verify-otp
POST   /api/auth/resend-otp
POST   /api/auth/verify-email
POST   /api/auth/login
POST   /api/auth/forgot-password
POST   /api/auth/verify-password-reset-otp
POST   /api/auth/reset-password
POST   /api/auth/resend-password-reset-otp

GET    /api/campaigns
GET    /api/campaigns/draft/latest
GET    /api/campaigns/{campaignId}
GET    /api/campaigns/{campaignId}/stats
GET    /api/campaigns/{campaignId}/recipients
GET    /api/campaigns/{campaignId}/logs
POST   /api/campaigns/draft/save
POST   /api/campaigns/{campaignId}/start
POST   /api/campaigns/{campaignId}/pause
POST   /api/campaigns/{campaignId}/complete
POST   /api/campaigns/{campaignId}/execute
PUT    /api/campaigns/{campaignId}
DELETE /api/campaigns/draft
DELETE /api/campaigns/{campaignId}

POST   /api/campaign-queue/upload-csv
POST   /api/campaign-queue/start-from-csv-upload
POST   /api/campaign-queue/start/{queueId}
POST   /api/campaign-queue/{queueId}/pause
POST   /api/campaign-queue/{queueId}/reset
POST   /api/campaign-queue/{queueId}/resume
POST   /api/campaign-queue/{queueId}/reprocess
GET    /api/campaign-queue/{queueId}/status
GET    /api/campaign-queue/{queueId}/events
GET    /api/campaign-queue/events/recent
GET    /api/campaign-queue/events/export
GET    /api/campaign-queue/dashboard-stats
GET    /api/campaign-queue/activity-log
DELETE /api/campaign-queue/events
DELETE /api/campaign-queue/dashboard-stats
DELETE /api/campaign-queue/{campaignId}

GET    /api/csv/queue
POST   /api/csv/queue/{csvUploadId}
POST   /api/csv/queue/reorder/{csvUploadId}
DELETE /api/csv/queue
DELETE /api/csv/queue/{csvUploadId}

GET    /api/emails/health
GET    /api/emails/providers
GET    /api/emails/providers/verified
GET    /api/emails/stats
POST   /api/emails/send
POST   /api/emails/upload-csv

GET    /api/email-providers
GET    /api/email-providers/verified
GET    /api/email-providers/{providerId}
GET    /api/email-providers/default
POST   /api/email-providers
POST   /api/email-providers/verify
POST   /api/email-providers/verify/test
POST   /api/email-providers/confirm
POST   /api/email-providers/{providerId}/deactivate
POST   /api/email-providers/verify/resend
POST   /api/email-providers/verify/smtp
POST   /api/email-providers/verify/outlook
POST   /api/email-providers/{providerId}/set-as-default
PUT    /api/email-providers/{providerId}
DELETE /api/email-providers/{providerId}

GET    /api/uploads
GET    /api/uploads/recent
GET    /api/uploads/{uploadId}
GET    /api/uploads/{uploadId}/summary
POST   /api/uploads/csv
DELETE /api/uploads/{uploadId}

GET    /api/users/profile
GET    /api/users/email-selection-preference
PUT    /api/users/profile
POST   /api/users/change-password
POST   /api/users/deactivate
POST   /api/users/avatar/upload
POST   /api/users/email-selection-preference
DELETE /api/users/delete-account
DELETE /api/users/avatar
```
