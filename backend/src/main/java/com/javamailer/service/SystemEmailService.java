package com.javamailer.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.javamailer.util.EmailProviderFactory;

/**
 * System Email Service
 * Handles sending system emails (OTP, verification, notifications)
 * Always uses Resend provider for SendFlow system emails
 */
@Service
@RequiredArgsConstructor
@Transactional
public class SystemEmailService {
    
    private final EmailProviderFactory emailProviderFactory;
    
    /**
     * Send OTP email to user
     * @param userEmail recipient email address
     * @param otp one-time password
     * @return true if send successful
     */
    public boolean sendOtpEmail(String userEmail, String otp) {
        try {
            String subject = "SendFlow - Password Reset OTP";
            String body = buildOtpEmailBody(otp);
            
            return emailProviderFactory.sendEmailVia("RESEND", userEmail, subject, body);
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to send OTP email: " + e.getMessage(), e);
        }
    }
    
    /**
     * Send verification email to new user
     * @param userEmail recipient email address
     * @param verificationToken email verification token
     * @return true if send successful
     */
    public boolean sendVerificationEmail(String userEmail, String verificationToken) {
        try {
            String subject = "SendFlow - Verify Your Email";
            String body = buildVerificationEmailBody(verificationToken);
            
            return emailProviderFactory.sendEmailVia("RESEND", userEmail, subject, body);
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to send verification email: " + e.getMessage(), e);
        }
    }
    
    /**
     * Send welcome email to new user
     * @param userEmail recipient email address
     * @param userName user's full name
     * @return true if send successful
     */
    public boolean sendWelcomeEmail(String userEmail, String userName) {
        try {
            String subject = "Welcome to SendFlow!";
            String body = buildWelcomeEmailBody(userName);
            
            return emailProviderFactory.sendEmailVia("RESEND", userEmail, subject, body);
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to send welcome email: " + e.getMessage(), e);
        }
    }
    
    /**
     * Build OTP email HTML body
     */
    private String buildOtpEmailBody(String otp) {
        return "<!DOCTYPE html><html><head><style>" +
            "body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }" +
            ".container { max-width: 600px; margin: 0 auto; padding: 20px; }" +
            ".header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px; }" +
            ".content { padding: 20px; background-color: #f9f9f9; border-radius: 5px; margin-top: 20px; }" +
            ".otp-box { background-color: #fff; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; border: 2px solid #007bff; }" +
            ".otp-code { font-size: 36px; font-weight: bold; color: #007bff; letter-spacing: 5px; }" +
            ".footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }" +
            ".warning { color: #dc3545; font-size: 14px; margin-top: 20px; }" +
            "</style></head><body>" +
            "<div class='container'>" +
            "<div class='header'><h2>SendFlow - Password Reset</h2></div>" +
            "<div class='content'><p>Hello,</p>" +
            "<p>You requested to reset your SendFlow password. Use the OTP below to complete the process:</p>" +
            "<div class='otp-box'><div class='otp-code'>" + otp + "</div></div>" +
            "<p><strong>OTP Valid For:</strong> 15 minutes</p>" +
            "<p class='warning'>⚠️ If you didn't request this, please ignore this email. Your account is safe.</p>" +
            "<p>Best regards,<br><strong>SendFlow Team</strong></p></div>" +
            "<div class='footer'><p>&copy; 2026 SendFlow. All rights reserved.</p>" +
            "<p><a href='https://sendflow.com'>SendFlow.com</a></p></div></div>" +
            "</body></html>";
    }
    
    /**
     * Build email verification HTML body
     */
    private String buildVerificationEmailBody(String verificationToken) {
        return "<!DOCTYPE html><html><head><style>" +
            "body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }" +
            ".container { max-width: 600px; margin: 0 auto; padding: 20px; }" +
            ".header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px; }" +
            ".content { padding: 20px; background-color: #f9f9f9; border-radius: 5px; margin-top: 20px; }" +
            ".button { display: inline-block; background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }" +
            ".footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }" +
            "</style></head><body>" +
            "<div class='container'>" +
            "<div class='header'><h2>Verify Your Email - SendFlow</h2></div>" +
            "<div class='content'><p>Hello,</p>" +
            "<p>Thank you for signing up for SendFlow! Please verify your email address to activate your account:</p>" +
            "<a href='https://sendflow.com/verify?token=" + verificationToken + "' class='button'>Verify Email</a>" +
            "<p>Or copy this link in your browser:</p>" +
            "<p><small>https://sendflow.com/verify?token=" + verificationToken + "</small></p>" +
            "<p>Link expires in 24 hours.</p>" +
            "<p>Best regards,<br><strong>SendFlow Team</strong></p></div>" +
            "<div class='footer'><p>&copy; 2026 SendFlow. All rights reserved.</p>" +
            "<p><a href='https://sendflow.com'>SendFlow.com</a></p></div></div>" +
            "</body></html>";
    }
    
    /**
     * Build welcome email HTML body
     */
    private String buildWelcomeEmailBody(String userName) {
        return "<!DOCTYPE html><html><head><style>" +
            "body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }" +
            ".container { max-width: 600px; margin: 0 auto; padding: 20px; }" +
            ".header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px; }" +
            ".content { padding: 20px; background-color: #f9f9f9; border-radius: 5px; margin-top: 20px; }" +
            ".features { list-style: none; padding: 20px; }" +
            ".features li { padding: 10px 0; }" +
            ".features li:before { content: '✓ '; color: #28a745; font-weight: bold; margin-right: 10px; }" +
            ".button { display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }" +
            ".footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }" +
            "</style></head><body>" +
            "<div class='container'>" +
            "<div class='header'><h2>Welcome to SendFlow, " + userName + "!</h2></div>" +
            "<div class='content'><p>We're thrilled to have you on board! Get ready to send professional bulk emails effortlessly.</p>" +
            "<h3>Quick Start:</h3>" +
            "<ul class='features'>" +
            "<li>Configure your email provider (Resend, Gmail, Outlook, or SMTP)</li>" +
            "<li>Upload your recipient list as CSV</li>" +
            "<li>Compose personalized email campaigns</li>" +
            "<li>Track delivery in real-time</li>" +
            "</ul>" +
            "<a href='https://sendflow.com/app' class='button'>Get Started Now</a>" +
            "<p>Need help? Check our <a href='https://sendflow.com/how-it-works'>How It Works</a> guide.</p>" +
            "<p>Happy sending!<br><strong>SendFlow Team</strong></p></div>" +
            "<div class='footer'><p>&copy; 2026 SendFlow. All rights reserved.</p>" +
            "<p><a href='https://sendflow.com'>SendFlow.com</a></p></div></div>" +
            "</body></html>";
    }
}
