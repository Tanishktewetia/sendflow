package com.javamailer.service;

import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

/**
 * Supabase Storage REST API Service
 * 
 * CRITICAL RULES:
 * 1. Backend operations (upload/delete) MUST use FULL URL + Authorization Bearer token
 * 2. For PRIVATE buckets: Use SERVICE_ROLE key (has full access)
 * 3. For PUBLIC buckets: Use ANON key (has public access)
 * 4. Store ONLY file paths in database: "avatar_img/{userId}/photo.jpg" (NOT URLs)
 * 5. Generate public URLs ONLY for display (if bucket is public)
 * 6. DO NOT store URLs in database
 * 
 * URL Schema:
 * - Upload/Delete: https://gksgsxkusmorkbtkjemh.supabase.co/storage/v1/object/{bucket}/{filePath}
 * - Public Display: https://gksgsxkusmorkbtkjemh.supabase.co/storage/v1/object/public/{bucket}/{filePath}
 */
@Slf4j
@Service
public class SupabaseStorageService {
    
    // Supabase project base URL (without /storage/v1)
    @Value("${supabase.storage.url:https://gksgsxkusmorkbtkjemh.supabase.co/storage/v1}")
    private String storageApiUrl;
    
    // API key for backend operations
    // For PRIVATE buckets: Use SERVICE_ROLE key (unrestricted access)
    // For PUBLIC buckets: Use ANON key (public access)
    @Value("${supabase.api-key}")
    private String apiKey;
    
    private final OkHttpClient httpClient = new OkHttpClient();
    
    /**
     * Upload CSV file to csv_uploads bucket
     * Returns: File path only (NOT URL) - store this in database
     */
    public String uploadCsvFile(Long userId, MultipartFile file) throws IOException {
        String filePath = generateFilePath(userId, file.getOriginalFilename(), "csv");
        uploadToSupabase("csv_uploads", filePath, file.getBytes(), file.getContentType());
        log.info("CSV uploaded: {}", filePath);
        return filePath; // ✅ Return path, not URL
    }
    
    /**
     * Upload avatar to avatar_img bucket
     * Returns: File path only (NOT URL) - store this in database
     */
    public String uploadAvatarFile(Long userId, MultipartFile file) throws IOException {
        // Use fixed filename for avatar (will overwrite previous avatar)
        String filePath = generateAvatarFilePath(userId, file.getOriginalFilename());
        uploadToSupabase("avatar_img", filePath, file.getBytes(), file.getContentType());
        log.info("Avatar uploaded: {}", filePath);
        return filePath; // ✅ Return path, not URL
    }
    
    /**
     * Delete CSV file from storage
     */
    public void deleteCsvFile(String filePath) throws IOException {
        deleteFromSupabase("csv_uploads", filePath);
    }
    
    /**
     * Delete avatar file from storage
     */
    public void deleteAvatarFile(String filePath) throws IOException {
        deleteFromSupabase("avatar_img", filePath);
    }
    
    /**
     * Get public URL for displaying a file
     * Use this method to generate display URLs for frontend (works for PUBLIC buckets)
     * Example: https://gksgsxkusmorkbtkjemh.supabase.co/storage/v1/object/public/avatar_img/123/avatar_xxxxx.jpg
     */
    public String getPublicUrl(String bucket, String filePath) {
        return storageApiUrl + "/object/public/" + bucket + "/" + filePath;
    }
    
    /**
     * INTERNAL: Upload file via Supabase REST API
     * 
     * Endpoint: PUT https://gksgsxkusmorkbtkjemh.supabase.co/storage/v1/object/{bucket}/{filePath}
     * Auth: Authorization: Bearer API_KEY (SERVICE_ROLE for private, ANON for public)
     * Feature: Overwrites file if path exists, creates file if doesn't exist
     */
    private void uploadToSupabase(String bucket, String filePath, byte[] data, String contentType) throws IOException {
        // ✅ CORRECT: Full URL with /storage/v1 and /object prefix
        String fullUrl = storageApiUrl + "/object/" + bucket + "/" + filePath;
        
        String mediaType = contentType != null ? contentType : "application/octet-stream";
        RequestBody body = RequestBody.create(data, MediaType.parse(mediaType));
        
        Request request = new Request.Builder()
                .url(fullUrl)
                .put(body)
                .addHeader("Authorization", "Bearer " + apiKey) // ✅ Required
                .addHeader("Content-Type", mediaType)
                .build();
        
        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "Unknown";
                log.error("Upload failed ({}) to {} using key starting with: {}... Error: {}", 
                    response.code(), fullUrl, apiKey.substring(0, Math.min(20, apiKey.length())), errorBody);
                throw new IOException("Upload failed: " + response.code() + " - " + errorBody);
            }
            log.info("✅ File uploaded: {} ({} bytes)", filePath, data.length);
        } catch (Exception e) {
            log.error("Upload exception for {}: {}", filePath, e.getMessage(), e);
            throw new IOException("Upload error: " + e.getMessage(), e);
        }
    }
    
    /**
     * INTERNAL: Delete file via Supabase REST API
     * 
     * Endpoint: DELETE https://gksgsxkusmorkbtkjemh.supabase.co/storage/v1/object
     * Auth: Authorization: Bearer API_KEY (SERVICE_ROLE for private, ANON for public)
     * Body: {"prefixes": ["bucket/filePath"]}
     */
    private void deleteFromSupabase(String bucket, String filePath) throws IOException {
        // ✅ CORRECT: Direct path-based delete (not batch delete with prefixes)
        // Format: DELETE /storage/v1/object/csv_uploads/10/csv_17744374985...csv
        String fullUrl = storageApiUrl + "/object/" + bucket + "/" + filePath;
        
        log.info("Deleting from Supabase: {}", fullUrl);
        
        Request request = new Request.Builder()
                .url(fullUrl)
                .delete() // DELETE method with empty body
                .addHeader("Authorization", "Bearer " + apiKey) // ✅ Required
                .build();
        
        try (Response response = httpClient.newCall(request).execute()) {
            // Supabase returns 204 No Content on success or 200 OK
            if (response.code() != 204 && response.code() != 200 && !response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "Unknown";
                log.error("Delete failed ({}) at {}: {}", response.code(), fullUrl, errorBody);
                throw new IOException("Delete failed: " + response.code() + " - " + errorBody);
            }
            log.info("✅ File deleted: {}/{}", bucket, filePath);
        } catch (Exception e) {
            log.error("Delete exception for {}: {}", filePath, e.getMessage());
            throw new IOException("Delete error: " + e.getMessage(), e);
        }
    }
    
    /**
     * Generate file path with userId and timestamp
     * Format: {userId}/{type}_{timestamp}_{uuid}.{ext}
     * Example: 123/avatar_1711411234567_a1b2c3d4.jpg
     */
    private String generateFilePath(Long userId, String originalFileName, String type) {
        String ext = getFileExtension(originalFileName, type);
        return String.format("%d/%s_%d_%s.%s", 
            userId,
            type,
            System.currentTimeMillis(),
            UUID.randomUUID().toString().substring(0, 8),
            ext
        );
    }
    
    /**
     * Generate fixed avatar file path for a user (allows overwriting)
     * Format: {userId}/avatar.{ext}
     * This ensures the same file is overwritten on re-upload instead of creating duplicates
     */
    private String generateAvatarFilePath(Long userId, String originalFileName) {
        String ext = getFileExtension(originalFileName, "avatar");
        // Fixed path per user - will overwrite on re-upload
        return String.format("%d/avatar.%s", userId, ext);
    }
    
    /**
     * Extract file extension or use default
     */
    private String getFileExtension(String fileName, String type) {
        if (fileName != null && fileName.contains(".")) {
            String ext = fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
            if (ext.length() <= 5 && ext.matches("[a-zA-Z0-9]+")) {
                return ext;
            }
        }
        return type.equalsIgnoreCase("csv") ? "csv" : "jpg";
    }
}
