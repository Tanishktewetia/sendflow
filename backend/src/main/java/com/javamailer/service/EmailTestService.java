package com.javamailer.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import okhttp3.*;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.internet.MimeMessage;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;
import java.util.UUID;

/**
 * Email Test Service
 * Handles sending test emails for email provider verification
 * Supports: SMTP, Gmail, Outlook, Resend
 */
@Service
@RequiredArgsConstructor
public class EmailTestService {
    
    private final ObjectMapper objectMapper;
    private final OkHttpClient httpClient = new OkHttpClient();
    
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    private static final String VERIFICATION_SUBJECT = "Sendflow - Email Provider Verification Test ✓";
    private static final String SENDFLOW_FROM_EMAIL = "onboarding@resend.dev";  // Verified Resend onboarding email
    
    /**
     * Generate professional HTML email template for verification
     */
    private static String getVerificationHtmlTemplate() {
        return "<!DOCTYPE html>\n" +
            "<html lang=\"en\">\n" +
            "<head>\n" +
            "    <meta charset=\"UTF-8\">\n" +
            "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
            "    <title>Email Provider Verification</title>\n" +
            "    <style>\n" +
            "        * { margin: 0; padding: 0; box-sizing: border-box; }\n" +
            "        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f8f8; padding: 20px; }\n" +
            "        .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }\n" +
            "        .header { text-align: center; padding: 40px 20px; background: white; border-bottom: 1px solid #e5e5e5; }\n" +
            "        .brand-heading { font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #1abc9c, #16a085); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 10px; letter-spacing: -0.5px; }\n" +
            "        .title { font-size: 20px; font-weight: 600; color: #333; margin-bottom: 5px; }\n" +
            "        .subtitle { font-size: 14px; color: #999; }\n" +
            "        .content { padding: 40px 30px; text-align: center; }\n" +
            "        .tick-icon { font-size: 60px; margin-bottom: 20px; }\n" +
            "        .message { font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 30px; }\n" +
            "        .footer { padding: 20px 30px; border-top: 1px solid #e5e5e5; background: #fafafa; font-size: 12px; color: #777; }\n" +
            "        .contact-group { margin-bottom: 15px; }\n" +
            "        .contact-label { font-weight: 600; color: #333; display: block; margin-bottom: 3px; }\n" +
            "        .contact-value { color: #666; }\n" +
            "        .contact-value a { color: #0066cc; text-decoration: none; }\n" +
            "        .contact-value a:hover { text-decoration: underline; }\n" +
            "    </style>\n" +
            "</head>\n" +
            "<body>\n" +
            "    <div class=\"container\">\n" +
            "        <div class=\"header\">\n" +
            "            <div class=\"brand-heading\">SendFlow</div>\n" +
            "            <div class=\"title\">Email Provider Verification</div>\n" +
            "        </div>\n" +
            "        <div class=\"content\">\n" +
            "            <div class=\"tick-icon\">✓</div>\n" +
            "            <div class=\"message\">Your email provider has been successfully verified and is ready to use.</div>\n" +
            "        </div>\n" +
            "        <div class=\"footer\">\n" +
            "            <div class=\"contact-group\">\n" +
            "                <span class=\"contact-label\">Email:</span>\n" +
            "                <span class=\"contact-value\"><a href=\"mailto:tanishktewetia@gmail.com\">tanishktewetia@gmail.com</a></span>\n" +
            "            </div>\n" +
            "            <div class=\"contact-group\">\n" +
            "                <span class=\"contact-label\">Website:</span>\n" +
            "                <span class=\"contact-value\"><a href=\"https://tanishkchaudhary.me\" target=\"_blank\">tanishkchaudhary.me</a></span>\n" +
            "            </div>\n" +
            "        </div>\n" +
            "    </div>\n" +
            "</body>\n" +
            "</html>";
    }
    
    /**
     * Send test email via provider and return verification token
     * Token is generated only if email sends successfully
     */
    public String sendTestEmailAndVerify(String providerType, Map<String, Object> config, String toEmail, Long userId) {
        switch (providerType.toUpperCase()) {
            case "SMTP":
                return sendTestViaSMTP(config, toEmail, userId);
            case "GMAIL":
                return sendTestViaGmail(config, toEmail, userId);
            case "OUTLOOK":
                return sendTestViaOutlook(config, toEmail, userId);
            case "RESEND":
                return sendTestViaResend(config, toEmail, userId);
            default:
                throw new RuntimeException("Unsupported email provider type: " + providerType);
        }
    }
    
    /**
     * Send test email via SMTP
     * Actually connects to SMTP server and sends a test email
     * Supports both port 587 (STARTTLS) and 465 (SSL/TLS)
     */
    private String sendTestViaSMTP(Map<String, Object> config, String toEmail, Long userId) {
        try {
            // Validate SMTP config
            String host = (String) config.get("host");
            Integer port = getIntFromConfig(config, "port");
            String username = (String) config.get("username");
            String password = (String) config.get("password");
            
            if (isEmpty(host) || port == null || isEmpty(username) || isEmpty(password)) {
                throw new RuntimeException("Missing required SMTP configuration (host, port, username, password)");
            }
            
            if (isEmpty(toEmail)) {
                throw new RuntimeException("Test email address is required");
            }
            
            System.out.println("[DEBUG] Testing SMTP connection - Host: " + host + ":" + port + ", Username: " + username);
            
            // Create SMTP mail sender with provided credentials
            JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
            mailSender.setHost(host);
            mailSender.setPort(port);
            mailSender.setUsername(username);
            mailSender.setPassword(password);
            
            // Configure properties based on port
            Properties props = mailSender.getJavaMailProperties();
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.connectiontimeout", "10000");  // 10 second timeout
            props.put("mail.smtp.timeout", "10000");
            props.put("mail.smtp.writetimeout", "10000");
            
            // Configure encryption based on port
            if (port == 465) {
                // Port 465 uses SSL/TLS (implicit TLS)
                System.out.println("[DEBUG] Using SSL/TLS on port 465");
                props.put("mail.smtp.socketFactory.port", "465");
                props.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
                props.put("mail.smtp.socketFactory.fallback", "false");
                props.put("mail.smtp.ssl.protocols", "TLSv1.2 TLSv1.3");
            } else {
                // Port 587 (and others) use STARTTLS
                System.out.println("[DEBUG] Using STARTTLS on port " + port);
                props.put("mail.smtp.starttls.enable", "true");
                props.put("mail.smtp.starttls.required", "true");
                props.put("mail.smtp.starttls.protocols", "TLSv1.2 TLSv1.3");
                // Don't use SSL socket factory for STARTTLS
                props.remove("mail.smtp.socketFactory.port");
                props.remove("mail.smtp.socketFactory.class");
            }
            
            // Prepare test email with display name and HTML content
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom("Sendflow <" + username + ">");  // Display as "Sendflow" brand name
            helper.setTo(toEmail);
            helper.setSubject(VERIFICATION_SUBJECT);
            helper.setText(getVerificationHtmlTemplate(), true);  // true = HTML content
            
            // Send test email - this will throw exception if connection fails
            try {
                mailSender.send(message);
                System.out.println("[DEBUG] SMTP test email sent successfully to " + toEmail);
            } catch (Exception e) {
                System.err.println("[ERROR] SMTP test email failed: " + e.getMessage());
                e.printStackTrace();
                throw new RuntimeException("Failed to send test email via SMTP: " + e.getMessage(), e);
            }
            
            // Email sent successfully - generate verification token
            String token = generateVerificationToken(userId);
            System.out.println("[DEBUG] SMTP verification successful for user " + userId + " - Token: " + token);
            return token;
            
        } catch (Exception e) {
            System.err.println("[ERROR] SMTP verification failed: " + e.getMessage());
            throw new RuntimeException("SMTP verification failed: " + e.getMessage(), e);
        }
    }
    
    /**
     * Send test email via Gmail (OAuth flow)
     * Validates OAuth credentials and generates verification token
     */
    private String sendTestViaGmail(Map<String, Object> config, String toEmail, Long userId) {
        try {
            String refreshToken = (String) config.get("refreshToken");
            String clientId = (String) config.get("clientId");
            String clientSecret = (String) config.get("clientSecret");
            
            if (isEmpty(refreshToken) || isEmpty(clientId) || isEmpty(clientSecret)) {
                throw new RuntimeException("Missing required Gmail OAuth configuration (refreshToken, clientId, clientSecret)");
            }
            
            if (isEmpty(toEmail)) {
                throw new RuntimeException("Test email address is required");
            }
            
            System.out.println("[DEBUG] Validating Gmail OAuth configuration - ClientID: " + clientId);
            
            // TODO: Implement actual Gmail test email sending using OAuth tokens
            // This would:
            // 1. Exchange refresh token for access token
            // 2. Use access token to call Gmail API to send email
            // 3. Return verification token only if successful
            
            // For now: Validate token format
            if (refreshToken.length() < 10) {
                throw new RuntimeException("Invalid refresh token format");
            }
            
            System.out.println("[DEBUG] Gmail OAuth credentials validated for user " + userId);
            
            // Generate verification token
            String token = generateVerificationToken(userId);
            System.out.println("[DEBUG] Gmail verification setup complete - Token: " + token);
            return token;
            
        } catch (Exception e) {
            System.err.println("[ERROR] Gmail verification failed: " + e.getMessage());
            throw new RuntimeException("Gmail verification failed: " + e.getMessage(), e);
        }
    }
    
    /**
     * Send test email via Outlook/Hotmail
     * Outlook uses SMTP protocol (smtp-mail.outlook.com:587)
     * Supports both port 587 (STARTTLS) and 465 (SSL/TLS)
     */
    private String sendTestViaOutlook(Map<String, Object> config, String toEmail, Long userId) {
        try {
            // Extract Outlook SMTP credentials (prepared by controller)
            String host = (String) config.get("host");
            Integer port = getIntFromConfig(config, "port");
            String username = (String) config.get("username");  // Outlook email address
            String password = (String) config.get("password");   // App password
            
            if (isEmpty(host) || port == null || isEmpty(username) || isEmpty(password)) {
                throw new RuntimeException("Missing required Outlook SMTP configuration (host, port, username, password)");
            }
            
            if (isEmpty(toEmail)) {
                throw new RuntimeException("Test email address is required");
            }
            
            System.out.println("[DEBUG] Testing Outlook connection - Host: " + host + ":" + port + ", Email: " + username);
            
            // Create Outlook mail sender using SMTP
            JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
            mailSender.setHost(host);
            mailSender.setPort(port);
            mailSender.setUsername(username);
            mailSender.setPassword(password);
            
            // Configure Outlook-specific SMTP properties
            Properties props = mailSender.getJavaMailProperties();
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.connectiontimeout", "10000");  // 10 second timeout
            props.put("mail.smtp.timeout", "10000");
            props.put("mail.smtp.writetimeout", "10000");
            
            // Configure encryption based on port
            if (port == 465) {
                // Port 465 uses SSL/TLS (implicit TLS)
                System.out.println("[DEBUG] Using SSL/TLS on port 465 for Outlook");
                props.put("mail.smtp.socketFactory.port", "465");
                props.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
                props.put("mail.smtp.socketFactory.fallback", "false");
                props.put("mail.smtp.ssl.protocols", "TLSv1.2 TLSv1.3");
            } else {
                // Port 587 (and others) use STARTTLS
                System.out.println("[DEBUG] Using STARTTLS on port " + port + " for Outlook");
                props.put("mail.smtp.starttls.enable", "true");
                props.put("mail.smtp.starttls.required", "true");
                props.put("mail.smtp.starttls.protocols", "TLSv1.2 TLSv1.3");
                // Don't use SSL socket factory for STARTTLS
                props.remove("mail.smtp.socketFactory.port");
                props.remove("mail.smtp.socketFactory.class");
            }
            
            // Prepare test email with display name and HTML content
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom("Sendflow <" + username + ">");  // Display as "Sendflow" brand name
            helper.setTo(toEmail);
            helper.setSubject(VERIFICATION_SUBJECT);
            helper.setText(getVerificationHtmlTemplate(), true);  // true = HTML content
            
            // Send test email - this will throw exception if connection fails
            try {
                mailSender.send(message);
                System.out.println("[DEBUG] Outlook test email sent successfully to " + toEmail);
            } catch (Exception e) {
                System.err.println("[ERROR] Outlook test email failed: " + e.getMessage());
                e.printStackTrace();
                throw new RuntimeException("Failed to send test email via Outlook: " + e.getMessage(), e);
            }
            
            // Email sent successfully - generate verification token
            String token = generateVerificationToken(userId);
            System.out.println("[DEBUG] Outlook verification successful for user " + userId + " - Token: " + token);
            return token;
            
        } catch (Exception e) {
            System.err.println("[ERROR] Outlook verification failed: " + e.getMessage());
            throw new RuntimeException("Outlook verification failed: " + e.getMessage(), e);
        }
    }
    
    /**
     * Send test email via Resend API
     * This uses Resend's REST API to send a test email
     */
    private String sendTestViaResend(Map<String, Object> config, String toEmail, Long userId) {
        try {
            String apiKey = (String) config.get("apiKey");
            
            if (isEmpty(apiKey)) {
                throw new RuntimeException("Missing required Resend API key");
            }
            
            // For test email, always use verified Resend onboarding email
            // User's domain will be validated after confirmation
            
            // Prepare Resend API request with Sendflow brand name and HTML content
            Map<String, Object> emailData = new HashMap<>();
            emailData.put("from", "Sendflow <" + SENDFLOW_FROM_EMAIL + ">");  // Use verified onboarding email for test
            emailData.put("to", toEmail);
            emailData.put("subject", VERIFICATION_SUBJECT);
            emailData.put("html", getVerificationHtmlTemplate());  // Use full HTML template
            
            String requestBody = objectMapper.writeValueAsString(emailData);
            
            // Send to Resend API
            Request request = new Request.Builder()
                    .url("https://api.resend.com/emails")
                    .post(RequestBody.create(requestBody, JSON))
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .build();
            
            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    String errorBody = response.body() != null ? response.body().string() : "Unknown error";
                    throw new RuntimeException("Resend API error: " + response.code() + " " + errorBody);
                }
                
                // Email sent successfully - generate verification token
                return generateVerificationToken(userId);
            }
            
        } catch (IOException e) {
            throw new RuntimeException("Resend verification failed: " + e.getMessage(), e);
        }
    }
    
    /**
     * Generate unique verification token
     * Format: verify_{timestamp}_{userId}_{randomUUID}
     */
    private String generateVerificationToken(Long userId) {
        return String.format("verify_%d_%d_%s",
            System.currentTimeMillis(),
            userId,
            UUID.randomUUID().toString().substring(0, 16)
        );
    }
    
    /**
     * Check if string is empty or null
     */
    private boolean isEmpty(String str) {
        return str == null || str.trim().isEmpty();
    }
    
    /**
     * Extract integer value from config map
     */
    private Integer getIntFromConfig(Map<String, Object> config, String key) {
        Object value = config.get(key);
        if (value instanceof Integer) {
            return (Integer) value;
        } else if (value instanceof String) {
            try {
                return Integer.parseInt((String) value);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
