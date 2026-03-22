package com.javamailer.util;

/**
 * Email Sender Strategy Interface
 * Defines contract for different email provider implementations
 */
public interface EmailSender {
    
    /**
     * Send email through the provider
     * @param toEmail recipient email address
     * @param subject email subject line
     * @param body email body (HTML supported)
     * @return true if send successful, false otherwise
     * @throws RuntimeException if sending fails
     */
    boolean sendEmail(String toEmail, String subject, String body);
    
    /**
     * Get provider name
     * @return provider name (e.g., "Resend", "Gmail", "SMTP")
     */
    String getProviderName();
    
    /**
     * Verify connection to email provider
     * @return true if provider is configured correctly
     */
    boolean verifyConnection();
}
