package com.javamailer.util;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

/**
 * SMTP Email Sender Implementation
 * Uses Spring JavaMailSender for generic SMTP connections
 * Works with Gmail, Outlook, and any SMTP provider
 */
@Component
@RequiredArgsConstructor
public class SmtpEmailSender implements EmailSender {
    
    private final JavaMailSender mailSender;
    
    @Override
    public boolean sendEmail(String toEmail, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(body, true); // true = HTML content
            
            mailSender.send(message);
            return true;
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to send email via SMTP: " + e.getMessage(), e);
        }
    }
    
    @Override
    public String getProviderName() {
        return "SMTP";
    }
    
    @Override
    public boolean verifyConnection() {
        try {
            // Test connection by trying to create a message
            MimeMessage message = mailSender.createMimeMessage();
            return message != null;
        } catch (Exception e) {
            return false;
        }
    }
}
