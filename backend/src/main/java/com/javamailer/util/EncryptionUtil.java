package com.javamailer.util;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

/**
 * Encryption utility for securing sensitive data like API keys and passwords
 * Uses AES-256 encryption for credentials storage
 */
public class EncryptionUtil {
    
    private static final String ALGORITHM = "AES";
    private static final int KEY_SIZE = 256;
    
    // Using a fixed encryption key - should be configured as environment variable in production
    // For now, using the JWT secret as the basis for the encryption key
    private static final String ENCRYPTION_KEY = "your-super-secret-jwt-key-change-this-in-production-min-32-chars";
    
    /**
     * Encrypt sensitive data using AES-256
     * @param plainText The plain text to encrypt
     * @return Base64 encoded encrypted text
     */
    public static String encrypt(String plainText) {
        try {
            if (plainText == null || plainText.isEmpty()) {
                return plainText;
            }
            
            // Generate key from the encryption key
            SecretKey key = generateKey();
            
            // Create cipher
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, key);
            
            // Encrypt
            byte[] encryptedBytes = cipher.doFinal(plainText.getBytes());
            
            // Return Base64 encoded string
            return Base64.getEncoder().encodeToString(encryptedBytes);
            
        } catch (Exception e) {
            System.err.println("[ERROR] Encryption failed: " + e.getMessage());
            throw new RuntimeException("Encryption failed: " + e.getMessage(), e);
        }
    }
    
    /**
     * Decrypt sensitive data using AES-256
     * @param encryptedText The Base64 encoded encrypted text
     * @return Plain text
     */
    public static String decrypt(String encryptedText) {
        try {
            if (encryptedText == null || encryptedText.isEmpty()) {
                return encryptedText;
            }
            
            // Decode Base64
            byte[] decodedBytes = Base64.getDecoder().decode(encryptedText);
            
            // Generate key from the encryption key
            SecretKey key = generateKey();
            
            // Create cipher
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, key);
            
            // Decrypt
            byte[] decryptedBytes = cipher.doFinal(decodedBytes);
            
            return new String(decryptedBytes);
            
        } catch (Exception e) {
            System.err.println("[ERROR] Decryption failed: " + e.getMessage());
            throw new RuntimeException("Decryption failed: " + e.getMessage(), e);
        }
    }
    
    /**
     * Generate secret key from the encryption key string
     * Uses 256-bit AES key
     */
    private static SecretKey generateKey() throws Exception {
        // Get the first 32 bytes (256 bits) of the encryption key
        byte[] keyBytes = new byte[32];
        byte[] encKeyBytes = ENCRYPTION_KEY.getBytes();
        System.arraycopy(encKeyBytes, 0, keyBytes, 0, Math.min(encKeyBytes.length, 32));
        
        return new SecretKeySpec(keyBytes, 0, keyBytes.length, ALGORITHM);
    }
}
