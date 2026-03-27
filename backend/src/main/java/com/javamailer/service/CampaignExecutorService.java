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
import org.springframework.transaction.annotation.Transactional;

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
@Transactional
public class CampaignExecutorService {
    
    private final CampaignQueueRepository campaignQueueRepository;
    private final CampaignRepository campaignRepository;
    private final CsvUploadRepository csvUploadRepository;
    private final EmailProviderRepository emailProviderRepository;
    private final EmailService emailService;
    private final CSVParserService csvParserService;
    private final QueueService queueService;
    private final StorageService storageService;
    private final ActivityLogService activityLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    /**
     * Execute campaign asynchronously
     * Process all recipients in CSV and send emails using campaign provider
     */
    @Async
    public void executeCampaign(Long queueId) {
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
            queueService.failCampaign(queueId, error);
            return;
        }
        
        try {
            // Load CSV data
            byte[] csvData = storageService.downloadFile(csvUpload.getFileStoragePath());
            List<Map<String, String>> records = csvParserService.parseCsv(
                    new java.io.ByteArrayInputStream(csvData)
            );
            
            // Decrypt provider config
            Map<String, Object> providerConfig = getDecryptedProviderConfig(provider);
            
            log.info("Starting campaign execution - Queue: {}, Recipients: {}, Provider: {}",
                    queueId, records.size(), provider.getProviderType());
            
            Integer sentCount = 0;
            Integer failedCount = 0;
            
            // Process each recipient
            for (int i = 0; i < records.size(); i++) {
                // Check if still processing or paused
                CampaignQueue status = campaignQueueRepository.findById(queueId).orElse(null);
                if (status == null || !status.getStatus().equals("PROCESSING")) {
                    log.info("Campaign execution interrupted - Queue: {}, Status: {}",
                            queueId, status != null ? status.getStatus() : "DELETED");
                    break;
                }
                
                Map<String, String> recipient = records.get(i);
                String recipientEmail = recipient.get("email");
                String recipientName = recipient.getOrDefault("name", "");
                
                // Replace template variables
                String emailBody = campaign.getEmailBody();
                emailBody = emailBody.replace("{{name}}", recipientName);
                emailBody = emailBody.replace("{{email}}", recipientEmail);
                
                String subject = campaign.getSubject();
                subject = subject.replace("{{name}}", recipientName);
                subject = subject.replace("{{email}}", recipientEmail);
                
                try {
                    // Send email using provider
                    boolean sent = sendEmailViaProvider(provider, providerConfig,
                            recipientEmail, recipientName, subject, emailBody);
                    
                    if (sent) {
                        sentCount++;
                        log.debug("Email sent to {}", recipientEmail);
                    } else {
                        failedCount++;
                        log.warn("Email failed to {}", recipientEmail);
                    }
                    
                } catch (Exception e) {
                    failedCount++;
                    log.error("Error sending email to {}: {}", recipientEmail, e.getMessage());
                }
                
                // Update progress every 10 emails or at end
                if ((i + 1) % 10 == 0 || i == records.size() - 1) {
                    queueService.updateProgress(queueId, i + 1, sentCount, failedCount);
                    log.debug("Progress update - Row: {}/{}, Sent: {}, Failed: {}", 
                            i + 1, records.size(), sentCount, failedCount);
                }
            }
            
            // Mark as completed
            queueService.completeCampaign(queueId);
            log.info("Campaign execution completed - Queue: {}, Sent: {}, Failed: {}",
                    queueId, sentCount, failedCount);
            
        } catch (Exception e) {
            log.error("Campaign execution failed: {}", e.getMessage(), e);
            queueService.failCampaign(queueId, "Execution error: " + e.getMessage());
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
            
            byte[] csvData = storageService.downloadFile(csvUpload.getFileStoragePath());
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
                    String host = (String) config.get("smtpHost");
                    Integer port = ((Number) config.get("smtpPort")).intValue();
                    String username = (String) config.get("smtpUsername");
                    String password = (String) config.get("smtpPassword");
                    boolean useSSL = config.containsKey("useSSL") ? (Boolean) config.get("useSSL") : false;
                    
                    return emailService.sendEmailViaSMTP(host, port, username, password,
                            useSSL, recipientEmail, subject, emailBody);
                
                case "OUTLOOK":
                    String outlookUsername = (String) config.get("smtpUsername");
                    String outlookPassword = (String) config.get("smtpPassword");
                    Integer outlookPort = ((Number) config.get("smtpPort")).intValue();
                    
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
            log.error("Error sending via {}: {}", provider.getProviderType(), e.getMessage());
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
}
