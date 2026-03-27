package com.javamailer.service;

import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.validator.routines.EmailValidator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.util.*;
import java.util.regex.Pattern;

/**
 * CSVParserService - Parse and validate CSV files for email campaigns
 * Detects columns, validates data, handles duplicates
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CSVParserService {
    
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
    );
    
    public static class CSVParseResult {
        public String nameColumn;
        public String emailColumn;
        public List<Map<String, String>> records; // List of data records
        public Set<String> duplicateEmails;
        public List<String> invalidEmails;
        public Integer totalRows;
        public Integer validRows;
        
        public CSVParseResult() {
            this.records = new ArrayList<>();
            this.duplicateEmails = new HashSet<>();
            this.invalidEmails = new ArrayList<>();
            this.totalRows = 0;
            this.validRows = 0;
        }
    }
    
    /**
     * Parse and validate CSV file
     * Detects name and email columns, validates data
     */
    public CSVParseResult parseAndValidateCsv(InputStream inputStream) throws IOException {
        CSVParseResult result = new CSVParseResult();
        Set<String> seenEmails = new HashSet<>();
        
        try (CSVReader reader = new CSVReader(new InputStreamReader(inputStream))) {
            // Read header
            String[] headers = reader.readNext();
            if (headers == null || headers.length == 0) {
                throw new IllegalArgumentException("CSV file is empty");
            }
            
            // Detect name and email columns
            detectColumns(headers, result);
            
            if (result.nameColumn == null || result.emailColumn == null) {
                throw new IllegalArgumentException(
                        "CSV must contain 'name' or 'full name' and 'email' columns"
                );
            }
            
            // Parse data rows
            String[] row;
            int rowNum = 1; // Start from 1 because 0 is header
            
            while ((row = reader.readNext()) != null) {
                rowNum++;
                if (row.length == 0 || (row.length == 1 && row[0].trim().isEmpty())) {
                    continue; // Skip empty rows
                }
                
                // Extract values
                String name = getColumnValue(row, headers, result.nameColumn);
                String email = getColumnValue(row, headers, result.emailColumn);
                
                // Validate
                if (email == null || email.trim().isEmpty()) {
                    result.invalidEmails.add("Row " + rowNum + ": Missing email");
                    continue;
                }
                
                email = email.trim();
                
                // Check valid email format
                if (!isValidEmail(email)) {
                    result.invalidEmails.add("Row " + rowNum + ": Invalid email '" + email + "'");
                    continue;
                }
                
                // Check for duplicates
                if (seenEmails.contains(email.toLowerCase())) {
                    result.duplicateEmails.add(email);
                    continue;
                }
                
                seenEmails.add(email.toLowerCase());
                
                // Add to records
                Map<String, String> record = new HashMap<>();
                record.put("name", name != null ? name.trim() : "");
                record.put("email", email);
                
                result.records.add(record);
                result.validRows++;
            }
            
            result.totalRows = rowNum - 1; // Exclude header
            
            log.info("CSV parsed successfully - Total: {}, Valid: {}, Invalid: {}, Duplicates: {}",
                    result.totalRows, result.validRows, result.invalidEmails.size(), result.duplicateEmails.size());
            
            return result;
            
        } catch (CsvValidationException e) {
            log.error("CSV validation error: {}", e.getMessage(), e);
            throw new IOException("Error parsing CSV file: " + e.getMessage(), e);
        }
    }
    
    /**
     * Detect name and email columns from headers
     */
    private void detectColumns(String[] headers, CSVParseResult result) {
        for (int i = 0; i < headers.length; i++) {
            String header = headers[i].toLowerCase().trim();
            
            // Try to find name column
            if (result.nameColumn == null && 
                    (header.equals("name") || header.equals("full_name") || 
                     header.equals("fullname") || header.equals("full name") ||
                     header.equals("recipient_name") || header.equals("recipient name"))) {
                result.nameColumn = headers[i];
            }
            
            // Try to find email column
            if (result.emailColumn == null && 
                    (header.equals("email") || header.equals("email_address") || 
                     header.equals("emailaddress") || header.equals("email_addr") ||
                     header.equals("recipient_email") || header.equals("recipient email"))) {
                result.emailColumn = headers[i];
            }
        }
    }
    
    /**
     * Get column value by header name (case-insensitive)
     */
    private String getColumnValue(String[] row, String[] headers, String columnName) {
        for (int i = 0; i < headers.length; i++) {
            if (headers[i].equalsIgnoreCase(columnName) && i < row.length) {
                return row[i];
            }
        }
        return null;
    }
    
    /**
     * Validate email format using Apache Commons Validator
     */
    private boolean isValidEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }
        
        try {
            EmailValidator validator = EmailValidator.getInstance();
            return validator.isValid(email);
        } catch (Exception e) {
            log.warn("Email validation error for '{}': {}", email, e.getMessage());
            // Fallback to regex
            return EMAIL_PATTERN.matcher(email).matches();
        }
    }
    
    /**
     * Parse CSV to list of maps (minimal validation)
     */
    public List<Map<String, String>> parseCsv(InputStream inputStream) throws IOException {
        List<Map<String, String>> records = new ArrayList<>();
        
        try (CSVReader reader = new CSVReader(new InputStreamReader(inputStream))) {
            String[] headers = reader.readNext();
            if (headers == null) {
                return records;
            }
            
            String[] row;
            while ((row = reader.readNext()) != null) {
                Map<String, String> record = new HashMap<>();
                for (int i = 0; i < headers.length && i < row.length; i++) {
                    record.put(headers[i], row[i]);
                }
                records.add(record);
            }
        } catch (CsvValidationException e) {
            log.error("CSV parsing error: {}", e.getMessage(), e);
            throw new IOException("Error parsing CSV", e);
        }
        
        return records;
    }
}
