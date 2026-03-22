package com.javamailer.util;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import java.util.HashMap;
import java.util.Map;

/**
 * Resend Email Sender Implementation
 * Uses Resend API to send emails
 */
@Component
public class ResendEmailSender implements EmailSender {
    
    @Value("${resend.api-key}")
    private String resendApiKey;
    
    @Value("${resend.from-email}")
    private String fromEmail;
    
    private final RestTemplate restTemplate;
    private static final String RESEND_API_URL = "https://api.resend.com/emails";
    
    public ResendEmailSender(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }
    
    @Override
    public boolean sendEmail(String toEmail, String subject, String body) {
        try {
            // Prepare headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + resendApiKey);
            
            // Prepare request body
            Map<String, Object> emailRequest = new HashMap<>();
            emailRequest.put("from", fromEmail);
            emailRequest.put("to", toEmail);
            emailRequest.put("subject", subject);
            emailRequest.put("html", body);
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(emailRequest, headers);
            
            // Send email via Resend API
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    RESEND_API_URL,
                    entity,
                    Map.class
            );
            
            // Check response status
            return response.getStatusCode().is2xxSuccessful();
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to send email via Resend: " + e.getMessage(), e);
        }
    }
    
    @Override
    public String getProviderName() {
        return "Resend";
    }
    
    @Override
    public boolean verifyConnection() {
        try {
            // Test connection by trying to verify API key
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + resendApiKey);
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            // Simple verification - if API key works, we can send emails
            // Resend doesn't have a specific verification endpoint, so we just check if key is set
            return resendApiKey != null && !resendApiKey.isEmpty() && 
                   fromEmail != null && !fromEmail.isEmpty();
                   
        } catch (Exception e) {
            return false;
        }
    }
}
