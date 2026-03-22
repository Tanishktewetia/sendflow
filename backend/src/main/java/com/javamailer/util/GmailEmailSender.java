package com.javamailer.util;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

/**
 * Gmail Email Sender Implementation
 * Uses Gmail SMTP with OAuth2 or app password
 * SMTP Settings: smtp.gmail.com:587
 */
@Component
@RequiredArgsConstructor
public class GmailEmailSender implements EmailSender {
    
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
            throw new RuntimeException("Failed to send email via Gmail: " + e.getMessage(), e);
        }
    }
    
    @Override
    public String getProviderName() {
        return "Gmail";
    }
    
    @Override
    public boolean verifyConnection() {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            return message != null;
        } catch (Exception e) {
            return false;
        }
    }
}
