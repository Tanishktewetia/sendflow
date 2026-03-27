package com.javamailer.service;

import com.javamailer.entity.CampaignRecipient;
import com.javamailer.entity.EmailLog;
import com.javamailer.entity.EmailProvider;
import com.javamailer.repository.CampaignRecipientRepository;
import com.javamailer.repository.EmailLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.Message;
import jakarta.mail.Authenticator;
import jakarta.mail.PasswordAuthentication;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.MediaType;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Properties;

/**
 * Service class for email sending and logging
 * Handles SMTP/Gmail/Outlook/Resend email transmission
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class EmailService {
    
    private final EmailLogRepository emailLogRepository;
    private final CampaignRecipientRepository campaignRecipientRepository;
    private final JavaMailSender javaMailSender;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final OkHttpClient httpClient = new OkHttpClient();
    
    /**
     * Send email to single recipient
     */
    public boolean sendEmail(String toEmail, String subject, String body, EmailProvider provider) {
        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(provider.getFromEmail(), provider.getFromName());
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(body, true); // true = HTML content
            
            javaMailSender.send(message);
            return true;
            
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Send email via SMTP
     */
    public boolean sendEmailViaSMTP(String host, Integer port, String username, String password,
                                   boolean useSSL, String toEmail, String subject, String body) {
        try {
            Properties props = new Properties();
            props.put("mail.smtp.host", host);
            props.put("mail.smtp.port", port.toString());
            props.put("mail.smtp.auth", "true");
            
            if (useSSL) {
                props.put("mail.smtp.socketFactory.port", port.toString());
                props.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
            } else {
                props.put("mail.smtp.starttls.enable", "true");
                props.put("mail.smtp.starttls.required", "true");
            }
            
            Session session = Session.getInstance(props, new Authenticator() {
                @Override
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(username, password);
                }
            });
            
            MimeMessage message = new MimeMessage(session);
            message.setFrom(username);
            message.setRecipients(Message.RecipientType.TO, toEmail);
            message.setSubject(subject);
            message.setContent(body, "text/html; charset=utf-8");
            
            Transport.send(message);
            log.info("Email sent via SMTP to {}", toEmail);
            return true;
            
        } catch (Exception e) {
            log.error("SMTP send error: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Send email via Outlook
     */
    public boolean sendEmailViaOutlook(String username, String password, Integer port,
                                      String toEmail, String subject, String body) {
        try {
            String host = "smtp-mail.outlook.com";
            boolean useSSL = port == 465;
            
            return sendEmailViaSMTP(host, port, username, password, useSSL, toEmail, subject, body);
            
        } catch (Exception e) {
            log.error("Outlook send error: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Send email via Resend API
     */
    public boolean sendEmailViaResend(String apiKey, String toEmail, String subject, String body) {
        try {
            String url = "https://api.resend.com/emails";
            
            String jsonBody = objectMapper.writeValueAsString(new Object() {
                public String from = "onboarding@resend.dev";
                public String to = toEmail;
                public String subject_text = subject;
                public String html = body;
                
                // Rename for API compatibility
                public String getSubject() { return subject_text; }
            });
            
            // Fix JSON to match Resend API format
            jsonBody = jsonBody.replace("\"subject_text\"", "\"subject\"");
            jsonBody = jsonBody.replace("\"html\"", "\"html\"");
            
            RequestBody requestBody = RequestBody.create(jsonBody, MediaType.parse("application/json"));
            
            Request request = new Request.Builder()
                    .url(url)
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .addHeader("Content-Type", "application/json")
                    .post(requestBody)
                    .build();
            
            try (Response response = httpClient.newCall(request).execute()) {
                if (response.isSuccessful()) {
                    log.info("Email sent via Resend to {}", toEmail);
                    return true;
                } else {
                    log.error("Resend API error: {} - {}", response.code(), response.body() != null ? response.body().string() : "");
                    return false;
                }
            }
            
        } catch (Exception e) {
            log.error("Resend send error: {}", e.getMessage(), e);
            return false;
        }
    }
    
    /**
     * Send email and log the action
     */
    public EmailLog sendAndLogEmail(Long campaignId, Long recipientId, String recipientEmail,
                                    String subject, String bodyHtml, EmailProvider provider) {
        EmailLog emailLog = EmailLog.builder()
                .campaignId(campaignId)
                .recipientId(recipientId)
                .recipientEmail(recipientEmail)
                .subjectSent(subject)
                .status("PENDING")
                .sentAt(LocalDateTime.now())
                .build();
        
        try {
            boolean sent = sendEmail(recipientEmail, subject, bodyHtml, provider);
            
            if (sent) {
                emailLog.setStatus("SENT");
                emailLog.setSentAt(LocalDateTime.now());
                
                // Update recipient status
                Optional<CampaignRecipient> recipient = campaignRecipientRepository.findById(recipientId);
                if (recipient.isPresent()) {
                    CampaignRecipient r = recipient.get();
                    r.setStatus("SENT");
                    r.setSentAt(LocalDateTime.now());
                    campaignRecipientRepository.save(r);
                }
            } else {
                emailLog.setStatus("FAILED");
                emailLog.setSmtpResponseCode(500);
                emailLog.setSmtpResponseMessage("Email send failed");
                
                // Update recipient status
                Optional<CampaignRecipient> recipient = campaignRecipientRepository.findById(recipientId);
                if (recipient.isPresent()) {
                    CampaignRecipient r = recipient.get();
                    r.setStatus("FAILED");
                    r.setErrorMessage("Email send failed");
                    campaignRecipientRepository.save(r);
                }
            }
        } catch (Exception e) {
            emailLog.setStatus("FAILED");
            emailLog.setSmtpResponseCode(500);
            emailLog.setSmtpResponseMessage(e.getMessage());
            
            // Update recipient status
            Optional<CampaignRecipient> recipient = campaignRecipientRepository.findById(recipientId);
            if (recipient.isPresent()) {
                CampaignRecipient r = recipient.get();
                r.setStatus("FAILED");
                r.setErrorMessage(e.getMessage());
                campaignRecipientRepository.save(r);
            }
        }
        
        return emailLogRepository.save(emailLog);
    }
    
    /**
     * Record email status change (OPENED, CLICKED, etc)
     */
    public EmailLog updateEmailStatus(Long emailLogId, String newStatus) {
        Optional<EmailLog> emailLog = emailLogRepository.findById(emailLogId);
        if (emailLog.isPresent()) {
            EmailLog log = emailLog.get();
            log.setStatus(newStatus);
            
            if ("OPENED".equals(newStatus)) {
                log.setOpenedAt(LocalDateTime.now());
            } else if ("CLICKED".equals(newStatus)) {
                log.setClickedAt(LocalDateTime.now());
            }
            
            return emailLogRepository.save(log);
        }
        throw new RuntimeException("Email log not found: " + emailLogId);
    }
    
    /**
     * Record email failure
     */
    public EmailLog recordEmailFailure(Long emailLogId, int smtpCode, String errorMessage) {
        Optional<EmailLog> emailLog = emailLogRepository.findById(emailLogId);
        if (emailLog.isPresent()) {
            EmailLog log = emailLog.get();
            log.setStatus("FAILED");
            log.setSmtpResponseCode(smtpCode);
            log.setSmtpResponseMessage(errorMessage);
            return emailLogRepository.save(log);
        }
        throw new RuntimeException("Email log not found: " + emailLogId);
    }
    
    /**
     * Get email log by ID
     */
    public Optional<EmailLog> getEmailLog(Long emailLogId) {
        return emailLogRepository.findById(emailLogId);
    }
    
    /**
     * Resend failed emails for a campaign
     */
    public long resendFailedEmails(Long campaignId, EmailProvider provider) {
        long resendCount = 0;
        
        // Get failed email logs
        // Note: Would need custom repository method like: findByCampaignIdAndStatusOrderBySentAtDesc
        
        return resendCount;
    }
}
