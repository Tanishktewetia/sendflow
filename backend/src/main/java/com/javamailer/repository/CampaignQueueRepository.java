package com.javamailer.repository;

import com.javamailer.entity.CampaignQueue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for CampaignQueue entity
 * Provides database access for queue management
 */
@Repository
public interface CampaignQueueRepository extends JpaRepository<CampaignQueue, Long> {
    
    /**
     * Find the next campaign to process (QUEUED, ordered by queue position)
     */
    @Query("SELECT cq FROM CampaignQueue cq WHERE cq.status = 'QUEUED' ORDER BY cq.queuePosition ASC LIMIT 1")
    Optional<CampaignQueue> findNextQueuedCampaign();
    
    /**
     * Find all campaigns for a user by status
     */
    List<CampaignQueue> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, String status);
    
    /**
     * Find all campaigns for a user, ordered by creation date
     */
    List<CampaignQueue> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    /**
     * Count concurrent processing campaigns (non-paused)
     */
    @Query("SELECT COUNT(cq) FROM CampaignQueue cq WHERE cq.status IN ('PROCESSING', 'PAUSED')")
    long countConcurrentCampaigns();
    
    /**
     * Count concurrent campaigns for a specific user
     */
    @Query("SELECT COUNT(cq) FROM CampaignQueue cq WHERE cq.userId = :userId AND cq.status = 'PROCESSING'")
    long countUserProcessingCampaigns(@Param("userId") Long userId);
    
    /**
     * Check if a CSV is already queued
     */
    @Query("SELECT COUNT(cq) > 0 FROM CampaignQueue cq WHERE cq.csvUploadId = :csvUploadId AND cq.status != 'COMPLETED'")
    boolean isCsvQueued(@Param("csvUploadId") Long csvUploadId);
    
    /**
     * Find campaign queue by CSV upload ID
     */
    Optional<CampaignQueue> findByCsvUploadId(Long csvUploadId);
    
    /**
     * Find campaign queue by campaign ID
     */
    Optional<CampaignQueue> findByCampaignId(Long campaignId);
    
    /**
     * Get all processing campaigns (should be max 5)
     */
    @Query("SELECT cq FROM CampaignQueue cq WHERE cq.status = 'PROCESSING' ORDER BY cq.startedAt ASC")
    List<CampaignQueue> findAllProcessingCampaigns();
    
    /**
     * Get maximum queue position for new queue entry
     */
    @Query("SELECT MAX(cq.queuePosition) FROM CampaignQueue cq WHERE cq.status = 'QUEUED'")
    Integer findMaxQueuePosition();
}
