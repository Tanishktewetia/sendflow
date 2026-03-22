package com.javamailer.repository;

import com.javamailer.entity.CsvUpload;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for CsvUpload entity
 * Provides CRUD operations and custom queries for CSV upload tracking
 */
@Repository
public interface CsvUploadRepository extends JpaRepository<CsvUpload, Long> {
    
    /**
     * Find all uploads for a user
     */
    List<CsvUpload> findByUserIdOrderByUploadedAtDesc(Long userId);
    
    /**
     * Find uploads by user and status
     */
    List<CsvUpload> findByUserIdAndStatus(Long userId, String status);
    
    /**
     * Find uploads in processing state
     */
    List<CsvUpload> findByStatus(String status);
    
    /**
     * Find uploads by user and ID (security: can't access other users' uploads)
     */
    Optional<CsvUpload> findByIdAndUserId(Long id, Long userId);
    
    /**
     * Find failed uploads needing attention
     */
    List<CsvUpload> findByUserIdAndStatusIn(Long userId, List<String> statuses);
    
    /**
     * Find recent uploads for a user (last 10)
     */
    List<CsvUpload> findTop10ByUserIdOrderByUploadedAtDesc(Long userId);
    
    /**
     * Count uploads by user and status
     */
    long countByUserIdAndStatus(Long userId, String status);
}
