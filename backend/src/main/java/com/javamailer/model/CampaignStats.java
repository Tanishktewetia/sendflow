package com.javamailer.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Campaign Statistics Model - Tracks email campaign metrics
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampaignStats {
    private Long totalEmails;
    private Long sentEmails;
    private Long failedEmails;
    private Long pendingEmails;
    private Double successRate;
    private Long createdAt;
    private Long lastUpdatedAt;
}
