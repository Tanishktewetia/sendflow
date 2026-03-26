package com.javamailer.service;

import com.javamailer.entity.CampaignRecipient;
import com.javamailer.entity.CsvUpload;
import com.javamailer.repository.CampaignRecipientRepository;
import com.javamailer.repository.CsvUploadRepository;
import com.javamailer.util.EmailValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * Service class for CSV upload and recipient management
 * Handles CSV parsing, validation, and recipient creation
 * 
 * CSV UPLOAD REQUIREMENTS:
 * - Max file size: 10MB
 * - Max files per user: 5
 * - Files stored in Supabase bucket: csv_uploads
 * - Metadata stored in database table: csv_uploads
 * - Deletion only happens when user explicitly clicks delete button (not automatic)
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CsvService {
    
    private final CsvUploadRepository csvUploadRepository;
    private final CampaignRecipientRepository campaignRecipientRepository;
    private final SupabaseStorageService supabaseStorageService;
    
    private static final String[] CSV_HEADERS = {"name", "email", "company", "customField1", "customField2"};
    private static final int MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    
    /**
     * Upload and parse CSV file
     * Uploads file to Supabase Storage and stores path in database
     * 
     * Requirements:
     * - Max 10MB file size
     * - Max 5 files per user (validated in controller)
     * - File stored with fixed naming to allow overwrites
     */
    public CsvUpload uploadCsvFile(Long userId, MultipartFile file) throws IOException {
        // Validate file
        if (file.isEmpty()) {
            log.warn("CSV upload attempt with empty file by user {}", userId);
            throw new RuntimeException("CSV file is empty");
        }
        
        if (file.getSize() > MAX_FILE_SIZE) {
            log.warn("CSV upload attempt exceeds 10MB limit by user {}: {} bytes", userId, file.getSize());
            throw new RuntimeException("File size exceeds 10MB limit");
        }
        
        // Upload file to Supabase Storage (returns file path)
        String storagePath = supabaseStorageService.uploadCsvFile(userId, file);
        log.info("CSV file uploaded to Supabase by user {}: {} -> {}", userId, file.getOriginalFilename(), storagePath);
        
        // Store file metadata with Supabase path
        CsvUpload csvUpload = CsvUpload.builder()
                .userId(userId)
                .fileName(file.getOriginalFilename())
                .fileSizeBytes(file.getSize())
                .fileStoragePath(storagePath)  // ✅ Store Supabase path
                .totalRows(0)
                .validRows(0)
                .invalidRows(0)
                .duplicateRows(0)
                .status("UPLOADED")
                .uploadedAt(LocalDateTime.now())
                .build();
        
        CsvUpload saved = csvUploadRepository.save(csvUpload);
        log.info("CSV metadata saved to database - Upload ID: {}, User: {}, File: {}", saved.getId(), userId, file.getOriginalFilename());
        return saved;
    }
    
    /**
     * Parse CSV and validate recipients
     */
    public Map<String, Object> parseAndValidateCsv(MultipartFile file) throws IOException {
        CSVFormat csvFormat = CSVFormat.DEFAULT
                .withFirstRecordAsHeader()
                .withIgnoreHeaderCase()
                .withTrim();
        
        Set<String> seenEmails = new HashSet<>();
        List<Map<String, String>> validRecords = new ArrayList<>();
        List<String> invalidRecords = new ArrayList<>();
        int totalRows = 0;
        
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()));
             CSVParser csvParser = new CSVParser(reader, csvFormat)) {
            
            for (CSVRecord record : csvParser) {
                totalRows++;
                
                try {
                    // Extract required fields
                    String name = record.get("name").trim();
                    String email = record.get("email").trim();
                    String company = record.isMapped("company") ? record.get("company").trim() : "";
                    String customField1 = record.isMapped("customField1") ? record.get("customField1").trim() : "";
                    String customField2 = record.isMapped("customField2") ? record.get("customField2").trim() : "";
                    
                    // Validate
                    if (name.isEmpty() || email.isEmpty()) {
                        invalidRecords.add("Row " + record.getRecordNumber() + ": Missing required fields (name, email)");
                        continue;
                    }
                    
                    if (!EmailValidator.isValidEmail(email)) {
                        invalidRecords.add("Row " + record.getRecordNumber() + ": Invalid email format (" + email + ")");
                        continue;
                    }
                    
                    if (seenEmails.contains(email.toLowerCase())) {
                        invalidRecords.add("Row " + record.getRecordNumber() + ": Duplicate email (" + email + ")");
                        continue;
                    }
                    
                    seenEmails.add(email.toLowerCase());
                    
                    // Store valid record
                    Map<String, String> recordData = new HashMap<>();
                    recordData.put("name", name);
                    recordData.put("email", email);
                    recordData.put("company", company);
                    recordData.put("customField1", customField1);
                    recordData.put("customField2", customField2);
                    validRecords.add(recordData);
                    
                } catch (Exception e) {
                    invalidRecords.add("Row " + record.getRecordNumber() + ": " + e.getMessage());
                }
            }
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("totalRows", totalRows);
        result.put("validRows", validRecords.size());
        result.put("invalidRows", invalidRecords.size());
        result.put("duplicateRows", seenEmails.size() - validRecords.size());
        result.put("validRecords", validRecords);
        result.put("invalidRecords", invalidRecords);
        
        return result;
    }
    
    /**
     * Create campaign recipients from CSV records
     */
    public long createCampaignRecipients(Long campaignId, List<Map<String, String>> records) {
        List<CampaignRecipient> recipients = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        
        for (Map<String, String> record : records) {
            CampaignRecipient recipient = CampaignRecipient.builder()
                    .campaignId(campaignId)
                    .name(record.get("name"))
                    .email(record.get("email"))
                    .company(record.getOrDefault("company", ""))
                    .customField1(record.getOrDefault("customField1", ""))
                    .customField2(record.getOrDefault("customField2", ""))
                    .status("PENDING")
                    .build();
            recipients.add(recipient);
        }
        
        List<CampaignRecipient> savedRecipients = campaignRecipientRepository.saveAll(recipients);
        return savedRecipients.size();
    }
    
    /**
     * Update CSV upload status
     */
    public CsvUpload updateCsvStatus(Long csvUploadId, Long userId, String status, 
                                     int totalRows, int validRows, int invalidRows, int duplicateRows) {
        Optional<CsvUpload> csvUpload = csvUploadRepository.findByIdAndUserId(csvUploadId, userId);
        if (csvUpload.isPresent()) {
            CsvUpload csv = csvUpload.get();
            csv.setStatus(status);
            csv.setTotalRows(totalRows);
            csv.setValidRows(validRows);
            csv.setInvalidRows(invalidRows);
            csv.setDuplicateRows(duplicateRows);
            csv.setProcessedAt(LocalDateTime.now());
            return csvUploadRepository.save(csv);
        }
        throw new RuntimeException("CSV upload not found: " + csvUploadId);
    }
    
    /**
     * Get CSV upload by ID
     */
    public Optional<CsvUpload> getCsvUploadByIdAndUserId(Long csvUploadId, Long userId) {
        return csvUploadRepository.findByIdAndUserId(csvUploadId, userId);
    }
    
    /**
     * Get all CSV uploads for user
     */
    public List<CsvUpload> getUserCsvUploads(Long userId) {
        return csvUploadRepository.findByUserIdOrderByUploadedAtDesc(userId);
    }
    
    /**
     * Get recent CSV uploads (limit 10)
     */
    public List<CsvUpload> getRecentCsvUploads(Long userId) {
        return csvUploadRepository.findTop10ByUserIdOrderByUploadedAtDesc(userId);
    }
    
    /**
     * Delete CSV upload and associated recipients
     */
    /**
     * Delete CSV upload - removes from both database and Supabase storage
     * 
     * ⚠️ CRITICAL: Only call this when user explicitly clicks delete button
     * This ensures CSV files persist in storage until user action
     */
    public void deleteCsvUpload(Long csvUploadId, Long userId) {
        Optional<CsvUpload> csvUpload = csvUploadRepository.findByIdAndUserId(csvUploadId, userId);
        if (csvUpload.isPresent()) {
            CsvUpload csv = csvUpload.get();
            String storagePath = csv.getFileStoragePath();
            
            // Delete from database first
            csvUploadRepository.delete(csv);
            log.info("CSV record deleted from database - Upload ID: {}, User: {}, File: {}", csvUploadId, userId, csv.getFileName());
            
            // Delete from Supabase Storage if path exists
            if (storagePath != null && !storagePath.isEmpty()) {
                try {
                    supabaseStorageService.deleteCsvFile(storagePath);
                    log.info("CSV file deleted from Supabase - User: {}, File: {}, Path: {}", userId, csv.getFileName(), storagePath);
                } catch (IOException e) {
                    log.error("Failed to delete CSV from Supabase - User: {}, Path: {}, Error: {}", userId, storagePath, e.getMessage(), e);
                    // Continue - database record is already deleted, just log the storage error
                }
            }
        } else {
            log.warn("CSV upload not found for deletion - Upload ID: {}, User: {}", csvUploadId, userId);
            throw new RuntimeException("CSV upload not found: " + csvUploadId);
        }
    }
    
    /**
     * Get validation summary
     */
    public Map<String, Object> getValidationSummary(Long csvUploadId, Long userId) {
        Optional<CsvUpload> csvUpload = csvUploadRepository.findByIdAndUserId(csvUploadId, userId);
        if (csvUpload.isPresent()) {
            CsvUpload csv = csvUpload.get();
            Map<String, Object> summary = new HashMap<>();
            summary.put("fileName", csv.getFileName());
            summary.put("fileSizeBytes", csv.getFileSizeBytes());
            summary.put("totalRows", csv.getTotalRows());
            summary.put("validRows", csv.getValidRows());
            summary.put("invalidRows", csv.getInvalidRows());
            summary.put("duplicateRows", csv.getDuplicateRows());
            summary.put("status", csv.getStatus());
            summary.put("successRate", csv.getTotalRows() > 0 ? 
                    (100.0 * csv.getValidRows() / csv.getTotalRows()) : 0);
            return summary;
        }
        throw new RuntimeException("CSV upload not found: " + csvUploadId);
    }
}
