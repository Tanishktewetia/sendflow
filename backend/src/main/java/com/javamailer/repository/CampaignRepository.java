package com.javamailer.repository;

import com.javamailer.entity.Campaign;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for Campaign entity
 * Provides CRUD operations and custom queries for campaign data access
 */
@Repository
public interface CampaignRepository extends JpaRepository<Campaign, Long> {
    
    /**
     * Find all campaigns for a user (returns List)
     */
    List<Campaign> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    /**
     * Find campaign by ID and user ID (security: can't access other users' campaigns)
     */
    Optional<Campaign> findByIdAndUserId(Long id, Long userId);
    
    /**
     * Find running campaigns by user
     */
    List<Campaign> findByUserIdAndStatus(Long userId, String status);
    
    /**
     * Find scheduled campaigns that should start now
     */
    @Query("SELECT c FROM Campaign c WHERE c.status = 'SCHEDULED' AND c.scheduledAt <= :now")
    List<Campaign> findDueForExecution(@Param("now") LocalDateTime now);
    
    /**
     * Find running campaigns
     */
    List<Campaign> findByStatusAndUserId(String status, Long userId);
    
    /**
     * Find all campaigns for a user with pagination (PHASE 10)
     * Overloaded method that returns Page instead of List
     */
    Page<Campaign> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    
    /**
     * Count campaigns by status for a user
     */
    long countByUserIdAndStatus(Long userId, String status);
}
