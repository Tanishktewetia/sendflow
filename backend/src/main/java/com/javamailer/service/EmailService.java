package com.javamailer.service;

import org.springframework.stereotype.Service;

/**
 * Email Service - Handles email sending logic
 * This service manages SMTP connections and email delivery
 */
@Service
public class EmailService {

    /**
     * Send a single email to a recipient
     * @param to recipient email address
     * @param subject email subject
     * @param body email body (HTML or plain text)
     * @return true if email sent successfully, false otherwise
     */
    public boolean sendEmail(String to, String subject, String body) {
        // Implementation will be added in next phase
        return false;
    }

    /**
     * Send bulk emails to a list of recipients
     * @param recipients list of email addresses
     * @param subject email subject
     * @param body email body
     * @return number of successfully sent emails
     */
    public int sendBulkEmails(java.util.List<String> recipients, String subject, String body) {
        // Implementation will be added in next phase
        return 0;
    }
}
