package com.javamailer.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * CsvUpload entity for tracking user CSV file uploads
 * Maps to 'csv_uploads' table in PostgreSQL
 * Tracks processing status and validation results
 */
@Entity
@Table(name = "csv_uploads")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class CsvUpload {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;
    
    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;
    
    @Column(name = "file_storage_path", length = 500)
    private String fileStoragePath;
    
    @Column(name = "total_rows")
    @Builder.Default
    private Integer totalRows = 0;
    
    @Column(name = "valid_rows")
    @Builder.Default
    private Integer validRows = 0;
    
    @Column(name = "invalid_rows")
    @Builder.Default
    private Integer invalidRows = 0;
    
    @Column(name = "duplicate_rows")
    @Builder.Default
    private Integer duplicateRows = 0;
    
    @Column(length = 50)
    @Builder.Default
    private String status = "UPLOADED"; // UPLOADED, PROCESSING, SUCCESS, FAILED, PARTIALLY_FAILED
    
    @Column(name = "error_details", columnDefinition = "TEXT")
    private String errorDetails;
    
    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private LocalDateTime uploadedAt;
    
    @Column(name = "processed_at")
    private LocalDateTime processedAt;
    
    @Column(name = "queue_position")
    private Integer queuePosition; // Position in queue (0-based, for ordering)
    
    @Column(name = "is_queued")
    @Builder.Default
    private Boolean isQueued = false; // Whether this CSV is in the queue
    
    @Column(name = "queued_at")
    private LocalDateTime queuedAt; // When added to queue
    
    @PrePersist
    protected void onCreate() {
        uploadedAt = LocalDateTime.now();
        if (status == null) status = "UPLOADED";
    }
}
