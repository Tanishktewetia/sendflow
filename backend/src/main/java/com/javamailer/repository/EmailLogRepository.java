package com.javamailer.repository;

import com.javamailer.entity.EmailLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * Spring Data JPA repository for EmailLog entity
 * Provides CRUD operations and custom queries for email audit trail
 */
@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {
    
    /**
     * Find all logs for a campaign
     */
    List<EmailLog> findByCampaignId(Long campaignId);
    
    /**
     * Find all logs for a campaign (paginated)
     */
    Page<EmailLog> findByCampaignIdOrderBySentAtDesc(Long campaignId, Pageable pageable);
    
    /**
     * Find logs by status for a campaign
     */
    List<EmailLog> findByCampaignIdAndStatus(Long campaignId, String status);
    
    /**
     * Find logs by recipient (for tracking individual email history)
     */
    List<EmailLog> findByRecipientIdOrderBySentAtDesc(Long recipientId);
    
    /**
     * Get status distribution for campaign statistics
     */
    @Query("SELECT el.status, COUNT(el) FROM EmailLog el WHERE el.campaignId = :campaignId GROUP BY el.status")
    List<Object[]> getStatusDistribution(@Param("campaignId") Long campaignId);
    
    /**
     * Count sent emails for a campaign
     */
    long countByCampaignIdAndStatus(Long campaignId, String status);
    
    /**
     * Find failed emails for retry
     */
    List<EmailLog> findByCampaignIdAndStatusOrderBySentAtAsc(Long campaignId, String status);
    
    /**
     * Delete logs for a campaign
     */
    void deleteByCampaignId(Long campaignId);
}
