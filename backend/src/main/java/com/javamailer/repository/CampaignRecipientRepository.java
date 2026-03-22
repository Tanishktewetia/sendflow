package com.javamailer.repository;

import com.javamailer.entity.CampaignRecipient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for CampaignRecipient entity
 * Provides CRUD operations and custom queries for recipient data access
 */
@Repository
public interface CampaignRecipientRepository extends JpaRepository<CampaignRecipient, Long> {
    
    /**
     * Find all recipients for a campaign
     */
    List<CampaignRecipient> findByCampaignIdOrderByCreatedAtAsc(Long campaignId);
    
    /**
     * Find pending recipients for a campaign (to send emails)
     */
    List<CampaignRecipient> findByCampaignIdAndStatusOrderByCreatedAtAsc(Long campaignId, String status);
    
    /**
     * Find recipients by status
     */
    List<CampaignRecipient> findByCampaignIdAndStatus(Long campaignId, String status);
    
    /**
     * Find a recipient by campaign and email (check for duplicates)
     */
    Optional<CampaignRecipient> findByCampaignIdAndEmail(Long campaignId, String email);
    
    /**
     * Count recipients by status for statistics
     */
    long countByCampaignIdAndStatus(Long campaignId, String status);
    
    /**
     * Get status distribution for a campaign
     */
    @Query("SELECT cr.status, COUNT(cr) FROM CampaignRecipient cr WHERE cr.campaignId = :campaignId GROUP BY cr.status")
    List<Object[]> getStatusDistribution(@Param("campaignId") Long campaignId);
    
    /**
     * Delete all recipients for a campaign
     */
    void deleteByCampaignId(Long campaignId);
}
