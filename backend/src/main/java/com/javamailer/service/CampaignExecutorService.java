package com.javamailer.service;

import com.javamailer.entity.Campaign;
import com.javamailer.entity.CampaignQueue;
import com.javamailer.entity.CsvUpload;
import com.javamailer.entity.EmailProvider;
import com.javamailer.repository.CampaignQueueRepository;
import com.javamailer.repository.CampaignRepository;
import com.javamailer.repository.CsvUploadRepository;
import com.javamailer.repository.EmailProviderRepository;
import com.javamailer.util.EncryptionUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * CampaignExecutorService - Execute campaigns by sending emails to recipients
 * Processes CSV recipients row by row using appropriate email provider
 * Handles template variable replacement and error tracking
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignExecutorService {
    
    private final CampaignQueueRepository campaignQueueRepository;
    private final CampaignRepository campaignRepository;
    private final CsvUploadRepository csvUploadRepository;
    private final EmailProviderRepository emailProviderRepository;
    private final EmailService emailService;
    private final CSVParserService csvParserService;
    private final QueueService queueService;
    private final SupabaseStorageService supabaseStorageService;
    private final ActivityLogService activityLogService;
    private final CampaignRuntimeEventService campaignRuntimeEventService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    /**
     * Execute campaign asynchronously
     * Process all recipients in CSV and send emails using campaign provider
     */
    @Async
    public void executeCampaign(Long queueId) {
        executeCampaign(queueId, null, null);
    }

    @Async
    public void executeCampaign(Long queueId, Integer rangeFrom, Integer rangeTo) {
        boolean shouldStartNextQueuedCampaign = false;
        CampaignQueue queueEntry = campaignQueueRepository.findById(queueId)
                .orElseThrow(() -> new IllegalArgumentException("Queue entry not found: " + queueId));
        
        Campaign campaign = campaignRepository.findById(queueEntry.getCampaignId())
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found"));
        
        CsvUpload csvUpload = csvUploadRepository.findById(queueEntry.getCsvUploadId())
                .orElseThrow(() -> new IllegalArgumentException("CSV not found"));
        
        EmailProvider provider = null;
        if (campaign.getEmailProviderId() != null) {
            provider = emailProviderRepository.findById(campaign.getEmailProviderId()).orElse(null);
        }
        
        if (provider == null) {
            String error = "No email provider configured for campaign";
            log.error(error);
            campaignRuntimeEventService.append(queueId, "error", error);
            queueService.failCampaign(queueId, error);
            shouldStartNextQueuedCampaign = true;
            return;
        }
        
        try {
            // Load CSV data
            byte[] csvData = supabaseStorageService.downloadCsvFile(csvUpload.getFileStoragePath());
            List<Map<String, String>> records = csvParserService.parseCsv(
                    new java.io.ByteArrayInputStream(csvData)
            );

                int totalRows = records.size();
                int fromIndex = Math.max(0, (rangeFrom != null ? rangeFrom : 1) - 1);
                int toIndex = Math.min(totalRows - 1, (rangeTo != null ? rangeTo : totalRows) - 1);
                if (fromIndex > toIndex) {
                String error = "Invalid send range. from=" + (rangeFrom != null ? rangeFrom : 1)
                    + ", to=" + (rangeTo != null ? rangeTo : totalRows)
                    + ", totalRows=" + totalRows;
                campaignRuntimeEventService.append(queueId, "error", error);
                queueService.failCampaign(queueId, error);
                shouldStartNextQueuedCampaign = true;
                return;
                }
            
            // Decrypt provider config
            Map<String, Object> providerConfig = getDecryptedProviderConfig(provider);
            
            log.info("Starting campaign execution - Queue: {}, Recipients: {}, Provider: {}",
                    queueId, records.size(), provider.getProviderType());
                campaignRuntimeEventService.append(queueId, "status",
                    "Execution started. Provider=" + provider.getProviderType()
                        + ", rows=" + totalRows
                        + ", range=" + (fromIndex + 1) + "-" + (toIndex + 1));
            
            Integer sentCount = 0;
            Integer failedCount = 0;
            boolean interrupted = false;
            
            // Process each recipient
                int resumeIndex = Math.max(fromIndex, queueEntry.getCurrentRow() != null ? queueEntry.getCurrentRow() : fromIndex);
                for (int i = resumeIndex; i <= toIndex; i++) {
                // Check if still processing or paused
                CampaignQueue status = campaignQueueRepository.findById(queueId).orElse(null);
                if (status == null || !status.getStatus().equals("PROCESSING")) {
                    log.info("Campaign execution interrupted - Queue: {}, Status: {}",
                            queueId, status != null ? status.getStatus() : "DELETED");
                    campaignRuntimeEventService.append(queueId, "warning",
                        "Execution interrupted. Status=" + (status != null ? status.getStatus() : "DELETED"));
                    interrupted = true;
                    break;
                }
                
                Map<String, String> recipient = records.get(i);
                String recipientEmail = recipient.get("email");
                String recipientName = recipient.getOrDefault("name", "");
                
                try {
                    campaignRuntimeEventService.append(queueId, "info",
                        "Processing row " + (i + 1) + " -> " + recipientEmail,
                        i + 1,
                        recipientEmail);

                    // Keep row-level failures isolated so processing always advances to next row.
                    String rawBody = campaign.getEmailBody() != null ? campaign.getEmailBody() : "";
                    String rawSubject = campaign.getSubject() != null ? campaign.getSubject() : "";
                    String safeName = recipientName != null ? recipientName : "";
                    String safeEmail = recipientEmail != null ? recipientEmail : "";

                    String emailBody = rawBody
                            .replace("{{name}}", safeName)
                            .replace("{{email}}", safeEmail);

                    String subject = rawSubject
                            .replace("{{name}}", safeName)
                            .replace("{{email}}", safeEmail);

                    // Send email using provider
                    boolean sent = sendEmailViaProvider(provider, providerConfig,
                            recipientEmail, recipientName, subject, emailBody);
                    
                    if (sent) {
                        sentCount++;
                        log.debug("Email sent to {}", recipientEmail);
                        campaignRuntimeEventService.append(queueId, "success",
                                "Email sent", i + 1, recipientEmail);
                    } else {
                        failedCount++;
                        log.warn("Email failed to {}", recipientEmail);
                        campaignRuntimeEventService.append(queueId, "error",
                                "Email failed (provider returned false)", i + 1, recipientEmail);
                    }
                    
                } catch (Exception e) {
                    failedCount++;
                    log.error("Error sending email to {}: {}", recipientEmail, e.getMessage());
                    campaignRuntimeEventService.append(queueId, "error",
                            "Send exception: " + e.getMessage(), i + 1, recipientEmail);
                }

                // Update progress every row for transparent live dashboard + pause accuracy
                queueService.updateProgress(queueId, i + 1, sentCount, failedCount);
                log.debug("Progress update - Row: {}/{}, Sent: {}, Failed: {}",
                        i + 1, records.size(), sentCount, failedCount);
            }

            if (!interrupted) {
                queueService.completeCampaign(queueId);
                shouldStartNextQueuedCampaign = true;
                campaignRuntimeEventService.append(queueId, "status",
                        "Campaign completed. Sent=" + sentCount + ", Failed=" + failedCount);
                log.info("Campaign execution completed - Queue: {}, Sent: {}, Failed: {}",
                        queueId, sentCount, failedCount);
            }
            
        } catch (Exception e) {
            log.error("Campaign execution failed: {}", e.getMessage(), e);
            campaignRuntimeEventService.append(queueId, "error", "Execution error: " + e.getMessage());
            queueService.failCampaign(queueId, "Execution error: " + e.getMessage());
            shouldStartNextQueuedCampaign = true;
        } finally {
            if (shouldStartNextQueuedCampaign) {
                startNextQueuedCampaign(queueId);
            }
        }
    }

    private void startNextQueuedCampaign(Long completedQueueId) {
        try {
            if (!queueService.hasCapacity()) {
                return;
            }

            queueService.getNextCampaignToProcess().ifPresent(next -> {
                if (next.getId().equals(completedQueueId)) {
                    return;
                }

                try {
                    queueService.startProcessing(next.getId());
                    executeCampaign(next.getId());
                    log.info("Auto-started next queued campaign after {} -> {}", completedQueueId, next.getId());
                } catch (Exception ex) {
                    log.error("Failed to auto-start next campaign {} after {}: {}",
                            next.getId(), completedQueueId, ex.getMessage(), ex);
                }
            });
        } catch (Exception e) {
            log.error("Error while selecting next queued campaign after {}: {}", completedQueueId, e.getMessage(), e);
        }
    }
    
    /**
     * Execute campaign for reprocessing (only failed recipients)
     */
    @Async
    public void reprocessCampaign(Long queueId) {
        CampaignQueue queueEntry = campaignQueueRepository.findById(queueId)
                .orElseThrow(() -> new IllegalArgumentException("Queue entry not found"));
        
        Campaign campaign = campaignRepository.findById(queueEntry.getCampaignId()).orElse(null);
        if (campaign == null) {
            queueService.failCampaign(queueId, "Campaign not found");
            return;
        }
        
        EmailProvider provider = emailProviderRepository.findById(campaign.getEmailProviderId()).orElse(null);
        if (provider == null) {
            queueService.failCampaign(queueId, "No email provider configured");
            return;
        }
        
        try {
            // Load CSV data
            CsvUpload csvUpload = csvUploadRepository.findById(queueEntry.getCsvUploadId()).orElse(null);
            if (csvUpload == null) {
                queueService.failCampaign(queueId, "CSV upload not found");
                return;
            }
            
            byte[] csvData = supabaseStorageService.downloadCsvFile(csvUpload.getFileStoragePath());
            List<Map<String, String>> records = csvParserService.parseCsv(
                    new java.io.ByteArrayInputStream(csvData)
            );
            
            // Decrypt provider config
            Map<String, Object> providerConfig = getDecryptedProviderConfig(provider);
            
            // Only reprocess failed records (would need to track these separately)
            // For now, we'll reprocess a subset based on failed count
            Integer newSentCount = 0;
            Integer newFailedCount = 0;
            
            for (int i = 0; i < records.size() && i < queueEntry.getFailedRecipients(); i++) {
                Map<String, String> recipient = records.get(i);
                String recipientEmail = recipient.get("email");
                String recipientName = recipient.getOrDefault("name", "");
                
                String emailBody = campaign.getEmailBody()
                        .replace("{{name}}", recipientName)
                        .replace("{{email}}", recipientEmail);
                
                String subject = campaign.getSubject()
                        .replace("{{name}}", recipientName)
                        .replace("{{email}}", recipientEmail);
                
                try {
                    boolean sent = sendEmailViaProvider(provider, providerConfig,
                            recipientEmail, recipientName, subject, emailBody);
                    if (sent) newSentCount++;
                    else newFailedCount++;
                } catch (Exception e) {
                    newFailedCount++;
                    log.error("Reprocess error for {}: {}", recipientEmail, e.getMessage());
                }
            }
            
            // Update with new results
            queueService.updateProgress(queueId, records.size(), newSentCount, newFailedCount);
            queueService.completeCampaign(queueId);
            
            log.info("Reprocessing completed - Queue: {}, Sent: {}, Failed: {}",
                    queueId, newSentCount, newFailedCount);
            
        } catch (Exception e) {
            log.error("Reprocessing failed: {}", e.getMessage(), e);
            queueService.failCampaign(queueId, "Reprocessing error: " + e.getMessage());
        }
    }
    
    /**
     * Send email via the configured provider
     */
    private boolean sendEmailViaProvider(EmailProvider provider, Map<String, Object> config,
                                         String recipientEmail, String recipientName,
                                         String subject, String emailBody) {
        try {
            String providerType = provider.getProviderType().toUpperCase();
            
            switch (providerType) {
                case "SMTP":
                    String host = getStringConfig(config, "smtpHost", "host");
                    Integer port = getIntConfig(config, 587, "smtpPort", "port");
                    String username = getStringConfig(config, "smtpUsername", "username", "email");
                    String password = getStringConfig(config, "smtpPassword", "password");
                    boolean useSSL = getBooleanConfig(config, port != null && port == 465, "useSSL", "useSsl");

                    // Backward-compatible fallback for older saved provider configs.
                    if (username == null) {
                        username = provider.getFromEmail();
                    }
                    if (host == null && username != null) {
                        String normalizedEmail = username.toLowerCase();
                        if (normalizedEmail.endsWith("@gmail.com")) {
                            host = "smtp.gmail.com";
                            if (port == null) port = 587;
                        } else if (normalizedEmail.endsWith("@outlook.com")
                                || normalizedEmail.endsWith("@hotmail.com")
                                || normalizedEmail.endsWith("@live.com")) {
                            host = "smtp-mail.outlook.com";
                            if (port == null) port = 587;
                        }
                    }

                    if (host == null || username == null || password == null) {
                        log.error("SMTP config incomplete. host={}, usernamePresent={}, passwordPresent={}",
                                host, username != null, password != null);
                        return false;
                    }
                    
                    return emailService.sendEmailViaSMTP(host, port, username, password,
                            useSSL, recipientEmail, subject, emailBody);
                
                case "OUTLOOK":
                    String outlookUsername = getStringConfig(config, "smtpUsername", "username", "email");
                    String outlookPassword = getStringConfig(config, "smtpPassword", "password");
                    Integer outlookPort = getIntConfig(config, 587, "smtpPort", "port");

                    if (outlookUsername == null || outlookPassword == null) {
                        log.error("Outlook config incomplete. usernamePresent={}, passwordPresent={}",
                                outlookUsername != null, outlookPassword != null);
                        return false;
                    }
                    
                    return emailService.sendEmailViaOutlook(outlookUsername, outlookPassword,
                            outlookPort, recipientEmail, subject, emailBody);
                
                case "RESEND":
                    String apiKey = (String) config.get("apiKey");
                    return emailService.sendEmailViaResend(apiKey, recipientEmail, subject, emailBody);
                
                default:
                    log.error("Unknown provider type: {}", providerType);
                    return false;
            }
        } catch (Exception e) {
            log.error("Error sending via {} to {}: {}", provider.getProviderType(), recipientEmail, e.getMessage(), e);
            return false;
        }
    }
    
    /**
     * Decrypt provider configuration
     */
    private Map<String, Object> getDecryptedProviderConfig(EmailProvider provider) {
        try {
            String encryptedConfig = provider.getEncryptedConfig();
            if (encryptedConfig == null || encryptedConfig.isEmpty()) {
                return new java.util.HashMap<>();
            }
            
            String decryptedJson = EncryptionUtil.decrypt(encryptedConfig);
            return objectMapper.readValue(decryptedJson, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.error("Failed to decrypt config: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to decrypt email provider config", e);
        }
    }

    private String getStringConfig(Map<String, Object> config, String... keys) {
        for (String key : keys) {
            Object value = config.get(key);
            if (value != null) {
                String str = String.valueOf(value).trim();
                if (!str.isEmpty()) {
                    return str;
                }
            }
        }
        return null;
    }

    private Integer getIntConfig(Map<String, Object> config, Integer defaultValue, String... keys) {
        for (String key : keys) {
            Object value = config.get(key);
            if (value instanceof Number number) {
                return number.intValue();
            }
            if (value instanceof String str) {
                try {
                    return Integer.parseInt(str.trim());
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return defaultValue;
    }

    private boolean getBooleanConfig(Map<String, Object> config, boolean defaultValue, String... keys) {
        for (String key : keys) {
            Object value = config.get(key);
            if (value instanceof Boolean bool) {
                return bool;
            }
            if (value instanceof String str) {
                return Boolean.parseBoolean(str.trim());
            }
        }
        return defaultValue;
    }
}
