# Queue System Implementation Progress

**Status:** IN PROGRESS  
**Last Updated:** March 27, 2026  
**Target:** Complete queue system with real-time processing

## ✅ Completed Tasks

### Phase 1: Database Schema
- [ ] Create ActivityLog entity
- [ ] Create CampaignQueue entity  
- [ ] Create V7 migration for new tables
- [ ] Update existing entities if needed

### Phase 2: Core Services
- [ ] CSVParserService - Parse and validate CSV files
- [ ] QueueService - FIFO queue management (max 5 concurrent)
- [ ] CampaignExecutorService - Row-by-row email sending
- [ ] ActivityLogService - Track all user actions
- [ ] BulkEmailService - Enhanced email sending with provider fallback

### Phase 3: Repositories
- [ ] ActivityLogRepository
- [ ] CampaignQueueRepository

### Phase 4: REST Endpoints
- [ ] POST /campaigns/upload-csv - Upload and parse CSV
- [ ] POST /campaigns/start - Start campaign execution
- [ ] POST /campaigns/{id}/pause - Pause running campaign
- [ ] POST /campaigns/{id}/resume - Resume paused campaign
- [ ] POST /campaigns/{id}/reprocess - Requeue processed CSV
- [ ] GET /campaigns/{id}/status - Real-time status with polling
- [ ] GET /activity-log - Get recent activity with pagination
- [ ] POST /campaigns/{id}/cancel - Cancel campaign

### Phase 5: Real-Time Features
- [ ] Polling endpoint for campaign progress
- [ ] Activity log real-time updates
- [ ] Queue status visibility
- [ ] Processing statistics

## 📊 Implementation Details

### CSV Parser
- Input: Multipart file upload
- Process:
  1. Read CSV header (validate 'name' and 'email' columns exist)
  2. Parse each row and validate email format
  3. Check for duplicates
  4. Store metadata (total, valid, invalid, duplicates)
  5. Store file in Supabase storage

### Queue Management
- Max 5 concurrent CSV files in processing queue
- FIFO order (First Come First Served)
- Tracking: queued_at, started_at, completed_at, status
- Status values: QUEUED, PROCESSING, COMPLETED, PAUSED

### Campaign Execution
- Default email provider must be set
- Process each row in CSV:
  1. Get recipient name and email
  2. Replace {{name}} and {{email}} in subject and body
  3. Send via default provider (SMTP/Outlook/Resend)
  4. Log result (success/failure)
  5. Update progress (sent_count, failed_count)
- On completion: Mark CSV as processed, grey it out, show Reprocess button
- Reprocess: Add CSV back to queue with same order preference

### Activity Tracking
Events logged to database:
- CSV uploaded (filename, total rows)
- Campaign started (campaign name, total recipients)
- Campaign paused (timestamp)
- Campaign resumed (timestamp)
- Campaign completed (emails sent, failures)
- CSV reprocessed (timestamp, new queue position)
- CSV deleted (filename)
- Email provider set as default (provider name)
- Email provider deleted (provider name)
- Campaign cancelled (reason if any)

### Real-Time Updates
- Polling: GET /campaigns/{id}/status returns current progress
- Response includes: current_row, total_rows, sent, failed, status, elapsed_time
- Frontend updates every 1-2 seconds during active campaign

## 🔄 User Flow

1. User uploads CSV → Parsed, validated, stored
2. User composes email (subject + body with {{name}}, {{email}})
3. Selects default email provider (if not set, error)
4. Clicks "Start Campaign"
5. System processes queue (FIFO):
   - Move CSV to PROCESSING status
   - Iterate through each row
   - Send email via provider
   - Log activity
   - Update real-time progress
6. Campaign completes:
   - CSV marked as COMPLETED
   - Greyed out in UI
   - "Reprocess" button shown
   - New activity log entry
7. User can reprocess:
   - Click "Reprocess"
   - CSV moved to end of queue
   - Same flow repeats

## 📋 Tables Created

### activity_logs
- id (PK)
- user_id (FK)
- action_type (enum)
- action_details (JSON)
- created_at
- metadata (optional)

### campaign_queue
- id (PK)
- campaign_id (FK)
- csv_upload_id (FK)
- queue_position
- status (QUEUED, PROCESSING, COMPLETED, PAUSED)
- total_recipients
- sent_count
- failed_count
- queued_at
- started_at
- completed_at
- paused_at
- error_message
- user_id (FK)

## 📦 Dependencies Used
- Spring Data JPA
- Jackson (JSON processing)
- OpenCSV or Similar (CSV parsing)
- Supabase Storage (File storage)

## 🎯 Next Steps
1. Create entities
2. Create migration
3. Create repositories
4. Create services
5. Create endpoints
6. Test complete flow

---

**Initialization:** 2026-03-27 00:58 IST  
**Expected Completion:** 2026-03-27 02:00 IST (Approx 1 hour)
