package com.javamailer.service;

import com.javamailer.entity.CampaignRecipient;
import com.javamailer.entity.CsvUpload;
import com.javamailer.repository.CampaignRecipientRepository;
import com.javamailer.repository.CsvUploadRepository;
import com.javamailer.util.EmailValidator;
import lombok.RequiredArgsConstructor;
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
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CsvService {
    
    private final CsvUploadRepository csvUploadRepository;
    private final CampaignRecipientRepository campaignRecipientRepository;
    
    private static final String[] CSV_HEADERS = {"name", "email", "company", "customField1", "customField2"};
    private static final int MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    
    /**
     * Upload and parse CSV file
     */
    public CsvUpload uploadCsvFile(Long userId, MultipartFile file) throws IOException {
        // Validate file
        if (file.isEmpty()) {
            throw new RuntimeException("CSV file is empty");
        }
        
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("File size exceeds 10MB limit");
        }
        
        // Store file metadata
        CsvUpload csvUpload = CsvUpload.builder()
                .userId(userId)
                .fileName(file.getOriginalFilename())
                .fileSizeBytes(file.getSize())
                .fileStoragePath("/uploads/csv/" + userId + "/" + System.currentTimeMillis() + "_" + file.getOriginalFilename())
                .totalRows(0)
                .validRows(0)
                .invalidRows(0)
                .duplicateRows(0)
                .status("UPLOADED")
                .uploadedAt(LocalDateTime.now())
                .build();
        
        return csvUploadRepository.save(csvUpload);
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
    public void deleteCsvUpload(Long csvUploadId, Long userId) {
        Optional<CsvUpload> csvUpload = csvUploadRepository.findByIdAndUserId(csvUploadId, userId);
        if (csvUpload.isPresent()) {
            CsvUpload csv = csvUpload.get();
            
            // Delete all campaign recipients that used this CSV
            // (This is application-level - database handles cascade)
            csvUploadRepository.delete(csv);
        } else {
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
