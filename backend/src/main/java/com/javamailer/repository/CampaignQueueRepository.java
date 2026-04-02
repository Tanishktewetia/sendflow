package com.javamailer.repository;

import com.javamailer.entity.CampaignQueue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

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
    @Query("SELECT COUNT(cq) FROM CampaignQueue cq WHERE cq.status IN ('PROCESSING', 'PAUSED', 'RUNNING', 'IN_PROGRESS', 'REPROCESSING')")
    long countConcurrentCampaigns();
    
    /**
     * Count concurrent campaigns for a specific user
     */
    @Query("SELECT COUNT(cq) FROM CampaignQueue cq WHERE cq.userId = :userId AND cq.status IN ('PROCESSING', 'RUNNING', 'IN_PROGRESS', 'REPROCESSING')")
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

    long deleteByCsvUploadId(Long csvUploadId);

    long deleteByUserId(Long userId);

    long deleteByCampaignId(Long campaignId);
    
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

    Optional<CampaignQueue> findFirstByUserIdAndStatusInOrderByStartedAtDesc(Long userId, List<String> statuses);

    List<CampaignQueue> findByUserIdAndStatusInAndCompletedAtIsNotNull(Long userId, List<String> statuses);

        @Query("SELECT COALESCE(SUM(cq.sentRecipients), 0), COALESCE(SUM(cq.failedRecipients), 0), COALESCE(SUM(cq.processedRecipients), 0) " +
            "FROM CampaignQueue cq WHERE cq.userId = :userId AND cq.status IN ('COMPLETED', 'FAILED') AND cq.completedAt >= :fromTime")
        Object[] sumCompletedOutcomesSince(@Param("userId") Long userId, @Param("fromTime") LocalDateTime fromTime);

        @Query("SELECT COALESCE(SUM(cq.sentRecipients), 0), COALESCE(SUM(cq.failedRecipients), 0), COALESCE(SUM(cq.processedRecipients), 0) " +
            "FROM CampaignQueue cq WHERE cq.userId = :userId AND cq.status IN ('COMPLETED', 'FAILED') AND cq.completedAt >= :fromTime AND cq.id <> :excludeQueueId")
        Object[] sumCompletedOutcomesSinceExcludingQueue(@Param("userId") Long userId,
                                                         @Param("fromTime") LocalDateTime fromTime,
                                                         @Param("excludeQueueId") Long excludeQueueId);

        @Query("SELECT COALESCE(SUM(cq.sentRecipients), 0), COALESCE(SUM(cq.failedRecipients), 0), COALESCE(SUM(cq.processedRecipients), 0) " +
            "FROM CampaignQueue cq WHERE cq.userId = :userId AND cq.status IN ('COMPLETED', 'FAILED')")
        Object[] sumAllCompletedOutcomes(@Param("userId") Long userId);

            @Query("SELECT COALESCE(SUM(cq.sentRecipients), 0), COALESCE(SUM(cq.failedRecipients), 0), COALESCE(SUM(cq.processedRecipients), 0) " +
                "FROM CampaignQueue cq WHERE cq.userId = :userId AND cq.completedAt IS NOT NULL")
            Object[] sumAllCompletedOutcomesAnyStatus(@Param("userId") Long userId);

            @Query("SELECT COALESCE(SUM(cq.sentRecipients), 0), COALESCE(SUM(cq.failedRecipients), 0), COALESCE(SUM(cq.processedRecipients), 0) " +
                "FROM CampaignQueue cq WHERE cq.userId = :userId AND cq.completedAt IS NOT NULL AND cq.completedAt >= :fromTime")
            Object[] sumAllCompletedOutcomesAnyStatusSince(@Param("userId") Long userId,
                                                           @Param("fromTime") LocalDateTime fromTime);

            @Query("SELECT COALESCE(SUM(cq.sentRecipients), 0), COALESCE(SUM(cq.failedRecipients), 0), COALESCE(SUM(cq.processedRecipients), 0) " +
                "FROM CampaignQueue cq WHERE cq.userId = :userId AND cq.completedAt IS NOT NULL AND cq.id <> :excludeQueueId")
            Object[] sumAllCompletedOutcomesAnyStatusExcludingQueue(@Param("userId") Long userId,
                                                                    @Param("excludeQueueId") Long excludeQueueId);
}
