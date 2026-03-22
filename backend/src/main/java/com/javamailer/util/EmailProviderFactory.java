package com.javamailer.util;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.util.Map;

/**
 * Email Provider Factory
 * Uses Strategy Pattern to select appropriate email sender
 * Routes to Resend, SMTP, Gmail, or Outlook based on provider type
 */
@Component
@RequiredArgsConstructor
public class EmailProviderFactory {
    
    private final ResendEmailSender resendEmailSender;
    private final SmtpEmailSender smtpEmailSender;
    private final GmailEmailSender gmailEmailSender;
    private final OutlookEmailSender outlookEmailSender;
    
    /**
     * Get email sender for the given provider type
     * @param providerType type of provider (RESEND, SMTP, GMAIL, OUTLOOK)
     * @return appropriate EmailSender implementation
     * @throws IllegalArgumentException if provider type is not supported
     */
    public EmailSender getEmailSender(String providerType) {
        if (providerType == null) {
            throw new IllegalArgumentException("Provider type cannot be null");
        }
        
        return switch (providerType.toUpperCase()) {
            case "RESEND" -> resendEmailSender;
            case "SMTP" -> smtpEmailSender;
            case "GMAIL" -> gmailEmailSender;
            case "OUTLOOK" -> outlookEmailSender;
            default -> throw new IllegalArgumentException("Unsupported provider type: " + providerType);
        };
    }
    
    /**
     * Send email using the specified provider
     * @param providerType email provider type
     * @param toEmail recipient email
     * @param subject email subject
     * @param body email body (HTML)
     * @return true if send successful
     */
    public boolean sendEmailVia(String providerType, String toEmail, String subject, String body) {
        EmailSender sender = getEmailSender(providerType);
        return sender.sendEmail(toEmail, subject, body);
    }
    
    /**
     * Get all supported providers
     * @return map of provider name to description
     */
    public Map<String, String> getSupportedProviders() {
        return Map.of(
            "RESEND", "Resend Email Service API",
            "SMTP", "Generic SMTP Server",
            "GMAIL", "Gmail SMTP (smtp.gmail.com:587)",
            "OUTLOOK", "Outlook SMTP (smtp.office365.com:587)"
        );
    }
}
