package com.javamailer.repository;

import com.javamailer.entity.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for ActivityLog entity
 * Provides database access for activity tracking
 */
@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    
    /**
     * Find all activity logs for a specific user, paginated
     */
    Page<ActivityLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    
    /**
     * Find activity logs by user and action type
     */
    Page<ActivityLog> findByUserIdAndActionTypeOrderByCreatedAtDesc(Long userId, String actionType, Pageable pageable);
    
    /**
     * Find activity logs for a specific resource
     */
    Page<ActivityLog> findByResourceTypeAndResourceIdOrderByCreatedAtDesc(String resourceType, Long resourceId, Pageable pageable);
    
    /**
     * Find recent activity logs for user (non-paginated, limited)
     */
    @Query("SELECT a FROM ActivityLog a WHERE a.userId = :userId ORDER BY a.createdAt DESC LIMIT 50")
    List<ActivityLog> findRecentActivityByUserId(@Param("userId") Long userId);
    
    /**
     * Find activity logs within a date range
     */
    @Query("SELECT a FROM ActivityLog a WHERE a.userId = :userId AND a.createdAt BETWEEN :startDate AND :endDate ORDER BY a.createdAt DESC")
    List<ActivityLog> findActivityByUserIdAndDateRange(
        @Param("userId") Long userId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    /**
     * Find failed activities for error tracking
     */
    Page<ActivityLog> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, String status, Pageable pageable);
}
