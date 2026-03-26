package com.javamailer.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.ObjectCannedACL;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.core.sync.RequestBody;

import java.io.IOException;
import java.net.URI;
import java.util.UUID;

/**
 * Supabase Storage Service (DEPRECATED)
 * This service has been replaced by SupabaseStorageService which uses REST API
 * Keeping this class for reference only - not instantiated as a Spring bean
 */
@RequiredArgsConstructor
public class StorageService {
    
    @Value("${supabase.s3.endpoint}")
    private String s3Endpoint;
    
    @Value("${supabase.s3.region}")
    private String region;
    
    @Value("${supabase.s3.bucket.csv}")
    private String csvBucket;
    
    @Value("${supabase.s3.bucket.avatar}")
    private String avatarBucket;
    
    @Value("${supabase.s3.access-key}")
    private String accessKey;
    
    @Value("${supabase.s3.secret-key}")
    private String secretKey;
    
    /**
     * Upload CSV file to Supabase Storage
     * File is stored in csv_uploads bucket with unique name
     * Returns the file path/key in storage
     */
    public String uploadCsvFile(Long userId, MultipartFile file) throws IOException {
        String fileName = generateUniqueFileName(userId, "csv");
        
        S3Client s3Client = buildS3Client();
        try {
            uploadFileToS3(
                s3Client,
                csvBucket,
                fileName,
                file.getBytes(),
                file.getContentType()
            );
        } finally {
            s3Client.close();
        }
        
        return fileName;
    }
    
    /**
     * Delete CSV file from Supabase Storage
     * Only explicit deletion from upload section removes from storage bucket
     */
    public void deleteCsvFile(String fileKey) {
        S3Client s3Client = buildS3Client();
        try {
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(csvBucket)
                    .key(fileKey)
                    .build();
            
            s3Client.deleteObject(deleteRequest);
        } finally {
            s3Client.close();
        }
    }
    
    /**
     * Upload avatar image to Supabase Storage
     */
    public String uploadAvatarFile(Long userId, MultipartFile file) throws IOException {
        String fileName = generateUniqueFileName(userId, "avatar");
        
        S3Client s3Client = buildS3Client();
        try {
            uploadFileToS3(
                s3Client,
                avatarBucket,
                fileName,
                file.getBytes(),
                file.getContentType()
            );
        } finally {
            s3Client.close();
        }
        
        return fileName;
    }
    
    /**
     * Delete avatar from Supabase Storage
     */
    public void deleteAvatarFile(String fileKey) {
        S3Client s3Client = buildS3Client();
        try {
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(avatarBucket)
                    .key(fileKey)
                    .build();
            
            s3Client.deleteObject(deleteRequest);
        } finally {
            s3Client.close();
        }
    }
    
    /**
     * Get public URL for a file in storage
     */
    public String getPublicUrl(String bucket, String fileKey) {
        return String.format("%s/object/public/%s/%s", 
            s3Endpoint.replace("/storage/v1/s3", ""), 
            bucket, 
            fileKey
        );
    }
    
    /**
     * Internal helper: Upload file to S3
     */
    private void uploadFileToS3(S3Client s3Client, String bucket, String key, byte[] data, String contentType) {
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType != null ? contentType : "application/octet-stream")
                .acl(ObjectCannedACL.PUBLIC_READ)
                .build();
        
        s3Client.putObject(putObjectRequest, RequestBody.fromBytes(data));
    }
    
    /**
     * Generate unique file name: userId_timestamp_uuid.ext
     */
    private String generateUniqueFileName(Long userId, String type) {
        String ext = type.equalsIgnoreCase("csv") ? "csv" : "jpg";
        return String.format("%d/%s_%d_%s.%s", 
            userId,
            type,
            System.currentTimeMillis(),
            UUID.randomUUID().toString().substring(0, 8),
            ext
        );
    }
    
    /**
     * Build S3Client configured for Supabase Storage
     */
    private S3Client buildS3Client() {
        return S3Client.builder()
                .region(Region.of(region))
                .endpointOverride(URI.create(s3Endpoint))
                .credentialsProvider(
                    StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)
                    )
                )
                .build();
    }
}
