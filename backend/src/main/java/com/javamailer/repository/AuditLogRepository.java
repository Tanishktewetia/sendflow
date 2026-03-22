package com.javamailer.repository;

import com.javamailer.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Spring Data JPA repository for AuditLog entity
 * Provides CRUD operations and custom queries for audit trail and compliance tracking
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    
    /**
     * Find audit logs for a user (paginated)
     */
    Page<AuditLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    
    /**
     * Find audit logs by action type
     */
    List<AuditLog> findByActionOrderByCreatedAtDesc(String action);
    
    /**
     * Find audit logs by user and action
     */
    List<AuditLog> findByUserIdAndActionOrderByCreatedAtDesc(Long userId, String action);
    
    /**
     * Find logs for a specific resource
     */
    List<AuditLog> findByResourceTypeAndResourceIdOrderByCreatedAtDesc(String resourceType, Long resourceId);
    
    /**
     * Find logs in a date range (for compliance reports)
     */
    List<AuditLog> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime startDate, LocalDateTime endDate);
    
    /**
     * Find suspicious activity (multiple failed logins, etc.)
     */
    long countByUserIdAndActionAndCreatedAtAfter(Long userId, String action, LocalDateTime since);
}
