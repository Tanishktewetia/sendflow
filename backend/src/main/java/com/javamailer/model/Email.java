package com.javamailer.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Email Model - Represents an email to be sent
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Email {
    private String to;
    private String subject;
    private String body;
    private String status; // PENDING, SENT, FAILED
    private String errorMessage;
    private Long createdAt;
    private Long sentAt;
}
