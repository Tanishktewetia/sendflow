package com.javamailer.service;

import com.javamailer.entity.CampaignRecipient;
import com.javamailer.entity.EmailLog;
import com.javamailer.entity.EmailProvider;
import com.javamailer.repository.CampaignRecipientRepository;
import com.javamailer.repository.EmailLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Service class for email sending and logging
 * Handles SMTP/Gmail/Outlook/Resend email transmission
 */
@Service
@RequiredArgsConstructor
@Transactional
public class EmailService {
    
    private final EmailLogRepository emailLogRepository;
    private final CampaignRecipientRepository campaignRecipientRepository;
    private final JavaMailSender javaMailSender;
    
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
