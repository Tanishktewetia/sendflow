package com.javamailer.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Email Controller - REST API endpoints for email operations
 * Handles HTTP requests for email sending, status checks, and statistics
 */
@RestController
@RequestMapping("/emails")
@CrossOrigin(origins = "*")
public class EmailController {

    /**
     * Health check endpoint
     * @return status message
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Java Mailer Backend is running!");
    }

    /**
     * Send email endpoint
     * @return response status
     */
    @PostMapping("/send")
    public ResponseEntity<?> sendEmail() {
        // Implementation will be added in next phase
        return ResponseEntity.ok().build();
    }

    /**
     * Get campaign statistics endpoint
     * @return campaign stats
     */
    @GetMapping("/stats")
    public ResponseEntity<?> getStatistics() {
        // Implementation will be added in next phase
        return ResponseEntity.ok().build();
    }

    /**
     * Upload CSV file endpoint
     * @return upload status
     */
    @PostMapping("/upload-csv")
    public ResponseEntity<?> uploadCsv() {
        // Implementation will be added in next phase
        return ResponseEntity.ok().build();
    }
}
