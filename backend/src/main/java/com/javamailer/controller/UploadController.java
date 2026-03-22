package com.javamailer.controller;

import com.javamailer.security.JwtUserDetails;
import com.javamailer.entity.CsvUpload;
import com.javamailer.service.CsvService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * CSV Upload Controller
 * Handles CSV file uploads and validation for campaign recipients
 */
@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
public class UploadController {
    
    private final CsvService csvService;
    
    /**
     * Upload CSV file
     * POST /api/uploads/csv
     */
    @PostMapping("/csv")
    public ResponseEntity<?> uploadCsv(@RequestParam("file") MultipartFile file, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            // Upload file and get metadata
            CsvUpload csvUpload = csvService.uploadCsvFile(userId, file);
            
            // Parse and validate CSV
            Map<String, Object> validationResult = csvService.parseAndValidateCsv(file);
            
            // Update CSV upload with validation results
            csvUpload = csvService.updateCsvStatus(
                    csvUpload.getId(),
                    userId,
                    "SUCCESS",
                    (int) validationResult.get("totalRows"),
                    (int) validationResult.get("validRows"),
                    (int) validationResult.get("invalidRows"),
                    (int) validationResult.get("duplicateRows")
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "CSV uploaded and validated");
            response.put("uploadId", csvUpload.getId());
            response.put("fileName", csvUpload.getFileName());
            response.put("totalRows", validationResult.get("totalRows"));
            response.put("validRows", validationResult.get("validRows"));
            response.put("invalidRows", validationResult.get("invalidRows"));
            response.put("duplicateRows", validationResult.get("duplicateRows"));
            response.put("successRate", csvUpload.getTotalRows() > 0 ? 
                    (100.0 * csvUpload.getValidRows() / csvUpload.getTotalRows()) : 0);
            
            // Include invalid records for user feedback
            if (validationResult.containsKey("invalidRecords")) {
                response.put("invalidRecords", validationResult.get("invalidRecords"));
            }
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (IOException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "File upload error: " + e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Get all CSV uploads for user
     * GET /api/uploads
     */
    @GetMapping
    public ResponseEntity<?> getCsvUploads(Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            List<CsvUpload> uploads = csvService.getUserCsvUploads(userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("uploads", uploads);
            response.put("total", uploads.size());
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Get recent CSV uploads (last 10)
     * GET /api/uploads/recent
     */
    @GetMapping("/recent")
    public ResponseEntity<?> getRecentUploads(Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            List<CsvUpload> uploads = csvService.getRecentCsvUploads(userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("uploads", uploads);
            response.put("total", uploads.size());
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Get CSV upload by ID
     * GET /api/uploads/{uploadId}
     */
    @GetMapping("/{uploadId}")
    public ResponseEntity<?> getCsvUpload(@PathVariable Long uploadId, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            CsvUpload upload = csvService.getCsvUploadByIdAndUserId(uploadId, userId)
                    .orElseThrow(() -> new RuntimeException("Upload not found"));
            
            return ResponseEntity.ok(upload);
            
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Get validation summary for upload
     * GET /api/uploads/{uploadId}/summary
     */
    @GetMapping("/{uploadId}/summary")
    public ResponseEntity<?> getValidationSummary(@PathVariable Long uploadId, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            Map<String, Object> summary = csvService.getValidationSummary(uploadId, userId);
            
            return ResponseEntity.ok(summary);
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Delete CSV upload
     * DELETE /api/uploads/{uploadId}
     */
    @DeleteMapping("/{uploadId}")
    public ResponseEntity<?> deleteCsvUpload(@PathVariable Long uploadId, Authentication authentication) {
        try {
            JwtUserDetails userDetails = (JwtUserDetails) authentication.getDetails();
            Long userId = userDetails.getUserId();
            
            csvService.deleteCsvUpload(uploadId, userId);
            
            return ResponseEntity.ok(Map.of("message", "Upload deleted successfully"));
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
